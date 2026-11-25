// Player progress. Lives only in the browser (localStorage); nothing is sent to a server.
import type { Cell } from "./puzzle/engine";
import { CASES } from "./story/cases";

export type Save = {
  v: 1;
  solved: Record<string, { at: number; ms: number; hints: number }>;
  board: Record<string, (Cell | null)[]>;
  marks: Record<string, Cell[]>;
  notes: Record<string, Record<string, number[]>>; // клетка → фигуры-заметки
  hintAt: Record<string, number>; // до какой подсказки дошёл
  tutorialSeen: boolean;
  ms: Record<string, number>;
  hints: Record<string, number>;
  santa: number;
  introSeen: boolean;
  finaleSeen: boolean;
};

const KEY = "nordvia-christmas-express-v1";

const fresh = (): Save => ({ v: 1, solved: {}, board: {}, marks: {}, notes: {}, hintAt: {}, tutorialSeen: false, ms: {}, hints: {}, santa: 0, introSeen: false, finaleSeen: false });

export function load(): Save {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const s = JSON.parse(raw);
    return s && s.v === 1 ? { ...fresh(), ...s } : fresh();
  } catch {
    return fresh();
  }
}

export function save(s: Save) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* приватный режим или переполнение — играем без сохранения */
  }
}

export function resetAll() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ничего */
  }
}

const params = new URLSearchParams(location.search);
/** Portfolio demo: all cars are open by default. Add ?live to lock cars by date (Dec 21–25),
 *  as in the real employee rollout. ?preview / #preview opens everything in live mode. */
export const DEMO = !params.has("live");
export const PREVIEW = DEMO || params.has("preview") || location.hash === "#preview" || import.meta.env.VITE_PREVIEW_ALL === "1";

export function today(): string {
  const d = params.get("date"); // ?date=2026-12-23 — see the game as on a given day
  if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

export const isOpen = (i: number) => PREVIEW || today() >= CASES[i].date;

export const fmtTime = (ms: number) => {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  return m ? `${m}m ${String(s % 60).padStart(2, "0")}s` : `${s}s`;
};
