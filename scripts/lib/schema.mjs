// Single source of truth for the explainer data contract.
// Documented for humans in references/data-schema.md — keep them in sync.

export const SCHEMA_VERSION = 1;

export const CHAPTER_KEYS = ['map', 'flows', 'changes', 'tree', 'data', 'concepts', 'quiz', 'glossary', 'run'];

export const NODE_KINDS = [
  'user', 'ui', 'mobile', 'api', 'service', 'db', 'queue', 'cache',
  'external', 'job', 'cli', 'auth', 'storage', 'library',
];

export const LAYER_COLORS = ['green', 'blue', 'navy', 'midnight', 'yellow', 'pink'];

export const STEP_KINDS = ['request', 'response', 'async', 'data', 'internal'];

export const EDGE_KINDS = ['sync', 'async', 'data'];

export const AUTHOR_TYPES = ['human', 'agent'];

export const CHANGE_KINDS = ['feat', 'fix', 'refactor', 'perf', 'docs', 'test', 'chore', 'ci', 'security'];

export const PLACEHOLDER = /\bTODO\b/;

// Lesson-shape limits from SKILL.md. Exceeding them is a warning (an error
// under --strict) because it makes the page harder to read, not broken.
export const LIMITS = {
  stepsPerFlow: { min: 3, max: 12 },
  actorsPerFlow: 7,
  layers: 8,
  nodeLabelWords: 4,
  stepLabelWords: 7,
  edgeLabelWords: 4,
  detailSentences: 3,
  concepts: 6,
  quiz: 6,
};

export const MARKUP = /<\/?[a-z][a-z0-9-]*(\s[^>]*)?>/i;

// Prose fields are read by people; code-ish fields are exempt from style checks.
export const NON_PROSE_KEYS = new Set(['code', 'file', 'files', 'path', 'command', 'url', 'ref', 'id', 'type', 'name', 'lang', 'from', 'to', 'layer', 'kind', 'color', 'date', 'generatedAt', 'commit', 'repo', 'author', 'authorType', 'chapters', 'preset', 'stack', '$schema']);

// Em dash, en dash, or a spaced hyphen used as punctuation.
export const DASH = /\s[\u2014\u2013-]\s|\u2014|\u2013/;
