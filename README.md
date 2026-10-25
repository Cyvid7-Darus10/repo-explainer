<p align="center">
  <img src="assets/logo/lockup.svg" alt="Repo Explainer" height="56">
</p>

<p align="center"><b>An agent skill that turns any codebase into a guided, interactive tour.</b><br>
Architecture map. Step-through end-to-end flows with <code>file:line</code> on every hop. A timeline of what changed and <i>why</i>.</p>

<p align="center">
  <a href="LICENSE"><img alt="MIT license" src="https://img.shields.io/badge/license-MIT-58cc02"></a>
  <img alt="Node 18.17+" src="https://img.shields.io/badge/node-%E2%89%A518.17-1cb0f6">
  <img alt="Zero dependencies" src="https://img.shields.io/badge/dependencies-0-042c60">
</p>

<p align="center"><img src="docs/media/demo.gif" alt="Stepping through a Repo Explainer tour: the hero, the architecture map, a request flow, what changed, the data model and a quiz" width="860"></p>

---

## Why this exists

A year ago you could understand a repo by reading it. A few people wrote the code, you knew who to ask, and the history told a story.

That is not how repos work any more. On a busy team, **20 or more merge requests land every day**. Some come from engineers; many come from coding agents running in parallel, each opening PRs on its own branch. The code still compiles, the tests still pass, but nobody holds the whole picture in their head:

- **What is new?** Yesterday's mental model is already out of date.
- **Why was it added?** The reason lives in a PR description nobody will read again.
- **Who changed it?** A person who can explain it, or an agent that cannot be asked?
- **How does a request actually flow now?** The architecture diagram in the wiki is from last quarter.

Reading diffs doesn't scale, and neither do wikis. What does scale is having an agent do the reading and then *teach* the result, the way a good lesson does: one idea at a time, with diagrams you can poke at and every claim pointing to a real line of code.

That is Repo Explainer. You point your agent at a repo, and it gives you a single HTML page that:

1. **Maps the system.** Every part is a box you can tap to see what it does, which files hold it, and who it talks to.
2. **Walks you through it end to end.** Each request is a sequence diagram you step through with a big Continue button, and every hop cites `file:line`.
3. **Shows what changed and why.** Recent merges are grouped by human and agent, each with its reason, and **Show on map** lights up the parts that moved.
4. **Explains the data.** An ER diagram with cardinality, and a clear field table for each entity.
5. **Checks understanding.** "Where would you change X?" questions with instant feedback.

Re-run it tomorrow and it only has to read the new merges.

## What it looks like

| | |
|---|---|
| <img src="docs/media/hero.png" alt="Hero with the request route illustrated"> | <img src="docs/media/map.png" alt="Architecture map with a selected node and its connections"> |
| **Start:** a reading-time estimate and the main route at a glance | **The big picture:** tap a part to see its files, neighbours and flows |
| <img src="docs/media/flow.png" alt="Sequence diagram with the current step highlighted beside a step card"> | <img src="docs/media/changes.png" alt="Timeline of recent changes by agents and humans with reasons"> |
| **End to end:** one hop at a time, with the code that does it | **What changed and why:** agent vs human, the reason, and the risk |
| <img src="docs/media/data.png" alt="Entity relationship diagram with cardinality and a field table"> | <img src="docs/media/quiz.png" alt="Quiz question answered correctly with an explanation"> |
| **The data:** relationships first, then fields | **Check yourself:** instant feedback, with the why |

Open [`examples/taskflow.html`](examples/taskflow.html) for the full interactive example, and [`examples/gallery.html`](examples/gallery.html) for every icon, color and component.

## Quick start

### As a Claude Code skill

```sh
git clone https://github.com/Cyvid7-Darus10/repo-explainer ~/.claude/skills/repo-explainer
```

Then ask:

> Explain this repo for a new engineer. Trace sign-in and checkout end to end, and include what changed this week.

The agent follows [`SKILL.md`](SKILL.md): it scans, picks a preset, traces flows through the real code, fills `explainer.json`, and builds the page. It works the same in any agent that can read a skill file and run Node.

### By hand (or from CI)

```sh
npx github:Cyvid7-Darus10/repo-explainer scan ./my-repo          # facts to start from
npx github:Cyvid7-Darus10/repo-explainer init ./my-repo          # starter explainer.json
npx github:Cyvid7-Darus10/repo-explainer changes ./my-repo --data explainer.json --write --merges
npx github:Cyvid7-Darus10/repo-explainer build explainer.json --repo ./my-repo --strict --open
```

No install and no dependencies. Node 18.17+ is all it needs. The output is **one self-contained HTML file** you can commit, attach to a PR, or host anywhere.

## Commands

