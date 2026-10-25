#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { execFileSync } from 'node:child_process';
import { buildExplainer, buildGallery } from '../scripts/lib/build.mjs';
import { NODE_KINDS } from '../scripts/lib/schema.mjs';
import { validateExplainer } from '../scripts/lib/validate.mjs';
import { scanRepo } from '../scripts/lib/scan.mjs';
import { collectChanges } from '../scripts/lib/changes.mjs';
import { createStarter, listPatterns, listPresets } from '../scripts/lib/init.mjs';
import { exportIcons, exportLogos } from '../scripts/lib/assets.mjs';
import { PRICING, costTable, formatUsd, sizeOf } from '../scripts/lib/estimate.mjs';

const HELP = `repo-explainer: turn a repo into a guided, interactive HTML tour

Usage
  repo-explainer scan <repo>                       Facts to start from (stack, routes, data files, env keys)
  repo-explainer estimate [repo]                   Rough agent cost per run, per model (all sizes if no repo)
  repo-explainer init <repo> [--preset id]         Write a starter explainer.json (preset auto-picked from scan)
  repo-explainer changes <repo> [--data file]      Draft "what changed & why" entries from git history
  repo-explainer validate <file> [--repo dir]      Check the data; --repo also checks every cited file exists
  repo-explainer build <file> [--out f] [--repo d] Validate, then render one self-contained HTML file
  repo-explainer presets                           List presets
  repo-explainer patterns [id]                     List reusable flow patterns, or print one
  repo-explainer assets [--out dir]                Export logo + icon SVGs
  repo-explainer gallery [--out file]              Render the design kit (icons, palette, components, patterns)

Options
  --out, -o      Output path                      --since     git window (default "14 days ago")
  --preset, -p   Preset id                        --limit     max commits (default 40)
  --repo, -r     Repo root for file checks        --merges    only merge commits (PR merges)
  --strict       Treat warnings as errors         --write     merge drafted changes into --data file
  --open         Open the built file              --remote    repo URL for PR links (e.g. https://github.com/o/r)
`;

const OPTIONS = {
  out: { type: 'string', short: 'o' },
  preset: { type: 'string', short: 'p' },
  repo: { type: 'string', short: 'r' },
  data: { type: 'string' },
  since: { type: 'string' },
  limit: { type: 'string' },
  remote: { type: 'string' },
  merges: { type: 'boolean' },
  write: { type: 'boolean' },
  strict: { type: 'boolean' },
  open: { type: 'boolean' },
  help: { type: 'boolean', short: 'h' },
};

class UsageError extends Error {}

function readJson(path) {
  if (!existsSync(path)) throw new UsageError(`file not found: ${path}`);
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new UsageError(`could not parse ${path}: ${error.message}`);
  }
}

function writeFile(path, content) {
  mkdirSync(dirname(resolve(path)), { recursive: true });
  writeFileSync(path, content);
  process.stderr.write(`✔ wrote ${path}\n`);
}

function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function report({ errors, warnings }, strict) {
  warnings.forEach((w) => process.stderr.write(`  ⚠ ${w}\n`));
  errors.forEach((e) => process.stderr.write(`  ✖ ${e}\n`));
  const failed = errors.length > 0 || (strict && warnings.length > 0);
  process.stderr.write(`${failed ? '✖' : '✔'} ${errors.length} error(s), ${warnings.length} warning(s)\n`);
  return !failed;
}

function requirePositional(positionals, label) {
  if (!positionals[0]) throw new UsageError(`missing ${label}\n\n${HELP}`);
  return positionals[0];
}

