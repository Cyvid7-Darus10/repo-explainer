# Investigation playbook

Goal: a reader who finishes the explainer can answer "where would I change X?" for the repo's core behaviour. Get there by tracing real calls, not by summarising folder names.

## 1. Orient (10 minutes)

1. Run `repo-explainer scan <repo>` and read the output top to bottom.
2. Read the README, any `ARCHITECTURE.md` or ADRs, and `CONTRIBUTING.md`. Note what they *claim*, then verify it.
3. Open every manifest in `scan.manifests`. The dependencies tell you the moving parts.
4. List the deployable units: apps, services, workers, and cron. Each one usually becomes one or more nodes.

## 2. Draw the map first

- **Nodes are runtime responsibilities, not folders.** "Auth middleware", not `src/middleware/`.
- **Aim for 6–14 nodes.** If you have more, group them; if fewer, you are probably hiding the interesting part.
- **Edges are calls, reads/writes, or messages,** and each gets a label naming the call ("createTask()", "enqueue", "webhook").
- **Put external services in their own layer** so readers see where the system boundary is.

## 3. Trace each flow call by call

Start at the trigger (a click, an HTTP route, a cron, a webhook, a CLI command). Then repeat:

1. Open the file and find the exact line that hands off to the next part.
2. Record `{from, to, label, file:line}`.
3. Follow the call into the next file.

Stop when the response returns or the side effect lands.

Where to find the next hop:

| Stack | Entry | Next hop is usually |
|---|---|---|
| Next.js / Remix / SvelteKit | `app/**/page.tsx`, `route.ts`, server actions, `middleware.ts` | an imported service, ORM call, or `fetch` |
| Express / Fastify / Hono / Nest | `app.get(…)`, `@Get()`, router files | middleware chain → controller → service |
| FastAPI / Django / Flask | `@router.get`, `urls.py` → `views.py` | dependency-injected service, ORM model |
| Go (net/http, gin, chi, echo) | `main.go` route registration | handler → service interface → repository |
| Rails / Laravel | `routes.rb` / `routes/web.php` | controller action → model / job |
| SPA (React/Vue) | router config → page component | data hook (`useQuery`, store action) → API client |
| Mobile | app entry → navigator → screen | view model → repository → network/local DB |
| Queue workers | worker bootstrap, `process()`/`perform` | job handler → service → external API |
| CLI / library | `bin` in package.json, `main()`, exported index | arg parser → command → core |

Include the **error path** once per flow (validation failure, auth failure, retry), as a step or in a `detail`.

## 4. Find the "why"

Look in commit messages, PR descriptions, ADRs, and comments near unusual code, especially comments containing `because`, `workaround` or `NOTE`. Put a reason in `step.why` only when you found it or it follows directly from the code (e.g. "verifies the signature so events can't be forged"). Don't speculate.

## 5. Changes chapter

1. Run `repo-explainer changes <repo> --data <file> --write`. Narrow the window with `--since` if the repo is busy; 20 merges a day means 2–3 days is plenty.
2. For each entry, open the PR or commit and write `why` in one or two sentences. Add `risk` when the change touches money, auth, data deletion, or concurrency.
3. Drop noise: lockfile bumps, formatting, bot version bumps (unless they matter).

## 6. Check yourself before building

- [ ] Every node has `files`, and every step has `file:line`.
- [ ] Each flow reads correctly as a story when you only read the step labels.
- [ ] Quiz answers are findable from the explainer itself.
- [ ] No env values, tokens, or customer data anywhere.
- [ ] `build --repo <repo> --strict` passes.
