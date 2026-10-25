import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const TEMPLATE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'template');

// Order matters only for readability; all modules share one function scope.
const SCRIPT_ORDER = ['dom.js', 'icons.js', 'map.js', 'models.js', 'flow.js', 'changes.js', 'lessons.js', 'sections.js', 'app.js'];

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}

/**
 * Serialise data so it can never close the surrounding <script> tag.
 * @param {unknown} data
 * @returns {string}
 */
export function serializeForScript(data) {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .split(String.fromCharCode(0x2028)).join('\\u2028')
    .split(String.fromCharCode(0x2029)).join('\\u2029');
}

function readTemplate(templateDir, order = SCRIPT_ORDER) {
  const read = (file) => readFileSync(join(templateDir, file), 'utf8');
  const scripts = order.map((file) => `// ---- ${file} ----\n${read(join('js', file))}`).join('\n');
  return { html: read('explainer.html'), styles: read('styles.css'), scripts };
}

// One pass over the template, so text inserted for one placeholder (say, a
// title containing "__EXPLAINER_DATA__") is never scanned for another.
const PLACEHOLDER_PATTERN = /__TITLE__|__DESCRIPTION__|\/\*__STYLES__\*\/|\/\*__SCRIPTS__\*\/|__EXPLAINER_DATA__/g;

function assemble({ html, styles, scripts }, title, data, bootCall = '', description = '') {
  const values = {
    __TITLE__: escapeHtml(title),
    __DESCRIPTION__: escapeHtml(description),
    '/*__STYLES__*/': styles,
    '/*__SCRIPTS__*/': `(() => {\n'use strict';\n${scripts}\n${bootCall}\n})();`,
    __EXPLAINER_DATA__: serializeForScript(data),
  };
  return html.replace(PLACEHOLDER_PATTERN, (match) => values[match]);
}

/**
 * Render explainer data into one self-contained HTML file.
 * @param {object} data validated explainer data
 * @param {{ templateDir?: string }} [options]
 * @returns {string}
 */
export function buildExplainer(data, options = {}) {
  const parts = readTemplate(options.templateDir || TEMPLATE_DIR);
  const title = data && data.meta && data.meta.title ? `${data.meta.title} · Repo Explainer` : 'Repo Explainer';
  const description = data && data.meta && typeof data.meta.summary === 'string' ? data.meta.summary : '';
  return assemble(parts, title, data, 'boot();', description);
}

/**
 * Render the design-kit gallery (icons, palette, components, patterns).
 * @param {{ kinds: string[], patterns: object[], version?: string }} kit
 * @returns {string}
 */
export function buildGallery(kit, options = {}) {
  const order = SCRIPT_ORDER.filter((f) => f !== 'app.js').concat('gallery.js');
  const parts = readTemplate(options.templateDir || TEMPLATE_DIR, order);
  return assemble(parts, 'Repo Explainer kit', kit, 'bootGallery();', 'Icons, colors, components and flow patterns for Repo Explainer.');
}