const COMMANDS = {
  scan(positionals) {
    printJson(scanRepo(resolve(requirePositional(positionals, '<repo>'))));
  },

  init(positionals, opts) {
    const repo = resolve(requirePositional(positionals, '<repo>'));
    const scan = scanRepo(repo);
    const preset = opts.preset || scan.suggestedPreset;
    const out = opts.out || 'explainer.json';
    if (existsSync(out)) throw new UsageError(`${out} already exists. Pass --out to choose another path`);
    writeFile(out, `${JSON.stringify(createStarter(preset, scan), null, 2)}\n`);
    process.stderr.write(`  preset: ${preset}${opts.preset ? '' : ' (suggested by scan)'}\n  next: fill the TODOs, then \`repo-explainer build ${out} --repo ${repo}\`\n`);
  },

  changes(positionals, opts) {
    const repo = resolve(requirePositional(positionals, '<repo>'));
    const data = opts.data ? readJson(opts.data) : null;
    const drafted = collectChanges(repo, {
      since: opts.since, limit: opts.limit ? Number(opts.limit) : undefined, mergesOnly: opts.merges,
      nodes: data ? data.nodes : [], remoteUrl: opts.remote,
    });
    if (!opts.write) return printJson(drafted);
    if (!data) throw new UsageError('--write needs --data <explainer.json>');
    const known = new Set((data.changes || []).map((c) => c.id));
    const merged = { ...data, changes: [...(data.changes || []), ...drafted.filter((c) => !known.has(c.id))] };
    writeFile(opts.data, `${JSON.stringify(merged, null, 2)}\n`);
    process.stderr.write(`  added ${merged.changes.length - (data.changes || []).length} change(s); fill each "why"\n`);
    return undefined;
  },

  validate(positionals, opts) {
    const file = requirePositional(positionals, '<file>');
    const ok = report(validateExplainer(readJson(file), { repoRoot: opts.repo && resolve(opts.repo) }), opts.strict);
    if (!ok) process.exitCode = 1;
  },

  build(positionals, opts) {
    const file = requirePositional(positionals, '<file>');
    const data = readJson(file);
    if (!report(validateExplainer(data, { repoRoot: opts.repo && resolve(opts.repo) }), opts.strict)) {
      process.exitCode = 1;
      return;
    }
    const out = opts.out || join(dirname(file), `${basename(file).replace(/(\.explainer)?\.json$/, '')}.html`);
    writeFile(out, buildExplainer(data));
    if (opts.open) execFileSync(process.platform === 'darwin' ? 'open' : 'xdg-open', [out]);
  },

  estimate(positionals) {
    const size = positionals[0] ? sizeOf(scanRepo(resolve(positionals[0]))) : null;
    const rows = costTable(size ? ['update', size] : undefined);
    const models = Object.keys(PRICING.models);
    const pad = (v, n) => String(v).padEnd(n);
    process.stdout.write(`${pad('Run', 36)}${models.map((m) => pad(PRICING.models[m].label, 12)).join('')}\n`);
    rows.forEach((row) => process.stdout.write(`${pad(row.label, 36)}${models.map((m) => pad(formatUsd(row.costs[m]), 12)).join('')}\n`));
    process.stdout.write(`\nEstimates, not quotes. Prices from ${PRICING.source} (checked ${PRICING.checkedAt}).\n`);
    if (size) process.stdout.write(`This repo looks ${size}.\n`);
  },

  presets() {
    listPresets().forEach((p) => process.stdout.write(`${p.id.padEnd(16)} ${p.name}\n${' '.repeat(17)}${p.whenToUse}\n`));
  },

  patterns(positionals) {
    const all = listPatterns();
    if (!positionals[0]) {
      all.forEach((p) => process.stdout.write(`${p.id.padEnd(18)} ${p.use}\n`));
      return;
    }
    const pattern = all.find((p) => p.id === positionals[0]);
    if (!pattern) throw new UsageError(`unknown pattern "${positionals[0]}"`);
    printJson(pattern);
  },

  gallery(_positionals, opts) {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    writeFile(opts.out || 'gallery.html', buildGallery({ kinds: NODE_KINDS, patterns: listPatterns(), version: pkg.version }));
  },

  assets(_positionals, opts) {
    const out = opts.out || 'repo-explainer-assets';
    exportIcons().forEach(({ name, svg }) => writeFile(join(out, 'icons', `${name}.svg`), svg));
    exportLogos().forEach(({ name, svg }) => writeFile(join(out, 'logo', `${name}.svg`), svg));
  },
};

function main(argv) {
  const { values, positionals } = parseArgs({ args: argv, options: OPTIONS, allowPositionals: true });
  const [command, ...rest] = positionals;
  if (!command || values.help) {
    process.stdout.write(HELP);
    return;
  }
  const run = COMMANDS[command];
  if (!run) throw new UsageError(`unknown command "${command}"\n\n${HELP}`);
  run(rest, values);
}

try {
  main(process.argv.slice(2));
} catch (error) {
  process.stderr.write(`✖ ${error instanceof UsageError ? error.message : `repo-explainer failed: ${error.message}`}\n`);
  process.exitCode = 1;
}
