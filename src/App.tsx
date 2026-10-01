import { lazy, Suspense, useCallback, useEffect, useRef } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useActiveSession, useSettings } from './db/hooks';
import { LibraryPage } from './features/library/LibraryPage';
import { OnboardingPage } from './features/onboarding/OnboardingPage';
import { ImportProgramPage } from './features/programs/ImportProgramPage';
import { ProgramPage } from './features/programs/ProgramPage';
import { ProgramsPage } from './features/programs/ProgramsPage';
import { LiveBar } from './features/session/LiveBar';
import { SessionPage } from './features/session/SessionPage';
import { SummaryPage } from './features/session/SummaryPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { TodayPage } from './features/today/TodayPage';
import { useDbOutdated, useStorageErrorToasts } from './db/storageErrors';
import { InstallGuideOnce } from './pwa/InstallGuide';
import { UpdatePrompt } from './pwa/UpdatePrompt';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { useFeedback } from './ui/feedback';
import { Icon, type IconName } from './ui/Icon';

// Pantallas de consulta (gráficas, historial largo): se cargan al entrar, no al abrir la app.
const HistoryPage = lazy(() => import('./features/history/HistoryPage').then((m) => ({ default: m.HistoryPage })));
const ProgressPage = lazy(() => import('./features/progress/ProgressPage').then((m) => ({ default: m.ProgressPage })));
const ExerciseProgressPage = lazy(() => import('./features/progress/ExerciseProgressPage').then((m) => ({ default: m.ExerciseProgressPage })));

/** Tres secciones: planear (Rutinas), entrenar (Hoy) y revisar (Progreso). Ajustes vive en el engrane de Hoy. */
const TABS: { to: string; label: string; icon: IconName; match: string[] }[] = [
  { to: '/', label: 'Hoy', icon: 'home', match: [] },
  { to: '/programas', label: 'Rutinas', icon: 'dumbbell', match: ['/programas', '/biblioteca', '/importar'] },
  { to: '/progreso', label: 'Progreso', icon: 'chart', match: ['/progreso', '/historial'] },
];
const SIDEBAR = [...TABS, { to: '/ajustes', label: 'Ajustes', icon: 'gear' as IconName, match: ['/ajustes'] }];

const isCurrent = (path: string, t: (typeof SIDEBAR)[number]) => (t.to === '/' ? path === '/' : t.match.some((m) => path.startsWith(m)));

function useTheme() {
  const { theme } = useSettings();
  useEffect(() => {
    const el = document.documentElement;
    if (theme === 'sistema') delete el.dataset.theme;
    else el.dataset.theme = theme;
  }, [theme]);
}

export function App() {
  useTheme();
  const settings = useSettings();
  const active = useActiveSession();
  const location = useLocation();
  const navigate = useNavigate();
  const inSession = location.pathname.startsWith('/sesion') && !location.pathname.startsWith('/sesion/resumen');
  const onboarding = location.pathname.startsWith('/bienvenida');

  // Al abrir la app con una sesión en curso, vuelve a ella (una sola vez por carga).
  const resumed = useRef(false);
  useEffect(() => {
    if (resumed.current || active === null) return;
    resumed.current = true;
    if (active && location.pathname === '/') navigate('/sesion', { replace: true });
  }, [active, location.pathname, navigate]);

  // Scroll arriba al cambiar de pantalla.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const showNav = !inSession && !onboarding;
  const section = location.pathname.split('/')[1] || 'hoy';

  const { toast } = useFeedback();
  const onStorageError = useCallback((title: string, body: string) => toast({ message: `${title}. ${body}`, durationMs: 10000 }), [toast]);
  useStorageErrorToasts(onStorageError);
  const outdated = useDbOutdated();

  return (
    <div className={`shell${showNav ? '' : ' shell--full'}`}>
      <a href="#contenido" className="skip-link">
        Saltar al contenido
      </a>
      {showNav && (
        <aside className="sidebar" aria-label="Navegación principal">
          <Link to="/" className="brand">
            <span className="brand__mark" aria-hidden="true" />
            SERIE
          </Link>
          <nav>
            {SIDEBAR.map((n) => (
              <Link key={n.to} to={n.to} aria-current={isCurrent(location.pathname, n) ? 'page' : undefined}>
                <Icon name={n.icon} size={22} />
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="sidebar__foot">
            <span className="small muted">Modo {settings.mode === 'basico' ? 'básico' : 'avanzado'}</span>
            <span className="small muted">Datos guardados solo en este navegador.</span>
          </div>
        </aside>
      )}
      <main id="contenido" className={`main${inSession ? ' main--session' : ''}${showNav && active ? ' main--live' : ''}`} tabIndex={-1}>
        {showNav && (
          <header className="topbar">
            <Link to="/" className="brand">
              <span className="brand__mark" aria-hidden="true" />
              SERIE
            </Link>
            {location.pathname === '/' && (
              <Link to="/ajustes" className="btn btn--ghost btn--icon topbar__gear" aria-label="Ajustes">
                <Icon name="gear" size={24} />
              </Link>
            )}
          </header>
        )}
        {/* Cambiar de sección vuelve a montar la pantalla y dispara su entrada. */}
        {outdated && (
          <div className="ro-banner" role="alert">
            <span>
              <strong>SERIE se actualizó en otra pestaña.</strong> Recarga esta para seguir; no se perdió nada.
            </span>
            <button className="btn btn--sm btn--primary" onClick={() => window.location.reload()}>
              Recargar
            </button>
          </div>
        )}
        <div className="route" key={section}>
        <ErrorBoundary resetKey={location.pathname}>
        <Suspense fallback={null}>
        <Routes>
          <Route
            path="/"
            element={
              // El estado evita rebotar a la bienvenida mientras el ajuste recién guardado se propaga.
              settings.onboardingDone || (location.state as { onboarded?: boolean } | null)?.onboarded ? <TodayPage /> : <Navigate to="/bienvenida" replace />
            }
          />
          <Route path="/bienvenida" element={<OnboardingPage />} />
          <Route path="/programas" element={<ProgramsPage />} />
          <Route path="/programas/:id" element={<ProgramPage />} />
          <Route path="/sesion" element={<SessionPage />} />
          <Route path="/sesion/resumen/:id" element={<SummaryPage />} />
          <Route path="/historial" element={<HistoryPage />} />
          <Route path="/historial/:id" element={<HistoryPage />} />
          <Route path="/progreso" element={<ProgressPage />} />
          <Route path="/progreso/:exerciseId" element={<ExerciseProgressPage />} />
          <Route path="/biblioteca" element={<LibraryPage />} />
          <Route path="/ajustes" element={<SettingsPage />} />
          <Route path="/mas" element={<Navigate to="/ajustes" replace />} />
          <Route path="/importar" element={<ImportProgramPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
        </ErrorBoundary>
        </div>
      </main>
      <UpdatePrompt />
      <InstallGuideOnce />
      {showNav && active && <LiveBar session={active} />}
      {showNav && (
        <nav className="tabbar" aria-label="Navegación principal">
          {TABS.map((t) => (
            <Link key={t.to} to={t.to} aria-current={isCurrent(location.pathname, t) ? 'page' : undefined}>
              <Icon name={t.icon} size={24} />
              {t.label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
