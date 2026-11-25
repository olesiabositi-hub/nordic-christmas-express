// Движок мурдоку. Без three.js и DOM: только правила, чтобы всё проверялось тестами.
//
// Правила (как на murdoku.com):
// 1. Поле N×N разбито на зоны. На поле N фигур: подозреваемые и улика (у нас вместо жертвы).
// 2. В каждой строке и в каждом столбце ровно одна фигура.
// 3. На занятые клетки (стол, стеллаж, плита) встать нельзя; на стул, полку, диван — можно.
// 4. У каждой фигуры есть показание. «Рядом» — слева, справа, сверху или снизу И в той же зоне.
// 5. Виновный — единственный подозреваемый, оказавшийся в одной зоне с уликой.

export type Posture = "sit" | "stand" | "lie";
export type Gender = "m" | "f";

export type ObjKind = {
  ch: string;
  name: string;
  icon: string;
  img?: string; // mascot emoji key (ui/emo.ts) instead of the plain icon
  blocked?: boolean;
  posture: Posture;
  on?: string; // «на нижней полке»
  near: string; // «рядом с розеткой»
  gen?: string; // «розетки» — для «единственная у розетки» не нужно, для «не рядом» есть near
};

export type Region = { ch: string; name: string; in: string };

export type Layout = {
  n: number;
  regions: string[];
  objects: string[];
  kinds: ObjKind[];
  zones: Region[];
  windows: boolean;
};

export type Pred =
  | { t: "on"; k: string }
  | { t: "beside"; k: string }
  | { t: "notBeside"; k: string }
  | { t: "zone"; z: string }
  | { t: "notZone"; z: string }
  | { t: "window" }
  | { t: "notWindow" }
  | { t: "col"; i: number }
  | { t: "row"; i: number }
  | { t: "corner" }
  | { t: "alone" }
  | { t: "onlyOn"; k: string }
  | { t: "north"; j: number }
  | { t: "south"; j: number }
  | { t: "west"; j: number }
  | { t: "east"; j: number }
  | { t: "rowNorth"; j: number }
  | { t: "with"; j: number }
  | { t: "notWith"; j: number };

export type Clue = Pred[];

export type Figure = { id: string; name: string; gender: Gender; item?: boolean; gen: string; ins: string };

export type Cell = number;

export const rc = (n: number, cell: Cell) => [Math.floor(cell / n), cell % n] as const;
export const ROWS = "ABCDEFGHIJ";
export const cellName = (n: number, cell: Cell) => {
  const [r, c] = rc(n, cell);
  return `${ROWS[r]}${c + 1}`;
};

export function kindAt(l: Layout, cell: Cell): ObjKind | undefined {
  const [r, c] = rc(l.n, cell);
  const ch = l.objects[r][c];
  return ch === "." ? undefined : l.kinds.find((k) => k.ch === ch);
}
export const zoneAt = (l: Layout, cell: Cell) => {
  const [r, c] = rc(l.n, cell);
  return l.regions[r][c];
};
export const isBlocked = (l: Layout, cell: Cell) => !!kindAt(l, cell)?.blocked;

export function neighbours(n: number, cell: Cell): Cell[] {
  const [r, c] = rc(n, cell);
  const out: Cell[] = [];
  if (r > 0) out.push(cell - n);
  if (r < n - 1) out.push(cell + n);
  if (c > 0) out.push(cell - 1);
  if (c < n - 1) out.push(cell + 1);
  return out;
}

/** «Рядом» по правилам мурдоку: соседняя клетка в той же зоне. */
export const besideKind = (l: Layout, cell: Cell, k: string) =>
  neighbours(l.n, cell).some((x) => zoneAt(l, x) === zoneAt(l, cell) && kindAt(l, x)?.ch === k);

/** Угол зоны: клетка касается стены зоны и по горизонтали, и по вертикали. */
export function isCorner(l: Layout, cell: Cell) {
  const [r, c] = rc(l.n, cell);
  const z = zoneAt(l, cell);
  const out = (rr: number, cc: number) => rr < 0 || cc < 0 || rr >= l.n || cc >= l.n || l.regions[rr][cc] !== z;
  return (out(r - 1, c) || out(r + 1, c)) && (out(r, c - 1) || out(r, c + 1));
}

