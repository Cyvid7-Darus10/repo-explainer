import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  AUTHOR_TYPES, CHANGE_KINDS, CHAPTER_KEYS, DASH, EDGE_KINDS, LAYER_COLORS, LIMITS, MARKUP, NODE_KINDS, NON_PROSE_KEYS, PLACEHOLDER, STEP_KINDS,
} from './schema.mjs';

/**
 * @typedef {{ errors: string[], warnings: string[] }} ValidationResult
 */

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isText = (value) => typeof value === 'string' && value.trim().length > 0;
const arr = (value) => (Array.isArray(value) ? value : []);

function collector() {
  const errors = [];
  const warnings = [];
  return {
    error: (path, message) => errors.push(`${path}: ${message}`),
    warn: (path, message) => warnings.push(`${path}: ${message}`),
    result: () => ({ errors, warnings }),
  };
}

function requireText(report, path, value) {
  if (!isText(value)) report.error(path, 'must be a non-empty string');
}

function checkEnum(report, path, value, allowed) {
  if (value !== undefined && !allowed.includes(value)) {
    report.warn(path, `"${value}" is not one of ${allowed.join(", ")}. It will render with a default style`);
  }
}

function checkUniqueIds(report, path, items) {
  const seen = new Set();
  items.forEach((item, i) => {
    requireText(report, `${path}[${i}].id`, item && item.id);
    if (item && seen.has(item.id)) report.error(`${path}[${i}].id`, `duplicate id "${item.id}"`);
    if (item) seen.add(item.id);
  });
  return seen;
}

function checkMeta(report, meta) {
  if (!isObject(meta)) return report.error('meta', 'is required');
  requireText(report, 'meta.title', meta.title);
  requireText(report, 'meta.summary', meta.summary);
  arr(meta.chapters).forEach((key, i) => {
    if (!CHAPTER_KEYS.includes(key)) report.error(`meta.chapters[${i}]`, `unknown chapter "${key}" (use ${CHAPTER_KEYS.join(', ')})`);
  });
  return undefined;
}

function checkGraph(report, data) {
  const layers = arr(data.layers);
  const nodes = arr(data.nodes);
  if (!layers.length) report.error('layers', 'needs at least one layer');
  if (!nodes.length) report.error('nodes', 'needs at least one node');
  const layerIds = checkUniqueIds(report, 'layers', layers);
  layers.forEach((layer, i) => {
    requireText(report, `layers[${i}].label`, layer.label);
    checkEnum(report, `layers[${i}].color`, layer.color, LAYER_COLORS);
  });
  const nodeIds = checkUniqueIds(report, 'nodes', nodes);
  nodes.forEach((node, i) => {
    requireText(report, `nodes[${i}].label`, node.label);
    if (!layerIds.has(node.layer)) report.error(`nodes[${i}].layer`, `"${node.layer}" is not a layer id`);
    checkEnum(report, `nodes[${i}].kind`, node.kind, NODE_KINDS);
    if (!arr(node.files).length && node.kind !== 'user') report.warn(`nodes[${i}].files`, `"${node.id}" cites no files, so readers cannot find it in the code`);
  });
  layers.forEach((layer, i) => {
    if (!nodes.some((node) => node.layer === layer.id)) report.warn(`layers[${i}]`, `layer "${layer.id}" has no nodes`);
  });
  arr(data.edges).forEach((edge, i) => {
    if (!nodeIds.has(edge.from)) report.error(`edges[${i}].from`, `"${edge.from}" is not a node id`);
    if (!nodeIds.has(edge.to)) report.error(`edges[${i}].to`, `"${edge.to}" is not a node id`);
    checkEnum(report, `edges[${i}].kind`, edge.kind, EDGE_KINDS);
  });
  return nodeIds;
}

