import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// SKILL.md frontmatter must stay valid YAML or agents cannot load the skill.
// No YAML dependency: check the shapes that break plain scalars.
const source = readFileSync(new URL('../SKILL.md', import.meta.url), 'utf8');
const match = source.match(/^---\n([\s\S]*?)\n---\n/);

test('SKILL.md starts with a frontmatter block', () => {
  assert.ok(match, 'frontmatter fenced by --- lines');
});

test('frontmatter has name and description, each on one line', () => {
  const fields = Object.fromEntries(match[1].split('\n').map((line) => {
    const at = line.indexOf(': ');
    return [line.slice(0, at), line.slice(at + 2)];
  }));
  assert.equal(fields.name, 'repo-explainer');
  assert.ok(fields.description && fields.description.length > 40);
});

test('values containing ": " or " #" are quoted, so YAML reads them as one string', () => {
  match[1].split('\n').forEach((line) => {
    const value = line.slice(line.indexOf(': ') + 2);
    if (/: | #/.test(value)) {
      const quoted = /^"(?:[^"\\]|\\.)*"$/.test(value) || /^'(?:[^']|'')*'$/.test(value);
      assert.ok(quoted, `quote this value: ${line.slice(0, 60)}`);
    }
  });
});