const isUnary = (p: Pred) => !("j" in p) && p.t !== "alone" && p.t !== "onlyOn";

export function holdsUnary(l: Layout, cell: Cell, p: Pred): boolean {
  const [r, c] = rc(l.n, cell);
  switch (p.t) {
    case "on":
      return kindAt(l, cell)?.ch === p.k;
    case "beside":
      return besideKind(l, cell, p.k);
    case "notBeside":
      return !besideKind(l, cell, p.k);
    case "zone":
      return zoneAt(l, cell) === p.z;
    case "notZone":
      return zoneAt(l, cell) !== p.z;
    case "window":
      return l.windows && (r === 0 || r === l.n - 1);
    case "notWindow":
      return !(l.windows && (r === 0 || r === l.n - 1));
    case "col":
      return c === p.i;
    case "row":
      return r === p.i;
    case "corner":
      return isCorner(l, cell);
    case "onlyOn":
      return kindAt(l, cell)?.ch === p.k;
    default:
      return true;
  }
}

/** Отношение между двумя клетками для парной улики (a — тот, у кого улика). */
export function holdsPair(l: Layout, p: Pred, a: Cell, b: Cell): boolean {
  const [ra, ca] = rc(l.n, a);
  const [rb, cb] = rc(l.n, b);
  switch (p.t) {
    case "north":
      return ra < rb;
    case "south":
      return ra > rb;
    case "west":
      return ca < cb;
    case "east":
      return ca > cb;
    case "rowNorth":
      return ra === rb - 1;
    case "with":
      return zoneAt(l, a) === zoneAt(l, b);
    case "notWith":
    case "alone":
      return zoneAt(l, a) !== zoneAt(l, b);
    default:
      return true;
  }
}

/** Разворачиваем улики в одноместные фильтры и парные связи. */
export function compile(l: Layout, clues: Clue[]) {
  const N = clues.length;
  const unary: Pred[][] = clues.map((cl) => cl.filter(isUnary));
  const pairs: { a: number; b: number; p: Pred }[] = [];
  clues.forEach((cl, a) => {
    for (const p of cl) {
      if ("j" in p) pairs.push({ a, b: p.j, p });
      if (p.t === "alone") for (let b = 0; b < N; b++) if (b !== a) pairs.push({ a, b, p });
      if (p.t === "onlyOn") {
        unary[a].push(p);
        for (let b = 0; b < N; b++) if (b !== a) unary[b].push({ t: "notOn" as never, k: p.k } as never);
      }
    }
  });
  const okUnary = (f: number, cell: Cell) =>
    !isBlocked(l, cell) &&
    unary[f].every((p) => ((p.t as string) === "notOn" ? kindAt(l, cell)?.ch !== (p as { k: string }).k : holdsUnary(l, cell, p)));
  return { N, unary, pairs, okUnary };
}

export function candidates(l: Layout, clues: Clue[], f: number): Cell[] {
  const { okUnary } = compile(l, clues);
  const out: Cell[] = [];
  for (let i = 0; i < l.n * l.n; i++) if (okUnary(f, i)) out.push(i);
  return out;
}

/** Проверка полной (или частичной) расстановки: какие фигуры нарушают свою улику. */
export function violations(l: Layout, clues: Clue[], pos: (Cell | null)[]): Set<number> {
  const { okUnary, pairs } = compile(l, clues);
  const bad = new Set<number>();
  pos.forEach((c, f) => {
    if (c !== null && !okUnary(f, c)) bad.add(f);
  });
  for (const { a, b, p } of pairs) {
    const ca = pos[a], cb = pos[b];
    if (ca === null || cb === null) continue;
    if (!holdsPair(l, p, ca, cb)) bad.add(a);
  }
  return bad;
}

// ---------- Решатели ----------

