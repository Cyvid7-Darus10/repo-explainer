# UX principles

Why the page is shaped like a lesson rather than a wiki.

1. **Guide, then let them explore.** A sandbox of boxes and arrows is not an explanation, because readers need to be led to the interesting part. Every chapter opens with one sentence telling the reader what to do. The flow player walks the request one hop at a time; the map is there to explore afterwards. *(After Bret Victor's "Explorable Explanations" and Red Blob Games' critique of sandbox widgets.)*
2. **Readable without interacting.** All content is visible as normal text. Interaction adds focus but never hides the only copy of a fact.
3. **Start broad, zoom on demand.** The map is the C4 "container" level. Selecting a node zooms to its files, neighbours and the flows it appears in. Flows go down to `file:line`. *(After the C4 model's context → container → component levels.)*
4. **One idea per screen.** Each step shows one hop, one sentence of what happens, and an optional "why". Concepts are a carousel, one card at a time. *(After Brilliant's lesson pacing.)*
5. **Immediate feedback.** Quiz answers grade instantly, with the reason. Finishing a flow shows a trophy and offers the next flow.
6. **Never trap the scroll.** Diagrams scroll sideways only, so the page always moves with the wheel. Sticky headers and the sticky step card keep context without inner vertical scroll areas.
7. **Change is a first-class chapter.** When humans and agents land dozens of merges a day, "what is this system?" is only half the question. The other half is "what moved since I last looked, and why?". Each change is tied to the map ("Show on map") so readers update their mental model rather than reading a log.
8. **Calm motion.** Motion only shows change: an arrow draws in, a dot travels once, a card slides in from the direction you moved. No loops except the selected-edge flow, which shows direction. Reduced-motion users get none of it.

## Sources

- Bret Victor, *Explorable Explanations*: https://worrydream.com/ExplorableExplanations/
- Red Blob Games, notes on interactive explanations: https://redblobgames.com/x/2306-educ432
- C4 model overview: https://codesee.io/learning-center/c4-diagram
- Explorable explanation (overview): https://en.wikipedia.org/wiki/Explorable_explanation
