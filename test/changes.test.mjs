import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { classifyAuthor, collectChanges, mapFilesToNodes, parseSubject } from '../scripts/lib/changes.mjs';

test('agents are recognised by name or by co-author trailer', () => {
  assert.equal(classifyAuthor('dependabot[bot]', ''), 'agent');
  assert.equal(classifyAuthor('claude-agent', ''), 'agent');
  assert.equal(classifyAuthor('Maria Santos', 'Co-Authored-By: Claude <noreply@anthropic.com>'), 'agent');
  assert.equal(classifyAuthor('Maria Santos', 'Reviewed-by: Sam'), 'human');
});

test('conventional commit subjects become a title, a kind and a PR ref', () => {
  assert.deepEqual(parseSubject('feat(billing): enforce plan limit (#479)'), { title: 'enforce plan limit', kind: 'feat', ref: '#479' });
  assert.deepEqual(parseSubject('style: format files'), { title: 'format files', kind: 'chore', ref: undefined });
  assert.equal(parseSubject('Merge pull request #12 from acme/fix-login').ref, '#12');
});

test('changed files map to nodes by the longest matching path', () => {
  const nodes = [
    { id: 'web', files: ['apps/web/'] },
    { id: 'api', files: ['apps/web/app/api/'] },
    { id: 'db', files: ['packages/db/schema.prisma:1'] },
  ];
  assert.deepEqual(mapFilesToNodes(['apps/web/app/api/tasks/route.ts'], nodes), ['api']);
  assert.deepEqual(mapFilesToNodes(['apps/web/page.tsx', 'packages/db/schema.prisma'], nodes), ['web', 'db']);
  assert.deepEqual(mapFilesToNodes(['README.md'], nodes), []);
  assert.deepEqual(mapFilesToNodes(['apps/website/x.ts'], [{ id: 'web', files: ['apps/web'] }]), [], 'no partial-segment match');
});

test('collectChanges reads real git history into draft entries', (t) => {
  const repo = mkdtempSync(join(tmpdir(), 'repo-explainer-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' });
  git('init', '-q');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test Human');
  mkdirSync(join(repo, 'src'));
  writeFileSync(join(repo, 'src', 'a.js'), '1');
  git('add', '.');
  git('commit', '-q', '-m', 'feat: add a (#7)', '-m', 'Because users asked.');
  writeFileSync(join(repo, 'src', 'a.js'), '2');
  git('commit', '-q', '-am', 'fix: tweak a', '-m', 'Co-Authored-By: Claude <noreply@anthropic.com>');

  const changes = collectChanges(repo, { since: '1 day ago', nodes: [{ id: 'core', files: ['src/'] }], remoteUrl: 'https://github.com/o/r' });
  assert.equal(changes.length, 2);
  const [latest, first] = changes;
  assert.equal(latest.authorType, 'agent');
  assert.equal(latest.kind, 'fix');
  assert.equal(first.authorType, 'human');
  assert.equal(first.ref, '#7');
  assert.equal(first.url, 'https://github.com/o/r/pull/7');
  assert.equal(first.what, 'Because users asked.');
  assert.deepEqual(first.nodes, ['core']);
  assert.deepEqual(first.files, ['src/a.js']);
  assert.match(first.why, /^TODO/);
});

test('collectChanges fails with the operation name outside a git repo', () => {
  assert.throws(() => collectChanges(tmpdir()), /git log failed/);
});
