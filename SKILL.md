---
name: repo-explainer
description: 'Turn a codebase into a guided, interactive HTML tour: architecture map, step-through end-to-end flows with file:line citations, data model, and a "what changed and why" timeline of recent human and agent merges. Use when someone asks to explain, onboard onto, map, document, or catch up on a repository (backend, frontend, full-stack, mobile, library or CLI), or to show how a request flows end to end.'
---

# Repo Explainer

You produce **one self-contained HTML file** that teaches a repo the way Brilliant teaches math: one idea at a time, with interactive diagrams and a big Continue button.

**You only write data.** The design, components, icons, animation and layout are finished and tested. Your job is to investigate the repo and fill `explainer.json` with true, cited facts. The CLI turns that into the page.

`SKILL_DIR` below means the folder this file is in. Run the CLI with `node "$SKILL_DIR/bin/repo-explainer.mjs" <command>` (Node 18.3+, no install step).

## Workflow

Copy this checklist into your todo list and work through it in order.

0. **(Optional) Check the cost.** `repo-explainer estimate <repo>` prints a rough per-model cost for this repo's size.
1. **Scan.** Run `repo-explainer scan <repo>`. It gives you facts to verify, not conclusions: stack, entry points, route handlers, data files, env var *names*, scripts, and a suggested preset.
2. **Pick a preset.** Run `repo-explainer presets` and take the suggestion unless it is clearly wrong. Each preset fixes the layers, the chapter order, the flows you must trace and the questions you must answer. See `presets/<id>.json`.
3. **Start the data file.** Run `repo-explainer init <repo> --preset <id> --out <repo>/.explainer/explainer.json`. Every `TODO` in it is deliberate.
4. **Investigate.** Follow `references/investigation-playbook.md`. Read the entry points, then trace each `mustTrace` flow through the real code, one call at a time. Write down `file:line` as you go.
5. **Fill the data** using `references/data-schema.md`. Start each flow from a pattern: run `repo-explainer patterns`, then `repo-explainer patterns <id>`, copy its steps, and rename its roles to your node ids.
6. **Draft the changes chapter.** Run `repo-explainer changes <repo> --data <file> --write --since "14 days ago"`. Add `--merges` when the repo merges PRs, and `--remote https://github.com/<o>/<r>` for links. Then replace each `why` TODO with the reason from the PR description, linked issue or commit body. If you cannot find a reason, say "No reason recorded". **Never invent one.**
7. **Build with file checks.** Run `repo-explainer build <file> --repo <repo> --strict`. Fix every error and warning, since `--strict` fails on warnings too. `--repo` proves every cited path exists.
8. **Look at it.** Open the HTML (add `--open`, or use a browser tool). Click a node, step through every flow to the trophy, answer the quiz, and narrow the window to phone width. Fix the data, not the template.
9. **Hand off.** Report the output path, the flows you traced, and anything you could not verify.

## Brand and UX guardrails (non-negotiable)

The look is a deliberate system: a Duolingo-style palette inside a Brilliant-style lesson flow. Consistency across every repo's explainer is the point, so treat these as hard rules:

- **Do not edit** `template/`, `styles.css`, the icons, the tokens or the layout to make one explainer "fit". If something does not fit, change the data: shorter labels, fewer actors, a split flow. If the template is genuinely missing something, stop and say so. That is a template change for a maintainer and a separate PR.
- **Do not add** CSS, `<style>`, inline styles, scripts, fonts, emoji icon sets, images, gradients, shadows, extra colors or extra border radii. No custom HTML in any string either: everything renders as plain text by design.
- **Do not hand-write the HTML or draw your own diagrams.** Every visual comes from the data. Need an icon? Set `kind` to a name in `assets/icons/`. Need a color? Set the layer `color` to one of `green, blue, navy, midnight, yellow, pink`. Need the logo? Use `assets/logo/`. To see everything available, run `repo-explainer gallery`.
- **Respect the shape of a lesson:**
  - **One idea per step.** A step `label` is a short action (≤ 6 words, e.g. "Checks the session"). A `detail` is at most 2 sentences.
  - **4–12 steps per flow.** More than that means splitting it into two flows.
  - **3–7 actors per flow, and 4–8 layers on the map.** More than that means grouping them.
  - **Labels:** node labels ≤ 3 words, layer labels ≤ 2 words, edge labels ≤ 3 words.
  - **Concepts:** 3–6, each with an `analogy` when one exists.
  - **Quiz:** 3–5 questions. Each asks "where would you change X" or "why does Y happen", never trivia. `explain` says why the answer is right.
