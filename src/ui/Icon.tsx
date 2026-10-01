const PATHS = {
  plus: 'M12 4v16M4 12h16',
  minus: 'M4 12h16',
  check: 'M4 12.5l5 5L20 6.5',
  x: 'M5 5l14 14M19 5L5 19',
  search: 'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM15.5 15.5L20 20',
  left: 'M15 5l-7 7 7 7',
  right: 'M9 5l7 7-7 7',
  up: 'M5 15l7-7 7 7',
  down: 'M5 9l7 7 7-7',
  grip: 'M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  arrow: 'M4 12h16M14 6l6 6-6 6',
  swap: 'M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  skip: 'M6 5l9 7-9 7zM18 5v14',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  list: 'M4 6h16M4 12h16M4 18h16',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4',
  home: 'M4 11l8-7 8 7M6 9.5V20h12V9.5M10 20v-6h4v6',
  dumbbell: 'M6 12h12M6 7v10M3 9.5v5M18 7v10M21 9.5v5',
  chart: 'M4 20h16M7 16v-4M12 16V6M17 16V9',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 19a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9L7 7M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, stroke = 2, className }: { name: IconName; size?: number; stroke?: number; className?: string }) {
  const dots = name === 'grip' || name === 'more';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={dots ? 3.2 : stroke}
      strokeLinecap={dots ? 'round' : 'square'}
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
