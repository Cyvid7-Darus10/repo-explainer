# Design system

> **Credit.** The visual language (palette, type scale, 12px radius, and the thick-bottom-border "pressable" buttons) follows **Duolingo**'s design language, including its color names (Ecto Green, Macaw Blue, Eel, Lingot). The one-idea-per-step lesson flow with a Continue button is inspired by **Brilliant**. Repo Explainer is an independent open-source project, not affiliated with or endorsed by Duolingo or Brilliant. It ships no Duolingo or Brilliant logos, mascots, illustrations or fonts: the type is Nunito, and the icons are original.

This page is **read-only context for agents**. The tokens live in `template/styles.css`, and explainers never override them.

## Tokens

| Token | Value | Use |
|---|---|---|
| `--color-ecto-green` | `#58cc02` | Primary buttons, display headings, the current step |
| `--color-ecto-green-dark` | `#58a700` | Bottom border of green buttons (the press effect) |
| `--color-eel-light` | `#d7ffb8` | Correct-answer wash, callouts, done-step badges |
| `--color-lingot-lime` | `#a5ed6e` | **Outline only.** Active pills, callout borders. Never a fill. |
| `--color-macaw-blue` | `#1cb0f6` | Secondary actions, links, focus ring, active edges |
| `--color-eel-dark-blue` | `#042c60` | Headings and labels |
| `--color-midnight` | `#000437` | Code blocks |
| `--color-charcoal` / `--color-ash` | `#4b4b4b` / `#777` | Body text / secondary text |
| `--color-swan` / `--color-polar` | `#e5e5e5` / `#f7f7f7` | Borders and inactive states / soft washes |
| `--color-bee`, `--color-pink` | `#ffc800`, `#ff86d0` | Illustration accents and layer colors only |
| `--color-cardinal` | `#ff4b4b` | Wrong quiz answers, **only** |

**Type.** Nunito 500/700/800/900 (with JetBrains Mono for code) and letter-spacing `0.053em`. Display headings are Nunito 900 with `-0.02em` tracking, always 28px or larger.

**Shape.** One radius, 12px (pills use 999px only for progress bars and dots). Borders are 2px, and pressable elements get a 4px bottom border that collapses to 2px when pressed.

## Rules and their reasons

| Rule | Why |
|---|---|
| No box-shadows | Depth comes from borders. Shadows read as a different product and blur at small sizes. |
| No gradients | Flat color keeps diagrams legible and the palette recognizable. |
| One accent per meaning | Green = progress/correct, blue = navigate/select, cardinal = wrong. Adding colors dilutes the signal. |
| Layer colors come from a fixed set of 6 | Keeps every repo's map consistent, so readers can learn the visual vocabulary once. |
| Icons by `kind` only | One family of flat illustrations. Mixed icon styles look broken. |
| Motion is short (200–500ms), eases out, plays once | It explains change (a step advancing, a reveal) instead of decorating. Everything respects `prefers-reduced-motion`. |
| Text is plain | It prevents XSS from repo content and stops one-off restyling. |

## Guardrail tests

`test/brand.test.mjs` fails the build if the stylesheet gains a `box-shadow`, a gradient, a color outside the token list, or a border radius other than 12px, 8px (tags), 6px (kbd) or 999px (dots/bars). Change the tests only together with this document, in a dedicated PR.
