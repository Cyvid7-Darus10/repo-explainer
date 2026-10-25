import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validateExplainer } from '../scripts/lib/validate.mjs';

const example = JSON.parse(readFileSync(new URL('../examples/taskflow.explainer.json', import.meta.url), 'utf8'));
const fixtureRepo = fileURLToPath(new URL('./fixtures/mini-app', import.meta.url));
const clone = () => structuredClone(example);
const minimal = () => ({
  meta: { title: 'Mini, explained', summary: 'A tiny API.' },
  layers: [{ id: 'api', label: 'API', color: 'green' }],
  nodes: [{ id: 'router', label: 'Router', layer: 'api', kind: 'api', files: ['src/routes/tasks.js'] }],
});

test('the bundled example passes with no errors or warnings', () => {
  assert.deepEqual(validateExplainer(example), { errors: [], warnings: [] });
});

test('a non-object is rejected', () => {
  assert.equal(validateExplainer(null).errors.length, 1);
  assert.equal(validateExplainer([]).errors.length, 1);
});

test('missing title and summary are errors', () => {
  const data = { ...clone(), meta: {} };
  const { errors } = validateExplainer(data);
  assert.ok(errors.some((e) => e.startsWith('meta.title')));
  assert.ok(errors.some((e) => e.startsWith('meta.summary')));
});

test('edges and flow steps must point at existing nodes', () => {
  const data = clone();
  data.edges = [...data.edges, { from: 'ghost', to: 'web' }];
  data.flows[0].steps[0] = { ...data.flows[0].steps[0], to: 'nowhere' };
  const { errors } = validateExplainer(data);
  assert.ok(errors.some((e) => e.includes('"ghost" is not a node id')));
  assert.ok(errors.some((e) => e.includes('"nowhere" is not a node id')));
});

test('duplicate node ids are errors', () => {
  const data = clone();
  data.nodes = [...data.nodes, { ...data.nodes[1] }];
  assert.ok(validateExplainer(data).errors.some((e) => e.includes('duplicate id')));
});

test('quiz answers must be a valid option index', () => {
  const data = clone();
  data.quiz[0] = { ...data.quiz[0], answer: 9 };
  assert.ok(validateExplainer(data).errors.some((e) => e.startsWith('quiz[0].answer')));
});

test('unknown chapter keys are errors', () => {
  const data = clone();
  data.meta = { ...data.meta, chapters: ['map', 'timeline'] };
  assert.ok(validateExplainer(data).errors.some((e) => e.includes('unknown chapter "timeline"')));
});

test('HTML markup in prose is rejected, but code fields may contain it', () => {
  const data = clone();
  data.nodes[1] = { ...data.nodes[1], summary: 'Renders <b style="color:red">fast</b>' };
  data.flows[0].steps[1] = { ...data.flows[0].steps[1], code: 'return <div className="x" />' };
  const { errors } = validateExplainer(data);
  assert.equal(errors.filter((e) => e.includes('HTML markup')).length, 1);
  assert.ok(errors[0].startsWith('nodes[1].summary'));
});

test('dashes used as punctuation in prose are warned about', () => {
  const data = clone();
  data.nodes[1] = { ...data.nodes[1], summary: 'Pages and components — the UI.' };
  data.nodes[2] = { ...data.nodes[2], summary: 'Server-side checks are fine.' };
  const dashWarnings = validateExplainer(data).warnings.filter((w) => w.includes('dash'));
  assert.equal(dashWarnings.length, 1);
  assert.ok(dashWarnings[0].startsWith('nodes[1].summary'));
});

test('flows with more than seven actors are warned about', () => {
  const data = minimal();
  data.nodes = Array.from({ length: 9 }, (_, i) => ({ id: `n${i}`, label: `Node ${i}`, layer: 'api', kind: 'service', files: ['x'] }));
  data.flows = [{ id: 'f', title: 'Long', steps: data.nodes.slice(1).map((n, i) => ({ from: `n${i}`, to: n.id, label: 'Calls next', file: 'x:1' })) }];
  assert.ok(validateExplainer(data).warnings.some((w) => w.includes('9 actors')));
});

test('leftover TODO placeholders are warned about', () => {
  const data = minimal();
  data.meta.summary = 'TODO: write me';
  assert.ok(validateExplainer(data).warnings.some((w) => w.startsWith('meta.summary') && w.includes('TODO')));
});

test('with a repo root, every cited path must exist (line suffixes ignored)', () => {
  const ok = minimal();
  ok.flows = [{ id: 'f', title: 'List', steps: [
    { from: 'router', to: 'router', label: 'Lists tasks', file: 'src/routes/tasks.js:2' },
    { from: 'router', to: 'router', label: 'Creates task', file: 'src/routes/tasks.js:3' },
    { from: 'router', to: 'router', label: 'Returns JSON', file: 'src/server.js:3' },
  ] }];
  assert.deepEqual(validateExplainer(ok, { repoRoot: fixtureRepo }).errors, []);

  const bad = { ...ok, nodes: [{ ...ok.nodes[0], files: ['src/missing.js'] }] };
  assert.ok(validateExplainer(bad, { repoRoot: fixtureRepo }).errors.some((e) => e.includes('src/missing.js')));
});

test('change links must be http or https', () => {
  const data = clone();
  data.changes[0] = { ...data.changes[0], url: 'javascript:alert(1)' };
  data.changes[1] = { ...data.changes[1], url: 'https://github.com/o/r/pull/1' };
  const urlErrors = validateExplainer(data).errors.filter((e) => e.includes('.url'));
  assert.deepEqual(urlErrors, ['changes[0].url: must start with http:// or https://']);
});