| Command | What it does |
|---|---|
| `scan <repo>` | Stack, entry points, route handlers (`file:line`), data files, env var **names** (never values), scripts, and a suggested preset |
| `estimate [repo]` | Rough agent cost per run, per model, for this repo's size |
| `init <repo> [--preset id]` | A starter `explainer.json` with deliberate `TODO`s |
| `changes <repo> [--data f --write]` | Drafts change entries from git: human or agent, kind, PR link, touched parts |
| `validate <file> [--repo d] [--strict]` | Checks references, lesson shape, writing style, and that every cited file exists |
| `build <file> [--out f] [--repo d]` | Validates, then renders the page |
| `presets` / `patterns [id]` | Repo-type presets, and reusable flow patterns (auth, webhook, async job, cache…) |
| `gallery` / `assets` | The design kit page, and the logo and icon SVGs |

## What a run costs

The agent does the expensive part: reading code and writing the explainer. Typical cost **per run** at [Anthropic API list prices](https://claude.com/pricing) (checked 2026-10-25):

| Run | Fable 5.1 | Opus 5.5 | Sonnet 5.5 | Haiku 5.5 |
|---|---|---|---|---|
| Update (new merges only) | $0.95 | $0.44 | $0.22 | $0.014 |
| Small repo (< 300 source files) | $1.60 | $0.74 | $0.37 | $0.024 |
| Medium repo (300 to 2,000 files) | $3.65 | $1.82 | $0.91 | $0.32 |
| Large repo (2,000+ files) | $9.50 | $5.00 | $2.50 | $0.93 |

**What to pick:**
- **Sonnet 5.5** is the sensible default.
- **Opus 5.5** is worth it for large or unfamiliar systems, where tracing quality matters most.
- **Haiku 5.5** is great for the daily "what changed" refresh.

How the numbers are built:
- **They are estimates, not quotes.** They assume most re-sent context is served from the prompt cache, as Claude Code does by default.
- **Real cost varies.** It depends on how many flows you ask for, how much code the agent reads, and how many fix-and-rebuild rounds it takes.
- **Get a number for your own repo** with `repo-explainer estimate ./my-repo`. To see what a run actually cost, use `/cost` in Claude Code.
- **Subscriptions are different.** On a Claude subscription, usage counts against your plan rather than per-token billing.

The token profiles and prices live in [`scripts/lib/estimate.mjs`](scripts/lib/estimate.mjs).

## How it stays consistent

Agents only write **data**. The design, components, icons, motion and layout are fixed and tested, so every repo's explainer looks and behaves the same, and readers learn the visual vocabulary once.

- **One data contract** ([`references/data-schema.md`](references/data-schema.md)), validated on every build.
- **Presets** for full-stack, backend API, frontend, mobile, and library/CLI repos. Each fixes the layers, chapter order, flows to trace and questions to answer.
- **Flow patterns** so agents start from a proven shape instead of a blank page.
- **Writing rules** (gist first, short sentences, no dashes, no filler), enforced with warnings.
- **Brand guardrail tests** that fail CI on shadows, gradients, off-palette colors, extra radii, or `innerHTML`.
- **Truthfulness:** every node and step cites real files, and `--repo` proves they exist. Change reasons come from PRs and commits, never invented.

## Security and privacy

- **The scanner never reads secret values.** It takes only env var names from `.env.example` files, never `.env`.
- **Rendering cannot inject code.** All repo-derived text is rendered as text (no `innerHTML`), and embedded data is escaped so it cannot break out of its script tag.
- **Pages don't phone home.** The generated page makes no network requests except Google Fonts, and falls back to system fonts offline.

See [SECURITY.md](SECURITY.md) to report a vulnerability.

## Credits

- **Visual design:** the palette, type scale, 12px radius and pressable thick-bottom-border buttons follow **[Duolingo](https://www.duolingo.com)**'s design language, including its color names (Ecto Green, Macaw Blue, Eel, Lingot). Thank you, Duolingo design team.
- **Lesson format:** one idea per step with a Continue button is inspired by **[Brilliant](https://brilliant.org)**.
- **Explanation design:** informed by Bret Victor's *[Explorable Explanations](https://worrydream.com/ExplorableExplanations/)*, Red Blob Games, and the C4 model. See [`references/ux-principles.md`](references/ux-principles.md).

Repo Explainer is independent and **not affiliated with or endorsed by Duolingo or Brilliant**. It ships none of their logos, mascots, illustrations or fonts. Type is [Nunito](https://fonts.google.com/specimen/Nunito) and [JetBrains Mono](https://www.jetbrains.com/lp/mono/), and the icons are original.

## Contributing

Issues and PRs are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md). Run `npm run check` before opening a PR.

## License

[MIT](LICENSE) © Cyrus David Pastelero
