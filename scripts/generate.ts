// Подбирает расстановку и улики для каждого дела и пишет src/story/solutions.ts.
// Требования к делу:
//  — решение ровно одно;
//  — оно находится «обеденной» логикой без перебора (logicSolve), значит, есть пошаговые подсказки;
//  — виновный по правилу зоны совпадает с сюжетным;
//  — улики как можно «слабее» и разнообразнее, с несколькими уликами про других персонажей.
// Запуск: bun scripts/generate.ts
import { writeFileSync } from "node:fs";
import { CASES, type CaseDef } from "../src/story/cases";
import { figuresOf } from "../src/story/figures";
export { figuresOf };
import {
  allSolutions, besideKind, culpritOf, holdsPair, isBlocked, isCorner, kindAt, logicSolve, rc, zoneAt, compile,
  type Cell, type Clue, type Figure, type Layout, type Pred,
} from "../src/puzzle/engine";

let seed = 20261221;
const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const shuffle = <T,>(a: T[]) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const REL = new Set(["north", "south", "west", "east", "rowNorth", "with", "notWith", "alone", "onlyOn"]);
const isRel = (cl: Clue) => cl.some((p) => REL.has(p.t));

function options(l: Layout, c: CaseDef, pos: Cell[], f: number, figs: Figure[]): Clue[] {
  const cell = pos[f];
  const [r, col] = rc(l.n, cell);
  const allow = (t: string) => c.allow.includes(t as Pred["t"]);
  const single: Pred[] = [];
  const k = kindAt(l, cell);
  if (k?.on && allow("on")) single.push({ t: "on", k: k.ch });
  const beside = new Set(l.kinds.filter((kk) => besideKind(l, cell, kk.ch)).map((kk) => kk.ch));
  if (allow("beside")) for (const ch of beside) single.push({ t: "beside", k: ch });
  if (allow("notBeside")) for (const kk of l.kinds) if (!beside.has(kk.ch) && kk.blocked) single.push({ t: "notBeside", k: kk.ch });
  if (allow("zone")) single.push({ t: "zone", z: zoneAt(l, cell) });
  if (allow("notZone")) for (const z of l.zones) if (z.ch !== zoneAt(l, cell)) single.push({ t: "notZone", z: z.ch });
  const win = l.windows && (r === 0 || r === l.n - 1);
  if (l.windows && win && allow("window")) single.push({ t: "window" });
  if (l.windows && !win && allow("notWindow") && !figs[f].item) single.push({ t: "notWindow" });
  if (allow("col")) single.push({ t: "col", i: col });
  if (allow("row")) single.push({ t: "row", i: r });
  if (allow("corner") && isCorner(l, cell)) single.push({ t: "corner" });

  const out: Clue[] = single.map((p) => [p]);
  if (c.pairs) {
    const pos2 = single.filter((p) => ["on", "beside", "window", "zone", "corner"].includes(p.t));
    for (let i = 0; i < pos2.length; i++)
      for (let j = i + 1; j < pos2.length; j++) {
        const a = pos2[i], b = pos2[j];
        if (a.t === b.t) continue;
        if ("k" in a && "k" in b && a.k === b.k) continue;
        out.push([a, b]);
      }
  }
  // улики про других персонажей
  if (c.maxRel > 0) {
    figs.forEach((_, j) => {
      if (j === f) return;
      for (const t of ["north", "south", "west", "east", "rowNorth", "with", "notWith"] as const) {
        const p = { t, j } as Pred;
        if (holdsPair(l, p, cell, pos[j])) out.push([p]);
        // «в первом купе. Она не была с Асей» — зона + связь
        if (allow("zone") && (t === "notWith" || t === "north" || t === "south")) {
          if (holdsPair(l, p, cell, pos[j])) out.push([{ t: "zone", z: zoneAt(l, cell) }, p]);
        }
      }
    });
    const zf = zoneAt(l, cell);
    if (figs.every((_, j) => j === f || zoneAt(l, pos[j]) !== zf)) out.push([{ t: "alone" }]);
    if (k?.on && figs.every((_, j) => j === f || kindAt(l, pos[j])?.ch !== k.ch)) out.push([{ t: "onlyOn", k: k.ch }]);
  }
  return out;
}

