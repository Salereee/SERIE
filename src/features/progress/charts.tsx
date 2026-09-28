import { useId, useMemo, useRef, useState } from 'react';
import type { Session } from '../../db/schema';
import { fmtDateFull, fmtDateShort, startOfDay, startOfWeek } from '../../domain/format';
import './charts.css';

/* ——— Heatmap semanal: columnas = semanas, filas = L…D ——— */

export function WeekHeatmap({ sessions, weeks = 12 }: { sessions: Pick<Session, 'startedAt' | 'summary'>[]; weeks?: number }) {
  const [hover, setHover] = useState<{ t: number; n: number; sets: number } | null>(null);
  const cells = useMemo(() => {
    const byDay = new Map<number, { n: number; sets: number }>();
    for (const s of sessions) {
      const d = startOfDay(s.startedAt);
      const cur = byDay.get(d) ?? { n: 0, sets: 0 };
      byDay.set(d, { n: cur.n + 1, sets: cur.sets + (s.summary?.setsDone ?? 0) });
    }
    const first = startOfWeek(Date.now()) - (weeks - 1) * 7 * 86400000;
    const out: { t: number; n: number; sets: number; future: boolean }[] = [];
    const today = startOfDay(Date.now());
    for (let w = 0; w < weeks; w++) {
      for (let d = 0; d < 7; d++) {
        const date = new Date(first);
        date.setDate(date.getDate() + w * 7 + d);
        const t = date.getTime();
        const v = byDay.get(t) ?? { n: 0, sets: 0 };
        out.push({ t, ...v, future: t > today });
      }
    }
    return out;
  }, [sessions, weeks]);

  const level = (sets: number, n: number) => (n === 0 ? 0 : sets >= 24 ? 3 : sets >= 14 ? 2 : 1);
  const trained = cells.filter((c) => c.n > 0).length;

  return (
    <figure className="heat" aria-label={`Calendario de las últimas ${weeks} semanas: ${trained} días entrenados`}>
      <div className="heat__grid" style={{ gridTemplateColumns: `20px repeat(${weeks}, 1fr)` }} onMouseLeave={() => setHover(null)}>
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((l, i) => (
          <span key={i} className="heat__label" style={{ gridColumn: 1, gridRow: i + 1 }} aria-hidden="true">
            {i % 2 === 0 ? l : ''}
          </span>
        ))}
        {cells.map((c, i) => (
          <span
            key={c.t}
            className="heat__cell"
            data-level={c.future ? undefined : level(c.sets, c.n)}
            data-future={c.future || undefined}
            style={{ gridColumn: Math.floor(i / 7) + 2, gridRow: (i % 7) + 1, '--col': Math.floor(i / 7) } as React.CSSProperties}
            onMouseEnter={() => setHover(c)}
            title={`${fmtDateFull(c.t)}: ${c.n ? `${c.sets} series` : 'sin sesión'}`}
          />
        ))}
      </div>
      <figcaption className="heat__caption">
        <span className="eyebrow">{hover ? `${fmtDateFull(hover.t)} · ${hover.n ? `${hover.sets} series` : 'sin sesión'}` : `${trained} días en ${weeks} semanas`}</span>
        <span className="heat__legend" aria-hidden="true">
          <span className="eyebrow">menos</span>
          {[0, 1, 2, 3].map((l) => (
            <span key={l} className="heat__cell" data-level={l} />
          ))}
          <span className="eyebrow">más</span>
        </span>
      </figcaption>
    </figure>
  );
}

/* ——— Línea de progreso con crosshair y tooltip ——— */

export interface Point {
  t: number;
  v: number;
  label?: string;
  highlight?: boolean;
}