function checkFlows(report, flows, nodeIds) {
  if (!flows.length) report.warn('flows', 'no end-to-end flow traced. This is the most useful chapter');
  checkUniqueIds(report, 'flows', flows);
  flows.forEach((flow, i) => {
    requireText(report, `flows[${i}].title`, flow.title);
    const steps = arr(flow.steps);
    if (!steps.length) report.error(`flows[${i}].steps`, 'needs at least one step');
    steps.forEach((step, j) => {
      const path = `flows[${i}].steps[${j}]`;
      requireText(report, `${path}.label`, step.label);
      if (!nodeIds.has(step.from)) report.error(`${path}.from`, `"${step.from}" is not a node id`);
      if (!nodeIds.has(step.to)) report.error(`${path}.to`, `"${step.to}" is not a node id`);
      checkEnum(report, `${path}.kind`, step.kind, STEP_KINDS);
      if (!isText(step.file)) report.warn(`${path}.file`, 'no file cited for this step');
    });
  });
}

function checkChanges(report, changes, nodeIds) {
  changes.forEach((change, i) => {
    const path = `changes[${i}]`;
    requireText(report, `${path}.title`, change.title);
    if (Number.isNaN(Date.parse(change.date))) report.error(`${path}.date`, 'must be an ISO date');
    checkEnum(report, `${path}.authorType`, change.authorType, AUTHOR_TYPES);
    checkEnum(report, `${path}.kind`, change.kind, CHANGE_KINDS);
    if (!isText(change.why)) report.warn(`${path}.why`, 'missing the reason. The "why" is the point of this chapter');
    arr(change.nodes).forEach((id, j) => {
      if (!nodeIds.has(id)) report.error(`${path}.nodes[${j}]`, `"${id}" is not a node id`);
    });
  });
}

function checkLessons(report, data) {
  arr(data.quiz).forEach((q, i) => {
    requireText(report, `quiz[${i}].question`, q.question);
    const options = arr(q.options);
    if (options.length < 2) report.error(`quiz[${i}].options`, 'needs at least two options');
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= options.length) {
      report.error(`quiz[${i}].answer`, `must be an index between 0 and ${Math.max(options.length - 1, 0)}`);
    }
  });
  arr(data.concepts).forEach((c, i) => {
    requireText(report, `concepts[${i}].title`, c.title);
    requireText(report, `concepts[${i}].body`, c.body);
  });
  const models = new Set(arr(data.dataModel).map((m) => m.name));
  arr(data.dataModel).forEach((m, i) => arr(m.relations).forEach((rel, j) => {
    if (!models.has(rel.to)) report.warn(`dataModel[${i}].relations[${j}].to`, `"${rel.to}" is not a model in dataModel`);
  }));
}

function citedFiles(data) {
  return [
    ...arr(data.nodes).flatMap((n) => arr(n.files)),
    ...arr(data.flows).flatMap((f) => arr(f.steps).map((st) => st.file)),
    ...arr(data.concepts).map((c) => c.file),
    ...arr(data.tree).map((t) => t.path),
  ].filter(isText);
}

