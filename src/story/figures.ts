import type { Figure } from "../puzzle/engine";
import type { CaseDef } from "./cases";
import { hero } from "./heroes";

/** Фигуры дела: подозреваемые по порядку и последней — улика. */
export function figuresOf(c: CaseDef): Figure[] {
  return [
    ...c.suspects.map((id) => ({ id, name: hero(id).name, gender: hero(id).gender, gen: hero(id).gen, ins: hero(id).ins })),
    { id: "item", name: c.item.name, gender: c.item.gender, item: true, gen: c.item.gen, ins: c.item.ins },
  ];
}