export function LineChart({ points, format, title }: { points: Point[]; format: (v: number) => string; title: string }) {
  const W = 720;
  const H = 280;
  const pad = { l: 48, r: 16, t: 16, b: 28 };
  const [hi, setHi] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const descId = useId();

  const geo = useMemo(() => {
    if (points.length === 0) return null;
    const t0 = points[0].t;
    const t1 = points[points.length - 1].t;
    const vs = points.map((p) => p.v);
    let lo = Math.min(...vs);
    let hiV = Math.max(...vs);
    const span = hiV - lo || Math.max(1, hiV * 0.1);
    lo = Math.max(0, lo - span * 0.15);
    hiV = hiV + span * 0.15;
    const x = (t: number) => (t1 === t0 ? (pad.l + W - pad.r) / 2 : pad.l + ((t - t0) / (t1 - t0)) * (W - pad.l - pad.r));
    const y = (v: number) => pad.t + (1 - (v - lo) / (hiV - lo)) * (H - pad.t - pad.b);
    const ticks = niceTicks(lo, hiV, 4);
    const xTicks = points.length <= 1 ? [t0] : [t0, t0 + (t1 - t0) / 2, t1];
    return { x, y, ticks, xTicks };
  }, [points]);

  if (!geo) return null;
  const { x, y, ticks, xTicks } = geo;
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join('');
  const first = points[0];
  const lastP = points[points.length - 1];
  const best = points.reduce((a, p) => (p.v > a.v ? p : a), points[0]);

  const onMove = (e: React.PointerEvent) => {
    const r = svgRef.current!.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    let bi = 0;
    let bd = Infinity;
    points.forEach((p, i) => {
      const dd = Math.abs(x(p.t) - px);
      if (dd < bd) {
        bd = dd;
        bi = i;
      }
    });
    setHi(bi);
  };

  const h = hi != null ? points[hi] : null;

  return (
    <figure className="line">
      <div className="line__wrap">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="line__svg"
          role="img"
          aria-label={title}
          aria-describedby={descId}
          onPointerMove={onMove}
          onPointerLeave={() => setHi(null)}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') setHi((i) => Math.min(points.length - 1, (i ?? -1) + 1));
            if (e.key === 'ArrowLeft') setHi((i) => Math.max(0, (i ?? points.length) - 1));
            if (e.key === 'Escape') setHi(null);
          }}
          onBlur={() => setHi(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="line__grid" />
              <text x={pad.l - 8} y={y(t)} className="line__tick" textAnchor="end" dominantBaseline="middle">
                {format(t)}
              </text>
            </g>
          ))}
          <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} className="line__axis" />
          {xTicks.map((t, i) => (
            <text key={i} x={x(t)} y={H - 8} className="line__tick" textAnchor={i === 0 ? 'start' : i === xTicks.length - 1 ? 'end' : 'middle'}>
              {fmtDateShort(t)}
            </text>
          ))}
          <path d={d} className="line__path" pathLength={1} key={d} />
          {points.map((p, i) => (
            <circle key={i} cx={x(p.t)} cy={y(p.v)} r={p.highlight ? 5 : 3.5} className={p.highlight ? 'line__pt line__pt--pr' : 'line__pt'} />
          ))}
          {/* Etiquetas directas selectivas: solo el mejor valor. */}
          <text x={x(best.t)} y={y(best.v) - 12} className="line__label" textAnchor={x(best.t) > W - 80 ? 'end' : x(best.t) < 80 ? 'start' : 'middle'}>
            {format(best.v)}
          </text>
          {h && (
            <g pointerEvents="none">
              <line x1={x(h.t)} x2={x(h.t)} y1={pad.t} y2={H - pad.b} className="line__cross" />
              <circle cx={x(h.t)} cy={y(h.v)} r={7} className="line__focus" />
            </g>
          )}
        </svg>
        {h && (
          <div className="line__tip" style={{ left: `${(x(h.t) / W) * 100}%`, top: `${(y(h.v) / H) * 100}%` }} role="status">
            <span className="eyebrow">{fmtDateFull(h.t)}</span>
            <span className="mono">{format(h.v)}</span>
            {h.label && <span className="small">{h.label}</span>}
          </div>
        )}
      </div>
      <figcaption id={descId} className="sr-only">
        {title}: de {format(first.v)} el {fmtDateFull(first.t)} a {format(lastP.v)} el {fmtDateFull(lastP.t)}; máximo {format(best.v)}. Usa las flechas para recorrer los puntos.
      </figcaption>
    </figure>
  );
}

function niceTicks(lo: number, hi: number, n: number): number[] {
  const raw = (hi - lo) / n;
  const mag = Math.pow(10, Math.floor(Math.log10(raw || 1)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) out.push(Math.round(v * 100) / 100);
  return out;
}

/* ——— Barras horizontales con valor ——— */

export interface Bar {
  key: string;
  label: string;
  value: number;
  sub?: string;
}

export function BarList({ bars, format, max }: { bars: Bar[]; format: (v: number) => string; max?: number }) {
  const m = max ?? Math.max(1, ...bars.map((b) => b.value));
  return (
    <ul className="bars">
      {bars.map((b) => (
        <li key={b.key} className="bars__row" title={`${b.label}: ${format(b.value)}${b.sub ? ` · ${b.sub}` : ''}`}>
          <span className="bars__label">{b.label}</span>
          <span className="bars__track" aria-hidden="true">
            <span className="bars__fill" style={{ width: `${(b.value / m) * 100}%` }} />
          </span>
          <span className="bars__val mono">
            {format(b.value)}
            {b.sub && <span className="muted"> · {b.sub}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Mini serie de columnas (8 semanas) para una fila de la tabla de volumen. */
export function Spark({ values, max }: { values: number[]; max: number }) {
  return (
    <span className="spark" aria-hidden="true">
      {values.map((v, i) => (
        <span key={i} style={{ height: `${max ? Math.max(v > 0 ? 8 : 0, (v / max) * 100) : 0}%` }} data-last={i === values.length - 1 || undefined} />
      ))}
    </span>
  );
}
