# The Nordic Christmas Express · NORDVIA

A 3D holiday team game for **NORDVIA** (MobilityTech, Helsinki · 350–500 people, distributed team).
A retro train crosses winter Finland from **Helsinki to Rovaniemi**; each of the five cars holds a logic
mystery (murdoku-style). One case opens per working day, Dec 21–25. Characters are fictional archetypes.

**HR goal:** bring a distributed team together, strengthen company culture and engagement —
everyone plays from wherever they work, compares times and collects ticket pieces for a shared finale.

## Features
- Real-time 3D world (three.js): endless snowy forest, steam train, northern lights, reindeer, Santa fly-bys
- Route landmarks: Helsinki Central Station, Olavinlinna Castle, Lake Saimaa, Kuopio, Korouoma frozen falls, Arctic Circle canyon
- Five hand-designed logic puzzles, each with exactly one solution reachable by pure logic (verified by tests)
- Step-by-step hints generated from the solver, tutorial, notes, undo, eraser, timer
- Collectible 5-piece ticket and a finale; progress stored in localStorage only (no backend, no personal data)
- Responsive: desktop and mobile; synthesized audio; no external CDNs

## Run
```bash
bun install
bun run dev        # development
bun run test       # every case: one solution, solvable by logic, culprit matches the story
bun run build      # static build in dist/ (base "./" — opens from any folder)
bun run gen        # regenerate placements and clues (src/story/solutions.ts)
```

## URL parameters
- by default all cars are open (portfolio demo); `?live` locks cars by date (Dec 21–25) as in the real rollout
- `?date=2026-12-23` — see the game as on a given day (with `?live`)
- `?nointro` — skip the camera fly-in · `?q=low|mid|high` — graphics quality
- `?at=2450` — start at a route point (0 Helsinki, 2450 Olavinlinna, 4400 Saimaa, 4980 Kuopio, 5600 frozen falls, 6050 Arctic canyon)
- `?fest=75`, `?deer`, `?aurora` — trigger scenes for testing

## Structure
- `src/puzzle/engine.ts` — puzzle rules, solvers, clue and hint texts
- `src/story/cases.ts`, `heroes.ts` — the five cases and the team
- `src/world/` — 3D world: scenery, train, sky, effects, route landmarks
- `src/ui/` — hub, case screen, tutorial, ticket
