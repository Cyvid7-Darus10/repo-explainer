# Data schema (`explainer.json`)

One JSON file drives the whole page. The enforced contract is `scripts/lib/schema.mjs` + `scripts/lib/validate.mjs`; this page explains it. A complete example lives at `examples/taskflow.explainer.json`.

Every string is rendered as **plain text**: markup is rejected, and newlines only matter inside `code`.

## `meta` (required)

| Field | Type | Notes |
|---|---|---|
| `title` | string, **required** | `"<Repo>, explained"` reads well. |
| `summary` | string, **required** | Two plain sentences: what it does and for whom. |
| `repo` | string | `owner/name`. |
| `stack` | string[] | ≤ 8 chips, e.g. `"Next.js 15"`. |
| `preset` | string | The preset id you used. |
| `chapters` | string[] | The order of chapters, from `map, flows, changes, tree, data, concepts, quiz, glossary, run`. Chapters with no data are skipped automatically. |
| `generatedAt` | ISO date | Shown in the footer. |
| `commit` | string | The SHA the explainer describes. |

`intros` (optional) overrides a chapter's heading or lead: `{ "flows": { "title": "…", "lead": "…" } }`.

## `layers` (required, 1–8)

`{ id, label, color }`. Layers become the map's columns, from left to right in array order, so order them by distance from the user. `color` is one of `green, blue, navy, midnight, yellow, pink`.

## `nodes` (required)

`{ id, label, layer, kind, tech?, summary, files[] }`

- `kind` is one of `user, ui, mobile, api, service, db, queue, cache, external, job, cli, auth, storage, library`, and picks the icon (see the gallery).
- `files` holds paths or folders that exist (`--repo` checks this). Folders end in `/`.
- Keep `label` to 3 words or fewer and `summary` to one sentence.

## `edges`

`{ from, to, label?, kind? }`. `kind`: `sync` (default, solid), `async` (dashed) or `data`. Selecting a node animates only its own edges, so a dense graph stays readable.

## `flows`: the core chapter

`{ id, title, trigger, summary, steps[] }`, with 4–12 steps and at most 7 distinct actors.

Each step is `{ from, to, label, kind, detail?, why?, file, code?, lang? }`:

| Field | Notes |
|---|---|
| `from`, `to` | Node ids. When they are the same, the step is drawn as a self-loop (internal work). |
| `kind` | `request`, `response` (dashed), `async` (dashed), `data` or `internal`. |
| `label` | ≤ 6 words, an action: "Checks the session". |
| `detail` | ≤ 2 sentences: what happens. |
| `why` | Optional. The design reason, shown as a green callout. Use it sparingly, where a reader would ask "why like this?" |
| `file` | `path:line`. Required in practice: it is a warning without it, and an error under `--strict`. |
| `code` | Optional. ≤ 8 lines of the real code at that line, trimmed. |

## `changes`: what changed and why

`{ id, title, date, author, authorType, ref, url?, kind, what, why, risk?, nodes[], files[] }`

- Draft these with `repo-explainer changes`. It fills `authorType` (`agent` / `human`, detected from author names and `Co-Authored-By` trailers), `kind` (from conventional-commit prefixes), `files`, and `nodes` (mapped through each node's `files`).
- **You** fill in `why` from the PR description, linked issue or commit body. If there is none, write "No reason recorded".
- `risk` is optional: what could break, or what to watch.

## `tree`

`{ path, note, key? }`. Indentation comes from path depth. Mark the 2–4 folders where most changes happen with `key: true`.

## `dataModel`

`{ name, summary?, fields: [{ name, type, note?, ref? }], relations: [{ to, kind }] }`, where `to` is another model's `name`.

- The chapter draws an ER diagram from `relations`. Use `kind` values `has many`, `has one`, `belongs to` or `many to many`, so the lines get 1 / N cardinality. List each pair once; the mirror relation is merged.
- `id` is marked PK. A field is marked FK when it is named `<model>Id` or `<model>_id`, or when you set `ref` to the model name (e.g. `assigneeId` with `ref: "User"`). Ids of outside systems, like `stripeCustomerId`, are not FKs.

## `concepts` (3–6)

`{ title, body, analogy?, file?, code?, lang? }`. One idea each.

## `quiz` (3–5)

`{ question, options[], answer, explain }`, where `answer` is the zero-based index. Ask "where would you change X?" or "why does Y happen?".

## `glossary`, `runbook`

- `glossary`: `{ term, definition }`.
- `runbook`: `{ label, command, note? }`. Commands get a Copy button.