function weight(l: Layout, clues: Clue[], f: number) {
  const { okUnary } = compile(l, clues);
  let n = 0;
  for (let i = 0; i < l.n * l.n; i++) if (okUnary(f, i)) n++;
  return n;
}
/** Сила одной улики «в отрыве»: сколько клеток она оставляет (связи считаем слабыми). */
const strength = (l: Layout, cl: Clue, N: number) => {
  if (isRel(cl) && !cl.some((p) => p.t === "zone" || p.t === "onlyOn")) return l.n * l.n;
  const fake: Clue[] = Array.from({ length: N }, () => []);
  fake[0] = cl.filter((p) => !REL.has(p.t) || p.t === "onlyOn");
  return weight(l, fake, 0);
};

function tryCase(c: CaseDef) {
  const l = c.layout;
  const n = l.n;
  const figs = figuresOf(c);
  const N = figs.length;
  const culpritIdx = c.suspects.indexOf(c.culprit);
  let best: { pos: Cell[]; clues: Clue[]; score: number; steps: number; rel: number } | null = null;

  for (let attempt = 0; attempt < 2500; attempt++) {
    const perm = shuffle([...Array(n).keys()]);
    const cells = perm.map((col, r) => r * n + col);
    if (cells.some((x) => isBlocked(l, x))) continue;
    const pos = shuffle(cells.slice());
    if (culpritOf(l, figs, pos) !== culpritIdx) continue;
    const opts = figs.map((_, f) => options(l, c, pos, f, figs));
    const ranked = opts.map((o) => o.slice().sort((a, b) => strength(l, a, N) - strength(l, b, N)));
    let pick = ranked.map((o) => o.find((cl) => !isRel(cl)) ?? o[0]);
    for (let t = 0; t < 40 && !logicSolve(l, pick); t++) pick = ranked.map((o) => o[Math.floor(rand() * Math.min(3, o.length))]);
    if (!logicSolve(l, pick)) continue;
    // Ослабляем: сперва пробуем улики про других, затем более слабые одиночные
    for (let pass = 0; pass < 5; pass++) {
      for (const f of shuffle([...figs.keys()])) {
        const relNow = pick.filter(isRel).length;
        const cur = strength(l, pick[f], N);
        const tries = shuffle(opts[f].slice()).sort((a, b) => {
          const ra = isRel(a) ? 1 : 0, rb = isRel(b) ? 1 : 0;
          if (ra !== rb) return rb - ra;
          return strength(l, b, N) - strength(l, a, N);
        });
        for (const cand of tries) {
          if (isRel(cand) && !isRel(pick[f]) && relNow >= c.maxRel) continue;
          if (!isRel(cand) && strength(l, cand, N) <= cur) continue;
          const trial = pick.slice();
          trial[f] = cand;
          if (logicSolve(l, trial)) {
            pick[f] = cand;
            break;
          }
        }
      }
    }
    const solved = logicSolve(l, pick);
    if (!solved) continue;
    const sols = allSolutions(l, pick, 2);
    if (sols.length !== 1 || sols[0].some((x, i) => x !== pos[i])) continue;
    const types = new Set(pick.flat().map((p) => p.t)).size;
    const rel = pick.filter(isRel).length;
    const placements = solved.steps.filter((s) => s.place).length;
    const score = types * 1.2 + Math.min(rel, c.maxRel) * 1.5 + solved.steps.length * 0.25 + placements * 0.1 - Math.max(0, solved.steps.length - 26) * 0.6;
    if (!best || score > best.score) best = { pos, clues: pick, score, steps: solved.steps.length, rel };
  }
  if (!best) throw new Error(`Не удалось собрать дело ${c.id}`);
  return best;
}

function main() {
  const out: Record<string, { pos: Cell[]; clues: Clue[] }> = {};
  for (const c of CASES) {
    const b = tryCase(c);
    out[c.id] = { pos: b.pos, clues: b.clues };
    console.log(c.id, "score", b.score.toFixed(1), "steps", b.steps, "rel", b.rel);
  }
  writeFileSync(
    new URL("../src/story/solutions.ts", import.meta.url),
    `// Сгенерировано scripts/generate.ts — не править руками.\nimport type { Cell, Clue } from "../puzzle/engine";\n\nexport const SOLUTIONS: Record<string, { pos: Cell[]; clues: Clue[] }> = ${JSON.stringify(out, null, 1)};\n`,
  );
}
if (import.meta.main) main();