/** Все решения полным перебором (N ≤ 8 — быстро). */
export function allSolutions(l: Layout, clues: Clue[], limit = 2): Cell[][] {
  const n = l.n;
  const { N, okUnary, pairs } = compile(l, clues);
  const cands = Array.from({ length: N }, (_, f) => {
    const out: Cell[] = [];
    for (let i = 0; i < n * n; i++) if (okUnary(f, i)) out.push(i);
    return out;
  });
  const order = cands.map((_, i) => i).sort((a, b) => cands[a].length - cands[b].length);
  const rows = new Array(n).fill(false);
  const cols = new Array(n).fill(false);
  const pos: (Cell | null)[] = new Array(N).fill(null);
  const out: Cell[][] = [];
  const pairOk = (f: number) =>
    pairs.every(({ a, b, p }) => (a !== f && b !== f) || pos[a] === null || pos[b] === null || holdsPair(l, p, pos[a]!, pos[b]!));
  const go = (k: number) => {
    if (out.length >= limit) return;
    if (k === order.length) {
      out.push(pos.slice() as Cell[]);
      return;
    }
    const f = order[k];
    for (const cell of cands[f]) {
      const [r, c] = rc(n, cell);
      if (rows[r] || cols[c]) continue;
      rows[r] = cols[c] = true;
      pos[f] = cell;
      if (pairOk(f)) go(k + 1);
      pos[f] = null;
      rows[r] = cols[c] = false;
    }
  };
  go(0);
  return out;
}

export type Why =
  | { k: "only"; f: number; cell?: Cell }
  | { k: "lineOnly"; f: number; axis: "row" | "col"; line: number }
  | { k: "point"; f: number; axis: "row" | "col"; line: number }
  | { k: "pair"; f: number; g: number; axis: "row" | "col"; lines: number[] }
  | { k: "rel"; f: number; g: number; p: Pred };

export type Step = { place?: { f: number; cell: Cell }; why: Why; removed: { f: number; cell: Cell }[] };

/**
 * Решатель «за обедом»: только приёмы, которые человек делает в уме (те же, что в разделе «Приёмы»).
 * Возвращает шаги с объяснениями (для подсказок) или null, если без перебора не решить.
 */
