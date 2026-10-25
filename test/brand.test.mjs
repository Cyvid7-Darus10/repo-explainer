import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

// Guardrails from references/design-system.md. If one of these fails, the
// change is a design-system change: update that document in the same PR.

const css = readFileSync(new URL('../template/styles.css', import.meta.url), 'utf8');
const jsDir = new URL('../template/js/', import.meta.url);
// Comments may name banned things ("never innerHTML"); only code counts.
const stripComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const js = stripComments(readdirSync(jsDir).map((f) => readFileSync(new URL(f, jsDir), 'utf8')).join('\n'));

const ALLOWED_COLORS = new Set([
  '#58cc02', '#58a700', '#a5ed6e', '#d7ffb8', '#1cb0f6', '#1899d6', '#ddf4ff', '#042c60', '#000437',
  '#3c3c3c', '#777777', '#4b4b4b', '#e5e5e5', '#f7f7f7', '#ffffff', '#ffc800', '#fff5d3', '#ff86d0',
  '#ff4b4b', '#ffdfe0', '#a56d00', '#ffe8f6', '#b8338a', '#e3e9f3', '#e6e7f0', '#8a90c2', '#ffd66b',
  '#e8ecff', '#c33', '#fff', '#ffd84d', '#cfcfcf', '#777',
]);
const ALLOWED_RADII = new Set(['12px', 'var(--radius)', '8px', '6px', '999px', '0', '50%', 'var(--radius) var(--radius) 0 0', '0 var(--radius) var(--radius) 0']);

test('no box shadows anywhere — depth comes from borders', () => {
  assert.doesNotMatch(css, /box-shadow\s*:/);
  assert.doesNotMatch(js, /boxShadow|box-shadow|drop-shadow/);
});

test('no gradients', () => {
  assert.doesNotMatch(css, /gradient\(/);
  assert.doesNotMatch(js, /gradient/i);
});

test('every hex color is a design token value', () => {
  const used = new Set([...`${css}\n${js}`.matchAll(/#[0-9a-fA-F]{3,6}\b/g)].map((m) => m[0].toLowerCase()));
  const strays = [...used].filter((c) => !ALLOWED_COLORS.has(c));
  assert.deepEqual(strays, [], `colors outside the palette: ${strays.join(', ')}`);
});

test('border radii stay on the scale', () => {
  const radii = [...css.matchAll(/border-radius:\s*([^;]+);/g)].map((m) => m[1].trim());
  const strays = radii.filter((r) => !ALLOWED_RADII.has(r));
  assert.deepEqual(strays, [], `unexpected radii: ${strays.join(', ')}`);
});

test('reduced motion disables every animation and transition', () => {
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?animation: none !important;[\s\S]*?transition: none !important;/);
  assert.match(js, /function reducedMotion\(\)/);
});

test('rendering never uses innerHTML or eval', () => {
  assert.doesNotMatch(js, /innerHTML|outerHTML|insertAdjacentHTML|document\.write|\beval\(|new Function\(/);
});

test('fonts are the open-source substitutes, not proprietary brand fonts', () => {
  assert.doesNotMatch(css, /din-round|feather/i);
  assert.match(css, /Nunito/);
});

test('links from data go through the http(s) allowlist', () => {
  assert.doesNotMatch(js, /href: change\.url/);
  assert.match(js, /href: safeUrl\(/);
});
