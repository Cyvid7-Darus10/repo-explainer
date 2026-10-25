import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { scanRepo } from '../scripts/lib/scan.mjs';
import { createStarter, listPatterns, listPresets } from '../scripts/lib/init.mjs';
import { validateExplainer } from '../scripts/lib/validate.mjs';
import { NODE_KINDS, LAYER_COLORS, CHAPTER_KEYS } from '../scripts/lib/schema.mjs';

const fixture = fileURLToPath(new URL('./fixtures/mini-app', import.meta.url));
const scan = scanRepo(fixture);

test('scan detects frameworks from package.json', () => {
  assert.ok(scan.frameworks.includes('Express'));
  assert.ok(scan.frameworks.includes('Prisma'));
});

test('scan finds route handlers with file:line and skips node_modules', () => {
  const files = scan.routes.handlers.map((h) => h.file);
  assert.ok(files.includes('src/routes/tasks.js:2'));
  assert.ok(files.includes('src/routes/tasks.js:3'));
  assert.ok(!files.some((f) => f.startsWith('node_modules')));
});

test('scan reports env var names but never their values', () => {
  assert.deepEqual(scan.env.keys, ['API_TOKEN', 'DATABASE_URL']);
  const serialised = JSON.stringify(scan);
  assert.ok(!serialised.includes('fake-password-for-tests'));
  assert.ok(!serialised.includes('fake-token-for-tests'));
});

test('scan lists data files and suggests the backend preset for an API without UI', () => {
  assert.ok(scan.dataFiles.includes('prisma/schema.prisma'));
  assert.equal(scan.suggestedPreset, 'backend-api');
});

test('scan fails clearly on a missing directory', () => {
  assert.throws(() => scanRepo('/definitely/not/here'), /scan failed: .* is not a directory/);
});

test('every preset is internally consistent', () => {
  listPresets().forEach((preset) => {
    const layerIds = new Set(preset.layers.map((l) => l.id));
    preset.layers.forEach((l) => assert.ok(LAYER_COLORS.includes(l.color), `${preset.id}: color ${l.color}`));
    preset.starterNodes.forEach((n) => {
      assert.ok(layerIds.has(n.layer), `${preset.id}: node ${n.id} layer`);
      assert.ok(NODE_KINDS.includes(n.kind), `${preset.id}: node ${n.id} kind`);
    });
    preset.chapters.forEach((c) => assert.ok(CHAPTER_KEYS.includes(c), `${preset.id}: chapter ${c}`));
    const patternIds = new Set(listPatterns().map((p) => p.id));
    preset.patterns.forEach((p) => assert.ok(patternIds.has(p), `${preset.id}: pattern ${p}`));
  });
});

test('every pattern only uses its declared roles', () => {
  listPatterns().forEach((pattern) => {
    const roles = new Set(pattern.roles);
    pattern.steps.forEach((st) => {
      assert.ok(roles.has(st.from) && roles.has(st.to), `${pattern.id}: ${st.from} → ${st.to}`);
    });
  });
});

test('a starter file has no structural errors except its empty flow, and flags its TODOs', () => {
  const { errors, warnings } = validateExplainer(createStarter(scan.suggestedPreset, scan));
  assert.deepEqual(errors, ['flows[0].steps: needs at least one step']);
  assert.ok(warnings.some((w) => w.includes('TODO')));
});