function checkFilesExist(report, data, repoRoot) {
  const missing = [...new Set(citedFiles(data))]
    .map((file) => file.replace(/[:#]L?\d+(-L?\d+)?$/, '').replace(/\/$/, ''))
    .filter((file) => !existsSync(resolve(repoRoot, file)));
  missing.forEach((file) => report.error('files', `cited path "${file}" does not exist in ${repoRoot}`));
}

const words = (value) => (isText(value) ? value.trim().split(/\s+/).length : 0);
const sentences = (value) => (isText(value) ? (value.match(/[.!?](\s|$)/g) || []).length : 0);

function checkLessonShape(report, data) {
  if (arr(data.layers).length > LIMITS.layers) report.warn('layers', `${arr(data.layers).length} layers. Group into ${LIMITS.layers} or fewer`);
  arr(data.nodes).forEach((n, i) => {
    if (words(n.label) > LIMITS.nodeLabelWords) report.warn(`nodes[${i}].label`, `"${n.label}" is long. Keep node labels to ${LIMITS.nodeLabelWords} words`);
  });
  arr(data.edges).forEach((e, i) => {
    if (words(e.label) > LIMITS.edgeLabelWords) report.warn(`edges[${i}].label`, `keep edge labels to ${LIMITS.edgeLabelWords} words`);
  });
  arr(data.flows).forEach((flow, i) => {
    const steps = arr(flow.steps);
    const { min, max } = LIMITS.stepsPerFlow;
    if (steps.length && (steps.length < min || steps.length > max)) report.warn(`flows[${i}].steps`, `${steps.length} steps. Aim for ${min}–${max}; split long flows`);
    const actors = new Set(steps.flatMap((st) => [st.from, st.to])).size;
    if (actors > LIMITS.actorsPerFlow) report.warn(`flows[${i}]`, `${actors} actors. Group parts so a flow has at most ${LIMITS.actorsPerFlow}`);
    steps.forEach((st, j) => {
      if (words(st.label) > LIMITS.stepLabelWords) report.warn(`flows[${i}].steps[${j}].label`, `keep step labels to ${LIMITS.stepLabelWords} words. Put the rest in detail`);
      if (sentences(st.detail) > LIMITS.detailSentences) report.warn(`flows[${i}].steps[${j}].detail`, `one idea per step. Keep detail to ${LIMITS.detailSentences} sentences`);
    });
  });
  if (arr(data.concepts).length > LIMITS.concepts) report.warn('concepts', `keep to ${LIMITS.concepts} key ideas`);
  if (arr(data.quiz).length > LIMITS.quiz) report.warn('quiz', `keep to ${LIMITS.quiz} questions`);
}

// Writing rule from SKILL.md: say it plainly, no dashes as punctuation.
function checkProseStyle(report, data) {
  const walk = (value, path, key) => {
    if (NON_PROSE_KEYS.has(key)) return;
    if (typeof value === 'string' && DASH.test(value)) report.warn(path, 'uses a dash as punctuation. Split it into two sentences, or use a colon or comma');
    else if (Array.isArray(value)) value.forEach((v, i) => walk(v, `${path}[${i}]`, key));
    else if (value !== null && typeof value === 'object') Object.entries(value).forEach(([k, v]) => walk(v, path ? `${path}.${k}` : k, k));
  };
  walk(data, '', '');
}

// Strings render as text, so markup would show up literally — and signals an
// attempt to restyle the page. Code fields are exempt.
function checkNoMarkup(report, data) {
  const walk = (value, path, key) => {
    if (typeof value === 'string' && key !== 'code' && MARKUP.test(value)) report.error(path, 'contains HTML markup. Strings are plain text; styling comes from the template');
    else if (Array.isArray(value)) value.forEach((v, i) => walk(v, `${path}[${i}]`, key));
    else if (isObject(value)) Object.entries(value).forEach(([k, v]) => walk(v, path ? `${path}.${k}` : k, k));
  };
  walk(data, '', '');
}

function checkPlaceholders(report, data) {
  const hits = [];
  const walk = (value, path) => {
    if (typeof value === 'string' && PLACEHOLDER.test(value)) hits.push(path);
    else if (Array.isArray(value)) value.forEach((v, i) => walk(v, `${path}[${i}]`));
    else if (isObject(value)) Object.entries(value).forEach(([k, v]) => walk(v, path ? `${path}.${k}` : k));
  };
  walk(data, '');
  hits.forEach((path) => report.warn(path, 'still contains a TODO placeholder'));
}

/**
 * Validate an explainer data object.
 * @param {unknown} data
 * @param {{ repoRoot?: string }} [options] when repoRoot is given, every cited file must exist there
 * @returns {ValidationResult}
 */
export function validateExplainer(data, options = {}) {
  const report = collector();
  if (!isObject(data)) {
    report.error('root', 'explainer data must be a JSON object');
    return report.result();
  }
  checkMeta(report, data.meta);
  const nodeIds = checkGraph(report, data);
  checkFlows(report, arr(data.flows), nodeIds);
  checkChanges(report, arr(data.changes), nodeIds);
  checkLessons(report, data);
  checkLessonShape(report, data);
  checkNoMarkup(report, data);
  checkProseStyle(report, data);
  checkPlaceholders(report, data);
  if (options.repoRoot) checkFilesExist(report, data, options.repoRoot);
  return report.result();
}
