import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildExplainer, buildGallery, escapeHtml, serializeForScript } from '../scripts/lib/build.mjs';
import { NODE_KINDS } from '../scripts/lib/schema.mjs';
import { listPatterns } from '../scripts/lib/init.mjs';

const example = JSON.parse(readFileSync(new URL('../examples/taskflow.explainer.json', import.meta.url), 'utf8'));

function embeddedJson(html) {
  const match = html.match(/<script type="application\/json" id="explainer-data">([\s\S]*?)<\/script>/);
  assert.ok(match, 'data script tag present');
  return JSON.parse(match[1]);
}

test('build produces one self-contained page with every placeholder filled', () => {
  const html = buildExplainer(example);
  assert.match(html, /^<!doctype html>/);
  assert.doesNotMatch(html, /__TITLE__|__EXPLAINER_DATA__|\/\*__STYLES__\*\/|\/\*__SCRIPTS__\*\//);
  assert.match(html, /<title>Taskflow, explained · Repo Explainer<\/title>/);
  assert.match(html, /boot\(\);/);
  assert.match(html, /<meta name="description" content="A team to-do app\./);
  assert.deepEqual(embeddedJson(html), example);
});

test('repo content cannot break out of the data script tag', () => {
  const hostile = { meta: { title: '</script><script>alert(1)</script>', summary: '<!-- & \u2028 \u2029' } };
  const html = buildExplainer(hostile);
  assert.equal((html.match(/<\/script>/g) || []).length, 2, 'only the two real closing tags');
  assert.deepEqual(embeddedJson(html), hostile);
  assert.match(html, /<title>&lt;\/script&gt;/);
  assert.match(html, /<meta property="og:title" content="&lt;\/script&gt;/);
});

test('replacement patterns in data are inserted literally', () => {
  const data = { meta: { title: 'Costs $& and $1', summary: "$' $`" } };
  assert.deepEqual(embeddedJson(buildExplainer(data)), data);
});

test('serializeForScript escapes <, >, & and line separators', () => {
  const out = serializeForScript({ s: '<a>&\u2028' });
  assert.doesNotMatch(out, /[<>&\u2028]/);
  assert.deepEqual(JSON.parse(out), { s: '<a>&\u2028' });
});

test('escapeHtml covers the five significant characters', () => {
  assert.equal(escapeHtml(`<a href="x" title='y'>&</a>`), '&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;');
});

test('gallery builds with its own boot and without the explainer boot', () => {
  const html = buildGallery({ kinds: NODE_KINDS, patterns: listPatterns(), version: '0.0.0' });
  assert.match(html, /bootGallery\(\);/);
  assert.doesNotMatch(html, /\nboot\(\);/);
  assert.equal(embeddedJson(html).patterns.length, listPatterns().length);
});

test('placeholder names inside data are never expanded a second time', () => {
  const data = { meta: { title: 'x __EXPLAINER_DATA__ /*__SCRIPTS__*/', summary: '__TITLE__ "quoted"' } };
  const html = buildExplainer(data);
  assert.match(html, /<title>x __EXPLAINER_DATA__ \/\*__SCRIPTS__\*\/ · Repo Explainer<\/title>/);
  assert.match(html, /<meta name="description" content="__TITLE__ &quot;quoted&quot;">/);
  assert.equal((html.match(/<script>/g) || []).length, 1, 'no second script block injected');
  assert.deepEqual(embeddedJson(html), data);
});
