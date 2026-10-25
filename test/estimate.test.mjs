import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRICING, USAGE, costOf, costTable, formatUsd, sizeOf } from '../scripts/lib/estimate.mjs';

test('bigger runs never cost less, for every model', () => {
  Object.keys(PRICING.models).forEach((model) => {
    const costs = ['update', 'small', 'medium', 'large'].map((p) => costOf(p, model));
    costs.slice(1).forEach((c, i) => assert.ok(c >= costs[i], `${model}: ${costs.join(' < ')}`));
  });
});

test('a medium Sonnet 5.5 run adds up input, cache reads and output', () => {
  const use = USAGE.medium;
  const rate = PRICING.models['sonnet-5.5'];
  assert.equal(costOf('medium', 'sonnet-5.5'), use.fresh * rate.input + use.cacheRead * rate.cacheRead + use.output * rate.output);
});

test('Haiku switches to its long-context rate above 100K-token prompts', () => {
  const short = costOf('small', 'haiku-5.5');
  const long = costOf('medium', 'haiku-5.5');
  const { longContext } = PRICING.models['haiku-5.5'];
  const use = USAGE.medium;
  assert.equal(long, use.fresh * longContext.input + use.cacheRead * longContext.cacheRead + use.output * longContext.output);
  assert.ok(short < long);
});

test('repo size is judged by source files only', () => {
  assert.equal(sizeOf({ languages: [{ ext: '.md', count: 5000 }, { ext: '.ts', count: 40 }] }), 'small');
  assert.equal(sizeOf({ languages: [{ ext: '.py', count: 300 }] }), 'medium');
  assert.equal(sizeOf({ languages: [{ ext: '.go', count: 1500 }, { ext: '.sql', count: 600 }] }), 'large');
});

test('cost table covers every profile and model, and formats cents sensibly', () => {
  const table = costTable();
  assert.equal(table.length, Object.keys(USAGE).length);
  table.forEach((row) => assert.deepEqual(Object.keys(row.costs), Object.keys(PRICING.models)));
  assert.equal(formatUsd(0.0144), '$0.014');
  assert.equal(formatUsd(1.825), '$1.82');
});
