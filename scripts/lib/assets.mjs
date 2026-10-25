import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import { TEMPLATE_DIR, escapeHtml } from './build.mjs';
import { NODE_KINDS } from './schema.mjs';

// Runs template/js/icons.js with a string-based `s()` so the exported SVG
// files are byte-for-byte the shapes the explainer draws. One source of truth.

const EXTRA_ICONS = ['robot', 'trophy', 'folder', 'file'];

function svgString(tag, attrs, ...children) {
  const attrText = Object.entries(attrs || {})
    .filter(([, v]) => v !== null && v !== undefined && v !== false)
    .map(([k, v]) => ` ${k}="${escapeHtml(v)}"`)
    .join('');
  const inner = children.flat(Infinity).filter((c) => c !== null && c !== undefined && c !== false).join('');
  return inner ? `<${tag}${attrText}>${inner}</${tag}>` : `<${tag}${attrText}/>`;
}

function loadIconModule() {
  const source = readFileSync(join(TEMPLATE_DIR, 'js', 'icons.js'), 'utf8');
  const context = vm.createContext({ s: svgString });
  vm.runInContext(`${source}\n;globalThis.__api = { icon, brandMark, PALETTE };`, context);
  return context.__api;
}

function standalone(svg, size) {
  return svg.replace('<svg ', `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" `);
}

/**
 * @returns {{ name: string, svg: string }[]} every node-kind icon plus UI extras, as standalone SVG
 */
export function exportIcons(size = 64) {
  const { icon } = loadIconModule();
  return [...NODE_KINDS, ...EXTRA_ICONS].map((name) => ({ name, svg: `${standalone(icon(name), size)}\n` }));
}

/** @returns {{ name: string, svg: string }[]} logo mark, horizontal lockup, and social card */
export function exportLogos() {
  const { brandMark } = loadIconModule();
  const mark = brandMark();
  const inner = mark.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  const font = "font-family=\"Nunito, 'Arial Rounded MT Bold', ui-rounded, system-ui, sans-serif\"";
  const lockup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 64" width="300" height="64">
<g transform="translate(0 4) scale(1.75)">${inner}</g>
<text x="68" y="42" ${font} font-size="30" font-weight="900" fill="#58cc02" letter-spacing="-0.3">Repo Explainer</text>
</svg>
`;
  const social = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 640" width="1280" height="640">
<rect width="1280" height="640" fill="#ffffff"/>
<circle cx="1050" cy="320" r="260" fill="#d7ffb8"/>
<circle cx="1180" cy="120" r="44" fill="#ffc800"/>
<g transform="translate(96 150) scale(3)">${inner}</g>
<text x="96" y="370" ${font} font-size="88" font-weight="900" fill="#58cc02" letter-spacing="-2">Repo Explainer</text>
<text x="96" y="440" ${font} font-size="34" font-weight="700" fill="#4b4b4b">Understand any repo end to end, even when 20 PRs land a day.</text>
</svg>
`;
  return [
    { name: 'mark', svg: standalone(mark, 128) + '\n' },
    { name: 'lockup', svg: lockup },
    { name: 'social-card', svg: social },
  ];
}

/** @returns {Record<string, { ink: string, wash: string, text: string }>} layer palette used by the template */
export function exportPalette() {
  return JSON.parse(JSON.stringify(loadIconModule().PALETTE));
}