export function logicSolve(l: Layout, clues: Clue[]): { steps: Step[]; rounds: number } | null {
  const n = l.n;
  const { N, okUnary, pairs } = compile(l, clues);
  const cand: Set<Cell>[] = Array.from({ length: N }, (_, f) => {
    const s = new Set<Cell>();
    for (let i = 0; i < n * n; i++) if (okUnary(f, i)) s.add(i);
    return s;
  });
  const placed = new Array(N).fill(false);
  const steps: Step[] = [];
  const rowOf = (c: Cell) => Math.floor(c / n);
  const colOf = (c: Cell) => c % n;
  let rounds = 0;
  const record = (why: Why, removed: { f: number; cell: Cell }[]) => {
    if (!removed.length) return false;
    steps.push({ why, removed });
    return true;
  };
  const placeIfSingle = (why: Why) => {
    let any = false;
    for (let f = 0; f < N; f++) {
      if (!placed[f] && cand[f].size === 1) {
        placed[f] = true;
        steps.push({ place: { f, cell: [...cand[f]][0] }, why: why.f === f ? why : { k: "only", f }, removed: [] });
        any = true;
      }
    }
    return any;
  };
  let changed = true;
  while (changed) {
    changed = false;
    rounds++;
    if (rounds > 200) return null;
    if (cand.some((s) => s.size === 0)) return null;
    // 1. Поставленная фигура закрывает свою строку и столбец; фигура, чьи клетки в одной линии, — тоже
    for (let f = 0; f < N && !changed; f++) {
      for (const axis of ["row", "col"] as const) {
        const of = axis === "row" ? rowOf : colOf;
        const lines = new Set([...cand[f]].map(of));
        if (lines.size !== 1) continue;
        const line = [...lines][0];
        const removed: { f: number; cell: Cell }[] = [];
        for (let g = 0; g < N; g++) {
          if (g === f) continue;
          for (const x of [...cand[g]]) if (of(x) === line) {
            cand[g].delete(x);
            removed.push({ f: g, cell: x });
          }
        }
        if (record(cand[f].size === 1 ? { k: "only", f, cell: [...cand[f]][0] } : { k: "point", f, axis, line }, removed)) {
          changed = true;
          break;
        }
      }
    }
    if (changed) {
      placeIfSingle({ k: "only", f: -1 });
      continue;
    }
    // 2. В строке (столбце) может встать только одна фигура — она там
    for (const axis of ["row", "col"] as const) {
      const of = axis === "row" ? rowOf : colOf;
      for (let i = 0; i < n && !changed; i++) {
        const who = cand.map((s, f) => ([...s].some((x) => of(x) === i) ? f : -1)).filter((f) => f >= 0);
        if (who.length === 0) return null;
        if (who.length === 1) {
          const f = who[0];
          const removed: { f: number; cell: Cell }[] = [];
          for (const x of [...cand[f]]) if (of(x) !== i) {
            cand[f].delete(x);
            removed.push({ f, cell: x });
          }
          if (record({ k: "lineOnly", f, axis, line: i }, removed)) {
            changed = true;
            placeIfSingle({ k: "lineOnly", f, axis, line: i });
          }
        }
      }
      if (changed) break;
    }
    if (changed) continue;
    // 3. Парные улики: вычёркиваем клетки, где связь невозможна
    for (const { a, b, p } of pairs) {
      const removed: { f: number; cell: Cell }[] = [];
      for (const x of [...cand[a]]) {
        const ok = [...cand[b]].some((y) => rowOf(x) !== rowOf(y) && colOf(x) !== colOf(y) && holdsPair(l, p, x, y));
        if (!ok) {
          cand[a].delete(x);
          removed.push({ f: a, cell: x });
        }
      }
      for (const y of [...cand[b]]) {
        const ok = [...cand[a]].some((x) => rowOf(x) !== rowOf(y) && colOf(x) !== colOf(y) && holdsPair(l, p, x, y));
        if (!ok) {
          cand[b].delete(y);
          removed.push({ f: b, cell: y });
        }
      }
      if (record({ k: "rel", f: a, g: b, p }, removed)) {
        changed = true;
        placeIfSingle({ k: "rel", f: a, g: b, p });
        break;
      }
    }
    if (changed) continue;
    // 4. Две фигуры делят одни и те же две строки (столбца) — остальным туда нельзя
    for (const axis of ["row", "col"] as const) {
      const of = axis === "row" ? rowOf : colOf;
      for (let a = 0; a < N && !changed; a++) {
        const sa = new Set([...cand[a]].map(of));
        if (sa.size !== 2) continue;
        for (let b = a + 1; b < N && !changed; b++) {
          const sb = new Set([...cand[b]].map(of));
          if (sb.size > 2 || ![...sb].every((x) => sa.has(x))) continue;
          const removed: { f: number; cell: Cell }[] = [];
          for (let g = 0; g < N; g++) {
            if (g === a || g === b) continue;
            for (const x of [...cand[g]]) if (sa.has(of(x))) {
              cand[g].delete(x);
              removed.push({ f: g, cell: x });
            }
          }
          if (record({ k: "pair", f: a, g: b, axis, lines: [...sa] }, removed)) {
            changed = true;
            placeIfSingle({ k: "only", f: -1 });
          }
        }
      }
      if (changed) break;
    }
  }
  if (cand.some((s) => s.size !== 1)) return null;
  placeIfSingle({ k: "only", f: -1 });
  return { steps, rounds };
}

/** Виновный: единственный подозреваемый в зоне улики. -1 если таких нет или их несколько. */
export function culpritOf(l: Layout, figures: Figure[], pos: Cell[]): number {
  const itemIdx = figures.findIndex((f) => f.item);
  const z = zoneAt(l, pos[itemIdx]);
  const inZone = figures.map((f, i) => (!f.item && zoneAt(l, pos[i]) === z ? i : -1)).filter((i) => i >= 0);
  return inZone.length === 1 ? inZone[0] : -1;
}

// ---------- Clue text (with <b> for key words, like murdoku cards) ----------

