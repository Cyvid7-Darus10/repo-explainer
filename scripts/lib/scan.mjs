import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { basename, extname, join, relative, sep } from 'node:path';

// Facts, not conclusions: the scan tells an agent where to look. The agent
// still has to read the code before claiming anything in the explainer.

const IGNORED_DIRS = new Set([
  '.git', 'node_modules', 'dist', 'build', 'out', '.next', '.nuxt', '.svelte-kit', '.turbo', '.vercel',
  'coverage', 'vendor', 'target', '.venv', 'venv', '__pycache__', '.mypy_cache', '.pytest_cache',
  '.idea', '.vscode', 'Pods', 'DerivedData', '.gradle', '.dart_tool', 'tmp', '.cache',
]);

const IGNORED_FILES = new Set(['.DS_Store', 'Thumbs.db']);
const MAX_FILES = 20000;
const MAX_GREP_BYTES = 200 * 1024;
const MAX_ROUTE_HITS = 80;

const MANIFESTS = ['package.json', 'pnpm-workspace.yaml', 'turbo.json', 'nx.json', 'pyproject.toml', 'requirements.txt',
  'go.mod', 'Cargo.toml', 'Gemfile', 'pom.xml', 'build.gradle', 'build.gradle.kts', 'composer.json', 'Package.swift',
  'pubspec.yaml', 'mix.exs', 'Dockerfile', 'docker-compose.yml', 'docker-compose.yaml', 'compose.yaml', 'wrangler.toml',
  'vercel.json', 'netlify.toml', 'serverless.yml', 'Procfile', 'fly.toml'];

const JS_FRAMEWORKS = {
  next: 'Next.js', react: 'React', vue: 'Vue', nuxt: 'Nuxt', svelte: 'Svelte', '@sveltejs/kit': 'SvelteKit', astro: 'Astro',
  '@remix-run/react': 'Remix', 'solid-js': 'Solid', '@angular/core': 'Angular', 'react-native': 'React Native', expo: 'Expo',
  electron: 'Electron', vite: 'Vite', express: 'Express', fastify: 'Fastify', koa: 'Koa', hono: 'Hono', '@nestjs/core': 'NestJS',
  '@trpc/server': 'tRPC', graphql: 'GraphQL', 'socket.io': 'Socket.IO', prisma: 'Prisma', '@prisma/client': 'Prisma',
  'drizzle-orm': 'Drizzle', typeorm: 'TypeORM', mongoose: 'Mongoose', sequelize: 'Sequelize', knex: 'Knex',
  '@supabase/supabase-js': 'Supabase', firebase: 'Firebase', bullmq: 'BullMQ', ioredis: 'Redis', redis: 'Redis',
  stripe: 'Stripe', 'next-auth': 'NextAuth', '@clerk/nextjs': 'Clerk', zod: 'Zod', tailwindcss: 'Tailwind CSS',
  '@tanstack/react-query': 'TanStack Query', 'ai': 'Vercel AI SDK', '@anthropic-ai/sdk': 'Anthropic SDK', openai: 'OpenAI SDK',
  'commander': 'Commander CLI', yargs: 'yargs CLI', '@modelcontextprotocol/sdk': 'MCP SDK',
};

const TEXT_FRAMEWORKS = [
  { file: /^(pyproject\.toml|requirements.*\.txt)$/, pattern: /\b(fastapi|django|flask|sqlalchemy|celery|pydantic|alembic|typer|click|streamlit|langchain)\b/gi },
  { file: /^go\.mod$/, pattern: /\b(gin-gonic\/gin|labstack\/echo|gofiber\/fiber|go-chi\/chi|gorm\.io|sqlc|cobra)\b/gi },
  { file: /^Cargo\.toml$/, pattern: /^\s*(axum|actix-web|rocket|tokio|diesel|sqlx|clap|serde|tauri)\s*=/gim },
  { file: /^Gemfile$/, pattern: /\b(rails|sinatra|sidekiq|rspec)\b/gi },
  { file: /^(pom\.xml|build\.gradle(\.kts)?)$/, pattern: /\b(spring-boot|quarkus|micronaut|hibernate|ktor)\b/gi },
  { file: /^composer\.json$/, pattern: /\b(laravel\/framework|symfony)\b/gi },
];

