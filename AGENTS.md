## Project rules
- No real people, names or employee data. Heroes are fictional archetypes of a distributed team.
- Every case must have exactly one solution, be solvable by `logicSolve` without brute force, and yield the story's culprit (`engine.test.ts`). After changing a layout or clue text: `bun run gen`, then `bun run test`.
- Clues are plain language, no developer-only jargon. Jokes work for anyone in tech.
- Progress lives only in localStorage, no backend. No external CDNs: Manrope via @fontsource, textures drawn on canvas.
- UI theme: NORDVIA "Polar Night" — deep navy glass, Nordic blue primary (#2F6BFF), aurora teal (#3EE0B4), gold (#FFC857).
- World events run on timers: reindeer every 35–65 s, aurora episodes, shooting stars, a festive halt roughly every 2 min, Santa every 30–50 s (not during a case).
- Route landmarks appear by their `at` mark along ROUTE_TOTAL; forest is cleared inside them by the shader.