const VERB: Record<Posture, string> = { sit: "sat", stand: "stood", lie: "lay" };
const PRON = (f: Figure) => (f.item ? "It" : f.gender === "f" ? "She" : "He");
const POSS = (f: Figure) => (f.item ? "its" : f.gender === "f" ? "her" : "his");
const b = (s: string) => `<b>${s}</b>`;

function unaryFrag(l: Layout, p: Pred): string {
  const kind = (ch: string) => l.kinds.find((k) => k.ch === ch)!;
  const zone = (ch: string) => l.zones.find((z) => z.ch === ch)!;
  switch (p.t) {
    case "on":
      return b(kind(p.k).on!);
    case "beside":
      return b(kind(p.k).near);
    case "notBeside":
      return `not ${b(kind(p.k).near)}`;
    case "zone":
      return b(zone(p.z).in);
    case "window":
      return b("by a window");
    case "col":
      return `in ${b("column " + (p.i + 1))}`;
    case "row":
      return `in ${b("row " + ROWS[p.i])}`;
    case "corner":
      return `in a ${b("corner")} of the zone`;
    default:
      return "";
  }
}
const order = (p: Pred) => ({ on: 0, window: 1, beside: 2, zone: 3, corner: 4, col: 5, row: 6 } as Record<string, number>)[p.t] ?? 9;

/** "Aino sat on a lower berth by a window. She was north of Mikko." — HTML with <b>. */
export function clueHtml(l: Layout, figs: Figure[], fi: number, clue: Clue): string {
  const fig = figs[fi];
  const out: string[] = [];
  const kind = (ch: string) => l.kinds.find((k) => k.ch === ch)!;
  const zone = (ch: string) => l.zones.find((z) => z.ch === ch)!;
  const pos = clue.filter((p) => ["on", "beside", "zone", "window", "col", "row", "corner", "notBeside"].includes(p.t)).sort((a, c) => order(a) - order(c));
  const onP = pos.find((p) => p.t === "on") as { t: "on"; k: string } | undefined;
  const verb = fig.item ? VERB.lie : onP ? VERB[kind(onP.k).posture] : "was";
  let subject = fig.name;
  if (pos.length) {
    out.push(`${subject} ${verb} ${pos.map((p) => unaryFrag(l, p)).join(" ")}.`);
    subject = PRON(fig);
  }
  for (const p of clue) {
    const was = fig.item ? "lay" : "was";
    const other = "j" in p ? figs[p.j] : null;
    const on = (f: Figure) => f.gen;
    let s = "";
    switch (p.t) {
      case "notZone":
        s = `${subject} ${fig.item ? "did not lie" : "was not"} ${b(zone(p.z).in)}.`;
        break;
      case "notWindow":
        s = fig.item ? `${subject} lay ${b("away from the windows")}.` : `${subject} kept ${b("away from the windows")}.`;
        break;
      case "north":
        s = `${subject} ${was} ${b("north of")} ${on(other!)}.`;
        break;
      case "south":
        s = `${subject} ${was} ${b("south of")} ${on(other!)}.`;
        break;
      case "west":
        s = `${subject} ${was} ${b("west of")} ${on(other!)}.`;
        break;
      case "east":
        s = `${subject} ${was} ${b("east of")} ${on(other!)}.`;
        break;
      case "rowNorth":
        s = `${subject} ${was} ${b("exactly one row north of")} ${on(other!)}.`;
        break;
      case "with":
        s = `${subject} ${was} ${b("in the same zone")} as ${other!.ins}.`;
        break;
      case "notWith":
        s = `${subject} ${b(was + " not")} in the same zone as ${other!.ins}.`;
        break;
      case "alone":
        s = `${subject} ${was} ${b("alone")} in ${POSS(fig)} zone.`;
        break;
      case "onlyOn":
        s = `${subject} ${was} ${b("the only one")} who ${VERB[kind(p.k).posture]} ${b(kind(p.k).on!)}.`;
        break;
      default:
        continue;
    }
    out.push(s);
    subject = PRON(fig);
  }
  return out.join(" ");
}

export const clueText = (l: Layout, figs: Figure[], fi: number, clue: Clue) => clueHtml(l, figs, fi, clue).replace(/<\/?b>/g, "");

