import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCHEMA_VERSION } from './schema.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const PRESETS_DIR = join(ROOT, 'presets');
export const PATTERNS_DIR = join(ROOT, 'patterns');

function readJsonDir(dir) {
  return readdirSync(dir).filter((f) => f.endsWith('.json')).sort()
    .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')));
}

export function listPresets() {
  return readJsonDir(PRESETS_DIR);
}

export function listPatterns() {
  return readJsonDir(PATTERNS_DIR);
}

export function loadPreset(id) {
  const preset = listPresets().find((p) => p.id === id);
  if (!preset) throw new Error(`unknown preset "${id}" (available: ${listPresets().map((p) => p.id).join(', ')})`);
  return preset;
}

/**
 * Build a starter explainer from a preset and (optionally) scan facts.
 * Every TODO is intentional: validate warns until the agent replaces them.
 * @param {string} presetId
 * @param {object} [scan] output of scanRepo()
 */
export function createStarter(presetId, scan = {}) {
  const preset = loadPreset(presetId);
  const today = new Date().toISOString().slice(0, 10);
  return {
    schemaVersion: SCHEMA_VERSION,
    meta: {
      title: `${scan.name || 'This repo'}, explained`,
      repo: scan.name || 'TODO: owner/repo',
      summary: 'TODO: two plain sentences. What this does, and for whom.',
      stack: (scan.frameworks || []).slice(0, 8),
      preset: preset.id,
      generatedAt: today,
      chapters: preset.chapters,
    },
    layers: preset.layers,
    nodes: preset.starterNodes.map((node) => ({ ...node, summary: 'TODO: one sentence on what this part does', files: [] })),
    edges: [],
    flows: preset.mustTrace.slice(0, 1).map((goal, i) => ({
      id: `flow-${i + 1}`, title: 'TODO: flow name', trigger: 'TODO: what starts it', summary: goal, steps: [],
    })),
    changes: [],
    tree: (scan.topLevel || []).filter((t) => t.path.endsWith('/')).slice(0, 12).map((t) => ({ path: t.path, note: 'TODO' })),
    dataModel: [],
    concepts: [],
    quiz: [],
    glossary: [],
    runbook: (scan.scripts || []).filter((sc) => /^(dev|start|test|build)$/.test(sc.name)).slice(0, 4)
      .map((sc) => ({ label: sc.name, command: `npm run ${sc.name}`, note: sc.command })),
  };
}