const ROUTE_PATTERNS = [
  /\b(app|router|server|api)\.(get|post|put|patch|delete|all|route)\s*\(\s*['"`]/,
  /@(app|router|bp|api)\.(get|post|put|patch|delete|route)\s*\(/,
  /@(Get|Post|Put|Patch|Delete|Controller|RequestMapping|GetMapping|PostMapping)\s*\(/,
  /\bexport\s+(async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\b/,
  /\b(r|e|g|mux|router)\.(GET|POST|PUT|PATCH|DELETE|HandleFunc|Handle)\s*\(/,
  /\bpath\s*\(\s*['"][^'"]*['"]\s*,/,
  /\.route\s*\(\s*['"]\//,
];

const ROUTE_FILE_HINTS = [/\/api\//, /routes?\//, /controllers?\//, /handlers?\//, /\/pages\/api\//, /route\.(t|j)sx?$/, /urls\.py$/, /views\.py$/];

const DATA_HINTS = [/schema\.prisma$/, /drizzle.*schema/i, /\/migrations?\//, /models?\.(py|rb|go|ts)$/, /\/models\//, /\/entities\//, /\.sql$/, /supabase\/migrations/];

const ENTRY_CANDIDATES = ['src/index.ts', 'src/index.js', 'src/main.ts', 'src/main.tsx', 'src/main.js', 'src/app.ts', 'src/server.ts',
  'index.ts', 'index.js', 'server.js', 'server.ts', 'app.py', 'main.py', 'manage.py', 'main.go', 'cmd', 'src/main.rs', 'src/lib.rs',
  'app/layout.tsx', 'src/app/layout.tsx', 'pages/_app.tsx', 'src/pages/_app.tsx', 'App.tsx', 'src/App.tsx', 'lib/main.dart'];

const FRONTEND = new Set(['Next.js', 'React', 'Vue', 'Nuxt', 'Svelte', 'SvelteKit', 'Astro', 'Remix', 'Solid', 'Angular', 'Vite']);
const MOBILE = new Set(['React Native', 'Expo']);
const BACKEND = new Set(['Express', 'Fastify', 'Koa', 'Hono', 'NestJS', 'tRPC', 'fastapi', 'django', 'flask', 'gin-gonic/gin',
  'labstack/echo', 'gofiber/fiber', 'go-chi/chi', 'axum', 'actix-web', 'rocket', 'rails', 'sinatra', 'spring-boot', 'laravel/framework']);

function walk(root) {
  const files = [];
  const stack = [root];
  while (stack.length && files.length < MAX_FILES) {
    const dir = stack.pop();
    let entries = [];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue; // unreadable directory: skip, the scan is best-effort
    }
    entries.forEach((entry) => {
      if (entry.isSymbolicLink()) return;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!IGNORED_DIRS.has(entry.name)) stack.push(full);
      } else if (entry.isFile() && !IGNORED_FILES.has(entry.name)) {
        files.push(relative(root, full).split(sep).join('/'));
      }
    });
  }
  return files.sort();
}

function readSafe(path, limit = MAX_GREP_BYTES) {
  try {
    if (statSync(path).size > limit) return '';
    return readFileSync(path, 'utf8');
  } catch {
    return '';
  }
}

function languages(files) {
  const counts = files.reduce((acc, file) => {
    const ext = extname(file).toLowerCase();
    return ext ? { ...acc, [ext]: (acc[ext] || 0) + 1 } : acc;
  }, {});
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([ext, count]) => ({ ext, count }));
}

function topLevel(root, files) {
  const counts = files.reduce((acc, file) => {
    const [head, ...rest] = file.split('/');
    const key = rest.length ? `${head}/` : head;
    return { ...acc, [key]: (acc[key] || 0) + 1 };
  }, {});
  return Object.entries(counts).map(([path, fileCount]) => ({ path, files: fileCount }));
}

function packageFacts(root, files) {
  const pkgFiles = files.filter((f) => basename(f) === 'package.json' && f.split('/').length <= 4);
  const frameworks = new Set();
  const scripts = [];
  pkgFiles.forEach((file) => {
    let pkg;
    try {
      pkg = JSON.parse(readSafe(join(root, file)));
    } catch {
      return; // malformed package.json: report nothing rather than guess
    }
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    Object.keys(deps).forEach((dep) => { if (JS_FRAMEWORKS[dep]) frameworks.add(JS_FRAMEWORKS[dep]); });
    Object.entries(pkg.scripts || {}).slice(0, 15).forEach(([name, command]) => scripts.push({ package: file, name, command }));
  });
  return { frameworks, scripts };
}

function textFrameworks(root, files, frameworks) {
  files.filter((f) => f.split('/').length <= 3).forEach((file) => {
    const rule = TEXT_FRAMEWORKS.find((r) => r.file.test(basename(file)));
    if (!rule) return;
    const content = readSafe(join(root, file));
    [...content.matchAll(rule.pattern)].forEach((m) => frameworks.add(m[1].toLowerCase()));
  });
  return frameworks;
}

function routes(root, files) {
  const hits = [];
  const candidates = files.filter((f) => /\.(m?[jt]sx?|py|go|rb|java|kt|php|rs|cs)$/.test(f));
  const prioritised = [...candidates.filter((f) => ROUTE_FILE_HINTS.some((r) => r.test(`/${f}`))),
    ...candidates.filter((f) => !ROUTE_FILE_HINTS.some((r) => r.test(`/${f}`)))];
  for (const file of prioritised) {
    if (hits.length >= MAX_ROUTE_HITS) break;
    const lines = readSafe(join(root, file)).split('\n');
    lines.forEach((line, i) => {
      if (hits.length < MAX_ROUTE_HITS && ROUTE_PATTERNS.some((p) => p.test(line))) {
        hits.push({ file: `${file}:${i + 1}`, line: line.trim().slice(0, 140) });
      }
    });
  }
  const fileRoutes = files.filter((f) => /(^|\/)app\/.*\/route\.(t|j)sx?$|(^|\/)pages\/api\//.test(f));
  return { handlers: hits, fileRoutes: fileRoutes.slice(0, 60) };
}

function envKeys(root, files) {
  const examples = files.filter((f) => /(^|\/)\.env\.(example|sample|template)$|(^|\/)\.env\.local\.example$/.test(f));
  const keys = new Set();
  examples.forEach((file) => readSafe(join(root, file)).split('\n').forEach((line) => {
    const match = line.match(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]+)\s*=/);
    if (match) keys.add(match[1]); // names only — values are never read into the scan
  }));
  return { files: examples, keys: [...keys].sort() };
}

function suggestPreset(frameworks, routeFacts, dataFiles) {
  const has = (set) => [...frameworks].some((f) => set.has(f));
  const hasApi = has(BACKEND) || routeFacts.handlers.length > 0 || routeFacts.fileRoutes.length > 0;
  if (has(MOBILE)) return 'mobile-app';
  if (has(FRONTEND) && (hasApi || dataFiles.length > 0)) return 'fullstack-web';
  if (has(FRONTEND)) return 'frontend-spa';
  if (hasApi) return 'backend-api';
  return 'library-cli';
}

/**
 * Collect navigation facts about a repository.
 * @param {string} root absolute or relative path to the repo
 * @returns {object} facts for an agent to verify, never to copy blindly
 */
export function scanRepo(root) {
  if (!existsSync(root) || !statSync(root).isDirectory()) {
    throw new Error(`scan failed: "${root}" is not a directory`);
  }
  const files = walk(root);
  const { frameworks, scripts } = packageFacts(root, files);
  textFrameworks(root, files, frameworks);
  const routeFacts = routes(root, files);
  const dataFiles = files.filter((f) => DATA_HINTS.some((r) => r.test(`/${f}`))).slice(0, 60);
  return {
    name: basename(root.replace(/\/$/, '')) || 'repo',
    fileCount: files.length,
    truncated: files.length >= MAX_FILES,
    topLevel: topLevel(root, files),
    languages: languages(files),
    manifests: files.filter((f) => MANIFESTS.includes(basename(f)) && f.split('/').length <= 4),
    frameworks: [...frameworks].sort(),
    entrypoints: ENTRY_CANDIDATES.filter((c) => existsSync(join(root, c))),
    routes: routeFacts,
    dataFiles,
    env: envKeys(root, files),
    scripts,
    docs: files.filter((f) => /(^|\/)(README|ARCHITECTURE|CONTRIBUTING|ADR|docs\/).*/i.test(f) && f.split('/').length <= 3).slice(0, 30),
    suggestedPreset: suggestPreset(frameworks, routeFacts, dataFiles),
  };
}
