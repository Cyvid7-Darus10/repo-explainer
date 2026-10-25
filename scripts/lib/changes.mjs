import { execFileSync } from 'node:child_process';

// Turns git history into draft "changes" entries. The agent must still fill
// in `why` from PR descriptions / commit bodies, and map files to node ids.

const FIELD = '\u001f';
const RECORD = '\u001e';
const DEFAULT_AGENT_PATTERNS = [/\[bot\]/i, /\bbot\b/i, /agent/i, /claude/i, /copilot/i, /codex/i, /devin/i, /cursor/i, /dependabot/i, /renovate/i];
const AGENT_TRAILERS = /^(Co-Authored-By|Generated-By|Assisted-By):.*\b(claude|copilot|codex|devin|cursor|agent|bot)\b/im;
const CONVENTIONAL = /^(feat|fix|refactor|perf|docs|test|chore|ci|security|build|style)(\(.+?\))?!?:\s*/i;
const PR_REF = /(?:#|!)(\d+)/;

function git(repo, args) {
  try {
    return execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (error) {
    throw new Error(`git ${args[0]} failed in ${repo}: ${error.stderr || error.message}`);
  }
}

/**
 * @param {string} author
 * @param {string} body
 * @param {RegExp[]} agentPatterns
 * @returns {'agent' | 'human'}
 */
export function classifyAuthor(author, body, agentPatterns = DEFAULT_AGENT_PATTERNS) {
  if (agentPatterns.some((p) => p.test(author))) return 'agent';
  return AGENT_TRAILERS.test(body) ? 'agent' : 'human';
}

/**
 * Parse one commit's subject into a title, kind and PR reference.
 * @param {string} subject
 */
export function parseSubject(subject) {
  const kindMatch = subject.match(CONVENTIONAL);
  const kind = kindMatch ? kindMatch[1].toLowerCase() : undefined;
  const ref = (subject.match(PR_REF) || [])[0];
  const title = subject.replace(CONVENTIONAL, '').replace(/\s*\((?:#|!)\d+\)\s*$/, '').replace(/^Merge pull request #\d+ from \S+\s*/, '').trim();
  return { title: title || subject, kind: kind === 'build' || kind === 'style' ? 'chore' : kind, ref };
}

// Each record: sha F date F author F subject F body F <newline-separated files>
function parseLog(raw) {
  return raw.split(RECORD).filter((chunk) => chunk.trim()).map((chunk) => {
    const [sha, date, author, subject, body = '', files = ''] = chunk.split(FIELD);
    return {
      sha: sha.trim(), date, author, subject, body: body.trim(),
      files: files.split('\n').map((f) => f.trim()).filter(Boolean),
    };
  });
}

/**
 * Map changed files onto node ids by the longest matching path prefix in node.files.
 * @param {string[]} files
 * @param {{ id: string, files?: string[] }[]} nodes
 * @returns {string[]}
 */
export function mapFilesToNodes(files, nodes = []) {
  const prefixes = nodes.flatMap((node) => (node.files || []).map((f) => ({ id: node.id, prefix: f.replace(/[:#]L?\d+.*$/, '') })))
    .filter((p) => p.prefix)
    .sort((a, b) => b.prefix.length - a.prefix.length);
  const ids = files.map((file) => (prefixes.find((p) => file === p.prefix || file.startsWith(p.prefix.endsWith('/') ? p.prefix : `${p.prefix}/`)) || {}).id);
  return [...new Set(ids.filter(Boolean))];
}

/**
 * Read recent history and draft change entries.
 * @param {string} repo path to a git repo
 * @param {{ since?: string, limit?: number, mergesOnly?: boolean, nodes?: object[], remoteUrl?: string }} [options]
 */
export function collectChanges(repo, options = {}) {
  const { since = '14 days ago', limit = 40, mergesOnly = false, nodes = [], remoteUrl } = options;
  const format = `${RECORD}%H${FIELD}%cI${FIELD}%an${FIELD}%s${FIELD}%b${FIELD}`;
  const args = ['log', `--since=${since}`, `-n${limit}`, `--pretty=format:${format}`, '--name-only'];
  if (mergesOnly) args.push('--merges', '--first-parent', '-m');
  const commits = parseLog(git(repo, args));
  return commits.map((commit) => {
    const { title, kind, ref } = parseSubject(commit.subject);
    const prNumber = ref ? ref.slice(1) : undefined;
    return {
      id: commit.sha.slice(0, 10),
      title,
      date: commit.date,
      author: commit.author,
      authorType: classifyAuthor(commit.author, commit.body),
      ref: ref || commit.sha.slice(0, 7),
      url: remoteUrl && prNumber ? `${remoteUrl.replace(/\/$/, '')}/pull/${prNumber}` : undefined,
      kind,
      what: commit.body.split('\n').filter((l) => l.trim() && !/^[\w-]+-By:/i.test(l)).slice(0, 3).join(' ').slice(0, 400) || undefined,
      why: 'TODO: the reason for this change (read the PR description or linked issue)',
      nodes: mapFilesToNodes(commit.files, nodes),
      files: commit.files.slice(0, 20),
    };
  });
}