- **Accessibility is already handled.** It covers keyboard support, reduced motion, focus rings and contrast. Don't route around it: no text in place of icons, no meaning carried by color alone in your copy ("the green box" → "the Task service").

## How to write: gist first, no padding

A reader should get the idea from the first five words. Write like you are explaining it to a teammate at a whiteboard.

1. **Lead with the point.** Say what happens, then (if needed) one detail. Not "This step is responsible for handling the validation of…" but "Rejects bad input with a 422."
2. **One idea per sentence, about 15 words or fewer.** Two sentences max per `detail`.
3. **Use plain words.** Say "checks", not "performs verification of". Say "saves", not "persists the entity". Say "uses", not "leverages".
4. **Name real things.** Say "`createTask()` in the task service", not "the relevant business logic".
5. **No dashes as punctuation.** That means no em dash, no en dash, and no spaced hyphen. Split into two sentences, or use a colon or comma. (`validate` warns on these.)
6. **No filler.** Cut "basically", "simply", "it's worth noting", "in order to", "various", and "robust/seamless/powerful".
7. **Present tense, sentence case, and "you" for the reader.** No exclamation marks; the trophy screen already has one.
8. **`why` answers "why this way?"** in one sentence, naming the cost it avoids. Example: "Email can take seconds; queuing keeps the click under 100 ms."

| Instead of | Write |
|---|---|
| "The middleware layer is responsible for performing authentication checks — ensuring users are logged in." | "Checks the session. No session means a 401." |
| "Leverages a queue-based architecture in order to asynchronously process emails." | "Puts the email on the queue. The worker sends it." |
| "This is basically where the various business rules live." | "All business rules live here." |

## Truthfulness rules

- **Cite everything.** Every node lists its `files`. Every flow step has a `file` (`path:line`). `--repo` must pass.
- **Read before you claim.** The scan only tells you where to look. Never describe code you have not opened.
- **The why is the point of a change entry.** Take it only from the PR, issue or commit. Keep `authorType` from the collector (`agent` / `human`) unless the history clearly shows otherwise.
- **Never copy secrets.** Use env var names only, never values. Do not put credentials, tokens, internal hostnames or customer data in any field.
- **When unsure, say so** in the step `detail` (e.g. "Retries appear to be 3. Set in queue.ts, not verified at runtime.").

## Reuse map

| Need | Use | Never |
|---|---|---|
| A component box | `nodes[]` with `kind` | an image or custom SVG |
| An arrow between parts | `edges[]` (`kind: async` for dashed) | prose like "A → B" |
| A request flow | `flows[]`, started from `patterns/*.json` | a hand-made sequence diagram |
| Why something is built that way | `step.why`, `concept.analogy` | a long `detail` |
| Recent work | `repo-explainer changes` → `changes[]` | a pasted git log |
| Folder guide | `tree[]` (`key: true` for hot spots) | a full file listing |
| Logo, icons, palette | `assets/`, `repo-explainer gallery` | redrawing or recoloring |

## Updating an existing explainer

For a repo that already has one (e.g. `.explainer/explainer.json`):

1. Run `changes --write` to append new merges.
2. Fill in each new `why`.
3. Re-check any node or flow whose cited files appear in those changes.
4. Bump `meta.generatedAt` and `meta.commit`.
5. Rebuild with `--strict`.

Keep the JSON in the repo so the next agent updates it instead of starting over.

## References

- `references/data-schema.md`: every field, its limits and an example.
- `references/investigation-playbook.md`: how to trace flows in each kind of stack.
- `references/design-system.md`: tokens and the reasoning behind each rule (read-only context).
- `references/ux-principles.md`: why the page is built as a guided lesson.
- `examples/taskflow.explainer.json`: a complete, valid example to imitate.
