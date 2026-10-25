// Rough cost of one agent run, by repo size and model. Usage profiles come
// from what a run does: scan, read entry points and traced files, write the
// JSON, rebuild a few times. Most re-sent context is served from the prompt
// cache, which is why cache reads dominate the token count but not the bill.

// USD per million tokens. Source: https://claude.com/pricing (checked 2026-10-25).
export const PRICING = {
  checkedAt: '2026-10-25',
  source: 'https://claude.com/pricing',
  models: {
    'fable-5.1': { label: 'Fable 5.1', input: 10, output: 50, cacheRead: 0.25 },
    'opus-5.5': { label: 'Opus 5.5', input: 4, output: 20, cacheRead: 0.2 },
    'sonnet-5.5': { label: 'Sonnet 5.5', input: 2, output: 10, cacheRead: 0.1 },
    // Haiku 5.5 is cheaper for prompts ≤100K tokens; small runs stay under it.
    'haiku-5.5': {
      label: 'Haiku 5.5', input: 0.1, output: 0.5, cacheRead: 0.01,
      longContext: { above: 100000, input: 0.5, output: 2.5, cacheRead: 0.05 },
    },
  },
};

// Millions of tokens per run. "fresh" = uncached input (file reads, tool output).
export const USAGE = {
  update: { label: 'Update (new merges only)', fresh: 0.04, cacheRead: 0.6, output: 0.008, peakContext: 60000 },
  small: { label: 'Small repo (< 300 source files)', fresh: 0.06, cacheRead: 1.0, output: 0.015, peakContext: 80000 },
  medium: { label: 'Medium repo (300 to 2,000 files)', fresh: 0.15, cacheRead: 3.6, output: 0.025, peakContext: 130000 },
  large: { label: 'Large repo (2,000+ files)', fresh: 0.4, cacheRead: 12, output: 0.05, peakContext: 250000 },
};

const SOURCE_EXT = /\.(m?[jt]sx?|py|go|rb|java|kt|swift|rs|php|cs|c|cc|cpp|h|scala|ex|exs|dart|vue|svelte|sql)$/;

/**
 * @param {{ languages?: { ext: string, count: number }[], fileCount?: number }} scan
 * @returns {'small' | 'medium' | 'large'}
 */
export function sizeOf(scan) {
  const sourceFiles = (scan.languages || []).filter((l) => SOURCE_EXT.test(`x${l.ext}`)).reduce((n, l) => n + l.count, 0);
  if (sourceFiles >= 2000) return 'large';
  if (sourceFiles >= 300) return 'medium';
  return 'small';
}

/**
 * @param {keyof USAGE} profile
 * @param {keyof PRICING['models']} model
 * @returns {number} estimated USD for one run
 */
export function costOf(profile, model) {
  const use = USAGE[profile];
  const base = PRICING.models[model];
  const rate = base.longContext && use.peakContext > base.longContext.above ? base.longContext : base;
  return use.fresh * rate.input + use.cacheRead * rate.cacheRead + use.output * rate.output;
}

export function costTable(profiles = Object.keys(USAGE)) {
  return profiles.map((profile) => ({
    profile,
    label: USAGE[profile].label,
    costs: Object.fromEntries(Object.keys(PRICING.models).map((model) => [model, costOf(profile, model)])),
  }));
}

export function formatUsd(value) {
  return value < 0.1 ? `$${value.toFixed(3)}` : `$${value.toFixed(2)}`;
}
