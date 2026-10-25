# Contributing

Thanks for helping. This project has two audiences, people and agents, and one rule that keeps them happy: **explainers change data, maintainers change the template.**

## Setup

```sh
git clone https://github.com/Cyvid7-Darus10/repo-explainer
cd repo-explainer
npm run check        # tests + rebuild the example and gallery
```

No dependencies to install. Node 18.17 or newer.

## Where things live

| Path | What |
|---|---|
| `SKILL.md` | Instructions agents follow. Keep it short and imperative. |
| `bin/repo-explainer.mjs` | The CLI. |
| `scripts/lib/` | Scan, validate, build, changes, estimate. Plain ES modules. |
| `template/` | The page: `explainer.html`, `styles.css`, and `js/` modules (concatenated at build time). |
| `presets/`, `patterns/` | Repo-type presets and reusable flow shapes (JSON). |
| `references/` | Schema, playbook, design system, UX principles. |
| `test/` | `node:test` suites, including brand guardrails. |

## Pull requests

- Use conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.
- One logical change per PR. In the description, explain **why**.
- Add or update tests for behaviour changes.
- **Visual changes:** include a before/after screenshot, and check that it still feels right at 375px wide with reduced motion on.
- **Design-system changes** (tokens, radii, colors, motion) must update `references/design-system.md` and `test/brand.test.mjs` in the same PR.
- **New presets or patterns** must pass `test/scan.test.mjs`, which checks they are internally consistent.

## Writing style

Docs and UI copy follow the same rules as explainers: gist first, short sentences, plain words, no dashes as punctuation, no filler.
