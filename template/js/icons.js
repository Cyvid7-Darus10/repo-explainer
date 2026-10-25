// Flat, gradient-free illustrations for each component kind (viewBox 32x32).
const PALETTE = {
  green: { ink: '#58cc02', wash: '#d7ffb8', text: '#58a700' },
  blue: { ink: '#1cb0f6', wash: '#ddf4ff', text: '#1899d6' },
  navy: { ink: '#042c60', wash: '#e3e9f3', text: '#042c60' },
  midnight: { ink: '#000437', wash: '#e6e7f0', text: '#000437' },
  yellow: { ink: '#ffc800', wash: '#fff5d3', text: '#a56d00' },
  pink: { ink: '#ff86d0', wash: '#ffe8f6', text: '#b8338a' },
};

function paletteFor(name) {
  return PALETTE[name] || PALETTE.green;
}

const ICON_SHAPES = {
  user: () => [
    s('circle', { cx: 16, cy: 11, r: 6, fill: '#ffc800' }),
    s('path', { d: 'M5 29c0-6.5 4.9-11 11-11s11 4.5 11 11z', fill: '#1cb0f6' }),
  ],
  ui: () => [
    s('rect', { x: 3, y: 5, width: 26, height: 22, rx: 4, fill: '#1cb0f6' }),
    s('rect', { x: 6, y: 11, width: 20, height: 13, rx: 2, fill: '#fff' }),
    s('circle', { cx: 7.5, cy: 8, r: 1.3, fill: '#fff' }),
    s('circle', { cx: 11.5, cy: 8, r: 1.3, fill: '#fff' }),
    s('rect', { x: 9, y: 14, width: 9, height: 3, rx: 1.5, fill: '#58cc02' }),
    s('rect', { x: 9, y: 19, width: 14, height: 2, rx: 1, fill: '#e5e5e5' }),
  ],
  mobile: () => [
    s('rect', { x: 8, y: 2, width: 16, height: 28, rx: 4, fill: '#042c60' }),
    s('rect', { x: 10.5, y: 6, width: 11, height: 18, rx: 2, fill: '#fff' }),
    s('rect', { x: 12.5, y: 9, width: 7, height: 3, rx: 1.5, fill: '#58cc02' }),
    s('circle', { cx: 16, cy: 27, r: 1.3, fill: '#fff' }),
  ],
  api: () => [
    s('rect', { x: 4, y: 9, width: 24, height: 14, rx: 7, fill: '#58cc02' }),
    s('rect', { x: 9, y: 4, width: 3, height: 6, rx: 1.5, fill: '#58a700' }),
    s('rect', { x: 20, y: 4, width: 3, height: 6, rx: 1.5, fill: '#58a700' }),
    s('path', { d: 'M11 16h10M18 13l3 3-3 3', stroke: '#fff', 'stroke-width': 2.5, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
    s('rect', { x: 14.5, y: 23, width: 3, height: 6, rx: 1.5, fill: '#58a700' }),
  ],
  service: () => [
    s('path', { d: 'M16 2l12 7v14l-12 7-12-7V9z', fill: '#042c60' }),
    s('circle', { cx: 16, cy: 16, r: 5.5, fill: '#fff' }),
    s('circle', { cx: 16, cy: 16, r: 2.5, fill: '#58cc02' }),
  ],
  db: () => [
    s('path', { d: 'M5 8v16c0 2.8 4.9 5 11 5s11-2.2 11-5V8z', fill: '#1cb0f6' }),
    s('ellipse', { cx: 16, cy: 8, rx: 11, ry: 5, fill: '#ddf4ff', stroke: '#1cb0f6', 'stroke-width': 2 }),
    s('path', { d: 'M5 16c0 2.8 4.9 5 11 5s11-2.2 11-5', stroke: '#fff', 'stroke-width': 2, fill: 'none' }),
  ],
  queue: () => [
    s('rect', { x: 3, y: 9, width: 7, height: 14, rx: 3, fill: '#ff86d0' }),
    s('rect', { x: 12.5, y: 9, width: 7, height: 14, rx: 3, fill: '#ff86d0', opacity: 0.75 }),
    s('rect', { x: 22, y: 9, width: 7, height: 14, rx: 3, fill: '#ff86d0', opacity: 0.45 }),
  ],
  cache: () => [
    s('circle', { cx: 16, cy: 16, r: 13, fill: '#fff5d3' }),
    s('path', { d: 'M18 4L8 18h7l-2 10 11-15h-7z', fill: '#ffc800', stroke: '#a56d00', 'stroke-width': 1.2, 'stroke-linejoin': 'round' }),
  ],
  external: () => [
    s('path', { d: 'M9 25a6 6 0 01-.8-11.9A8 8 0 0123.6 11 6.5 6.5 0 0124 25z', fill: '#1cb0f6' }),
    s('path', { d: 'M12 19h8', stroke: '#fff', 'stroke-width': 2.5, 'stroke-linecap': 'round' }),
  ],
  job: () => [
    s('circle', { cx: 16, cy: 16, r: 13, fill: '#58cc02' }),
    s('circle', { cx: 16, cy: 16, r: 9.5, fill: '#fff' }),
    s('path', { d: 'M16 10v6.5l4 2.5', stroke: '#042c60', 'stroke-width': 2.5, fill: 'none', 'stroke-linecap': 'round' }),
  ],
  cli: () => [
    s('rect', { x: 3, y: 5, width: 26, height: 22, rx: 4, fill: '#000437' }),
    s('path', { d: 'M8 12l4 4-4 4', stroke: '#a5ed6e', 'stroke-width': 2.5, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
    s('path', { d: 'M15 21h8', stroke: '#fff', 'stroke-width': 2.5, 'stroke-linecap': 'round' }),
  ],
  auth: () => [
    s('path', { d: 'M10 14v-3a6 6 0 0112 0v3', stroke: '#042c60', 'stroke-width': 3, fill: 'none' }),
    s('rect', { x: 6, y: 13, width: 20, height: 16, rx: 4, fill: '#ffc800' }),
    s('circle', { cx: 16, cy: 20, r: 2.5, fill: '#042c60' }),
    s('rect', { x: 15, y: 21, width: 2, height: 4, rx: 1, fill: '#042c60' }),
  ],
  storage: () => [
    s('path', { d: 'M3 9a3 3 0 013-3h7l3 3h10a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3z', fill: '#ffc800' }),
    s('rect', { x: 3, y: 12, width: 26, height: 15, rx: 3, fill: '#ffd84d' }),
  ],
  library: () => [
    s('rect', { x: 4, y: 5, width: 7, height: 23, rx: 2, fill: '#58cc02' }),
    s('rect', { x: 12.5, y: 8, width: 7, height: 20, rx: 2, fill: '#1cb0f6' }),
    s('rect', { x: 21, y: 4, width: 7, height: 24, rx: 2, fill: '#ff86d0', transform: 'rotate(8 24.5 16)' }),
  ],
  folder: () => [
    s('path', { d: 'M3 9a3 3 0 013-3h7l3 3h10a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3z', fill: '#1cb0f6' }),
  ],
  file: () => [
    s('path', { d: 'M8 3h11l6 6v19a1 1 0 01-1 1H8a1 1 0 01-1-1V4a1 1 0 011-1z', fill: '#e5e5e5' }),
    s('path', { d: 'M19 3v6h6', fill: '#cfcfcf' }),
  ],
  robot: () => [
    s('rect', { x: 6, y: 9, width: 20, height: 17, rx: 5, fill: '#1cb0f6' }),
    s('circle', { cx: 12, cy: 17, r: 2.5, fill: '#fff' }),
    s('circle', { cx: 20, cy: 17, r: 2.5, fill: '#fff' }),
    s('rect', { x: 15, y: 3, width: 2, height: 6, fill: '#042c60' }),
    s('circle', { cx: 16, cy: 3, r: 2, fill: '#ffc800' }),
  ],
  trophy: () => [
    s('path', { d: 'M9 4h14v7a7 7 0 01-14 0z', fill: '#ffc800' }),
    s('path', { d: 'M9 6H5a4 4 0 004 6M23 6h4a4 4 0 01-4 6', stroke: '#ffc800', 'stroke-width': 2.5, fill: 'none' }),
    s('rect', { x: 14, y: 17, width: 4, height: 6, fill: '#a56d00' }),
    s('rect', { x: 9, y: 23, width: 14, height: 5, rx: 2, fill: '#58cc02' }),
  ],
};

const KIND_ALIASES = { frontend: 'ui', web: 'ui', page: 'ui', server: 'service', worker: 'job', cron: 'job', database: 'db', bucket: 'storage', thirdparty: 'external', package: 'library' };

function icon(kind, attrs = {}) {
  const key = ICON_SHAPES[kind] ? kind : KIND_ALIASES[kind] || 'service';
  return s('svg', { viewBox: '0 0 32 32', 'aria-hidden': 'true', focusable: 'false', ...attrs }, ICON_SHAPES[key]());
}

function brandMark() {
  return s('svg', { viewBox: '0 0 32 32', 'aria-hidden': 'true' },
    s('rect', { x: 2, y: 2, width: 28, height: 28, rx: 9, fill: '#58cc02' }),
    s('path', { d: 'M9 21l5-10 4 7 2-3 3 6', stroke: '#fff', 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
    s('circle', { cx: 23, cy: 11, r: 2.5, fill: '#ffc800' }));
}