const low = (f: Figure) => (f.item ? f.name[0].toLowerCase() + f.name.slice(1) : f.name);
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const poss = (f: Figure) => `${low(f)}’s`;
const relWord = (p: Pred) =>
  p.t === "north" ? "was north of" : p.t === "south" ? "was south of" : p.t === "west" ? "was west of" : p.t === "east" ? "was east of" : p.t === "rowNorth" ? "was exactly one row north of" : p.t === "with" ? "was in the same zone as" : "was not in the same zone as";

/** One reasoning sentence for a solver step (without the conclusion). */
export function hintText(l: Layout, figs: Figure[], st: Step): string {
  const lineName = (axis: "row" | "col", i: number) => (axis === "row" ? `row ${ROWS[i]}` : `column ${i + 1}`);
  const w = st.why;
  switch (w.k) {
    case "only":
      return w.cell !== undefined
        ? `${cap(low(figs[w.f]))} is on ${cellName(l.n, w.cell)}, so row ${ROWS[Math.floor(w.cell / l.n)]} and column ${(w.cell % l.n) + 1} are taken.`
        : `${cap(low(figs[w.f]))} has only one suitable cell left.`;
    case "point":
      return `By ${poss(figs[w.f])} clue, only cells in ${lineName(w.axis, w.line)} fit — so nobody else can be in ${lineName(w.axis, w.line)}.`;
    case "lineOnly":
      return `Someone has to be in ${lineName(w.axis, w.line)}, and only ${low(figs[w.f])} fits there.`;
    case "pair":
      return `${cap(low(figs[w.f]))} and ${low(figs[w.g])} share ${w.axis === "row" ? "rows" : "columns"} ${w.lines.map((i) => (w.axis === "row" ? ROWS[i] : i + 1)).join(" and ")} — nobody else can go there.`;
    case "rel": {
      const p = w.p;
      if (p.t === "alone") return `${cap(low(figs[w.f]))} was alone in ${POSS(figs[w.f])} zone — so nobody else is there.`;
      return `${cap(low(figs[w.f]))} ${relWord(p)} ${low(figs[w.g])} — cross out the cells where that can’t work.`;
    }
  }
}

export type Hint = { text: string; place: { f: number; cell: Cell }; crossed: Cell[]; line?: { axis: "row" | "col"; i: number } };

/**
 * Подсказки как на murdoku.com: «Подсказка 2/6» — рассуждение, которое ведёт к очередной фигуре.
 * Шаги решателя между двумя расстановками склеиваются в одно объяснение.
 */
export function hints(l: Layout, figs: Figure[], clues: Clue[]): Hint[] {
  const solved = logicSolve(l, clues);
  if (!solved) return [];
  const out: Hint[] = [];
  let reasons: string[] = [];
  let crossed: Cell[] = [];
  let line: Hint["line"];
  for (const st of solved.steps) {
    if (!st.place) {
      const t = hintText(l, figs, st);
      // «ряд и столбец заняты» — самое очевидное; оставляем, только если других причин нет
      if (st.why.k === "only") {
        if (!reasons.length) reasons.push(t);
      } else {
        reasons = reasons.filter((r) => !r.includes(" are taken."));
        if (!reasons.includes(t)) reasons.push(t);
      }
      crossed.push(...st.removed.map((r) => r.cell));
      const w = st.why;
      if (w.k === "point" || w.k === "lineOnly") line = { axis: w.axis, i: w.line };
      continue;
    }
    const { f, cell } = st.place;
    const who = figs[f];
    let text: string;
    if (st.why.k === "lineOnly") text = `${hintText(l, figs, st)} So ${low(who)} is on cell ${cellName(l.n, cell)}.`;
    else if (!reasons.length) text = `${clueText(l, figs, f, clues[f])} Only cell ${cellName(l.n, cell)} fits that.`;
    else text = `${reasons.slice(-2).join(" ")} So ${low(who)} is on cell ${cellName(l.n, cell)}.`;
    out.push({ text, place: { f, cell }, crossed: [...new Set(crossed)], line });
    reasons = [];
    crossed = [];
    line = undefined;
  }
  return out;
}
