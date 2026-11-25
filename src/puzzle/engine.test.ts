import { describe, expect, it } from "vitest";
import { CASES } from "../story/cases";
import { SOLUTIONS } from "../story/solutions";
import { figuresOf } from "../story/figures";
import { allSolutions, besideKind, clueText, culpritOf, hints, logicSolve, violations } from "./engine";

describe("правила", () => {
  it("«рядом» — только в той же зоне", () => {
    const l = { n: 2, windows: false, regions: ["AB", "AB"], objects: ["R.", ".."], zones: [{ ch: "A", name: "", in: "" }, { ch: "B", name: "", in: "" }], kinds: [{ ch: "R", name: "", icon: "", posture: "stand" as const, near: "" }] };
    expect(besideKind(l, 2, "R")).toBe(true); // снизу, та же зона
    expect(besideKind(l, 1, "R")).toBe(false); // справа, но другая зона
  });
});

describe("пять дел", () => {
  for (const c of CASES) {
    const s = SOLUTIONS[c.id];
    const l = c.layout;
    const figs = figuresOf(c);
    it(`${c.title}: план корректный`, () => {
      expect(l.regions).toHaveLength(l.n);
      expect(l.objects).toHaveLength(l.n);
      for (const row of [...l.regions, ...l.objects]) expect([...row]).toHaveLength(l.n);
      for (const ch of l.objects.join("")) if (ch !== ".") expect(l.kinds.some((k) => k.ch === ch)).toBe(true);
      for (const ch of l.regions.join("")) expect(l.zones.some((z) => z.ch === ch)).toBe(true);
      expect(figs).toHaveLength(l.n);
    });
    it(`${c.title}: решение одно и сходится с уликами`, () => {
      expect(violations(l, s.clues, s.pos).size).toBe(0);
      const sols = allSolutions(l, s.clues, 3);
      expect(sols).toHaveLength(1);
      expect(sols[0]).toEqual(s.pos);
    });
    it(`${c.title}: решается логикой, подсказка на каждого`, () => {
      expect(logicSolve(l, s.clues)).not.toBeNull();
      const h = hints(l, figs, s.clues);
      expect(h).toHaveLength(figs.length);
      h.forEach((x) => expect(x.place.cell).toBe(s.pos[x.place.f]));
    });
    it(`${c.title}: виновный совпадает с сюжетом`, () => {
      expect(figs[culpritOf(l, figs, s.pos)].id).toBe(c.culprit);
    });
    it(`${c.title}: улики читаются`, () => {
      figs.forEach((_, i) => {
        const t = clueText(l, figs, i, s.clues[i]);
        expect(t).not.toMatch(/undefined/);
        expect(t.endsWith(".")).toBe(true);
      });
    });
  }
});
