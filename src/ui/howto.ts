// Tutorial (6 steps on the first case) and a tabbed "How to play" help, like murdoku.com — simple and friendly.

import { emo } from "./emo";

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", html = "") => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
};

/** Мини-поле для иллюстраций: буквы, крестики, занятые клетки. */
function mini(rows: string[], cap = "") {
  const n = rows.length;
  const cells = rows
    .join("")
    .split("")
    .map((ch) => {
      if (ch === ".") return `<i></i>`;
      if (ch === "x") return `<i class="x">✕</i>`;
      if (ch === "#") return `<i class="b">🍽️</i>`;
      if (ch === ch.toLowerCase()) return `<i class="nt">${ch.toUpperCase()}</i>`;
      return `<i class="tk">${ch}</i>`;
    })
    .join("");
  return `<figure class="mini"><div class="mini-grid" style="--n:${n}">${cells}</div>${cap ? `<figcaption>${cap}</figcaption>` : ""}</figure>`;
}

const STEPS = [
  {
    ic: emo("eyes"),
    t: "Welcome aboard, detective",
    p: "Something has gone wrong in this car, and one of the suspects is to blame. The clues tell you who was where — and therefore who did it.",
  },
  {
    ic: emo("xmastree"),
    t: "How to solve a case",
    p: "Place every character and the evidence on the car’s floor plan. <b>The culprit is the only suspect who ends up in the same zone as the evidence.</b>",
  },
  {
    ic: "▦",
    t: "One per row and column",
    p: "Each row and each column holds exactly one character. Place someone and their row and column are crossed out automatically.",
    fig: mini(["xMxx", ".x..", ".x..", ".x.."], "Mikko is placed — his row and column are closed"),
  },
  {
    ic: emo("aurora"),
    t: "Read the clues",
    p: "“<b>Next to</b>” means the neighbouring cell left, right, above or below <b>in the same zone</b>. “<b>North of</b>” means higher on the plan. Tables, shelving and stoves are off-limits; chairs, berths and sofas are fine.",
  },
  {
    ic: emo("mitten"),
    t: "Controls",
    p: "Pick a character on the left. <b>Tap</b> a cell to add a note (small letter). <b>Press and hold</b> to place the character. Drag across cells to note several at once.",
    fig: mini(["a.a.", "....", ".A..", "...."], "small “a” are notes, the big one is Aino in place"),
  },
  {
    ic: "🧰",
    t: "Tools",
    p: "<b>✕</b> crosses out cells. <b>Eraser</b> clears a cell — hold the button to clear everything. <b>Undo</b> steps back. <b>Hint</b> explains the next step. When everyone is placed, press <b>Check</b>.",
  },
];

export function tutorial(parent: HTMLElement, onDone: () => void) {
  const bg = el("div", "htp-bg");
  const box = el("div", "tut");
  bg.appendChild(box);
  parent.appendChild(bg);
  let i = 0;
  const close = () => {
    bg.remove();
    onDone();
  };
  const render = () => {
    const s = STEPS[i];
    box.innerHTML = `<div class="tut-top"><span>${String(i + 1).padStart(2, "0")} / ${String(STEPS.length).padStart(2, "0")}</span><button class="tut-x" aria-label="Close">✕</button></div>
      <div class="tut-ic">${s.ic}</div><h3>${s.t}</h3><p>${s.p}</p>${s.fig ?? ""}
      <div class="tut-nav"><button class="tut-skip">Skip</button><div class="dots">${STEPS.map((_, k) => `<i class="${k === i ? "on" : ""}"></i>`).join("")}</div>
      <div>${i ? `<button class="btn tut-back">Back</button>` : ""}<button class="btn primary tut-next">${i === STEPS.length - 1 ? "Start" : "Next"}</button></div></div>`;
    box.querySelector<HTMLButtonElement>(".tut-x")!.onclick = close;
    box.querySelector<HTMLButtonElement>(".tut-skip")!.onclick = close;
    box.querySelector<HTMLButtonElement>(".tut-back")?.addEventListener("click", () => {
      i--;
      render();
    });
    box.querySelector<HTMLButtonElement>(".tut-next")!.onclick = () => {
      if (i === STEPS.length - 1) return close();
      i++;
      render();
    };
  };
  render();
}

const KEYWORDS: [string, string][] = [
  ["next to …", "The neighbouring cell left, right, above or below — and always in the same zone."],
  ["in the zone / at the bar / in compartment 2", "A cell inside that zone. Zones are separated by thick lines and labelled on the plan."],
  ["alone in their zone", "Nobody else is in that zone — not even the evidence."],
  ["in the same zone as …", "Both characters are in the same zone."],
  ["not in the same zone as …", "These two are in different zones."],
  ["in a corner of the zone", "A cell where two walls of the zone meet: top or bottom, and left or right."],
  ["by a window", "The very top or very bottom row — along the car’s windows."],
  ["away from the windows", "Any row except the top and bottom ones."],
  ["north / south of …", "Any cell higher / lower on the plan (north is up, like on a map)."],
  ["west / east of …", "Any cell further left / right on the plan."],
  ["exactly one row north of …", "One row higher, any column."],
  ["in row B / in column 3", "Rows are labelled with letters on the left, columns with numbers on top."],
  ["the only one who sat on …", "They sat on that object, and nobody else did."],
];

export function howToPlay(parent: HTMLElement) {
  const bg = el("div", "htp-bg");
  const box = el("div", "htp");
  bg.appendChild(box);
  parent.appendChild(bg);
  const tabs = ["Rules", "Clue words", "Techniques", "FAQ"];
  let tab = 0;
  const close = () => bg.remove();
  bg.addEventListener("click", (e) => e.target === bg && close());
  const body = () => {
    if (tab === 0)
      return `<h4>Goal</h4><p>Place every character and the evidence on the plan. The culprit is the only suspect in the same zone as the evidence.</p>
        <h4>Rules</h4><ul><li>Exactly one per row and one per column.</li><li>Occupied cells (tables, shelving, stoves — hatched) can’t be used.</li><li>Everyone gives a statement. All statements are true.</li></ul>
        <h4>Controls</h4><ul><li><b>Tap a character</b> to select them.</li><li><b>Tap a cell</b> to add a note (small letter).</li><li><b>Press and hold a cell</b> to place the character (big token).</li><li><b>Drag across cells</b> to note several at once.</li><li>On desktop you can drag a character from their card onto the board.</li></ul>
        <h4>Tools</h4><ul><li><b>✕ Cross out</b> — mark cells where nobody can be.</li><li><b>Eraser</b> — clear a cell. Hold the button to clear everything.</li><li><b>Undo</b> — one step back (or Ctrl+Z).</li><li><b>Hint</b> — explains the solution step by step.</li><li><b>Check</b> — once everyone is placed.</li></ul>`;
    if (tab === 1) return `<dl class="kw">${KEYWORDS.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>`;
    if (tab === 2)
      return `<h4>1. Look for rows and columns with one free cell</h4><p>Someone stands in every row. If a row has only one usable cell left, someone is definitely there — even if you don’t know who yet.</p>${mini(["#.##", "....", "....", "...."], "the top row has only one free cell")}
        <h4>2. Watch for “claimed” rows</h4><p>If two characters must share two rows between them (no matter who is where), nobody else can go in those rows.</p>${mini(["aa..", "bb..", "xxc.", "xx.c"], "A and B claimed two rows — C goes lower")}
        <h4>3. Cross out intersections</h4><p>If a character can only be in one of two cells, nobody can stand where both of those cells are “seen” along a row and a column.</p>${mini(["a.x.", "....", "x.a.", "...."], "A is in one of two cells — the crossed cells are safe to mark")}`;
    return `<h4>Is my progress saved?</h4><p>Yes, in this browser: placements, notes, time and hints. Nothing is sent to a server.</p>
      <h4>How many solutions does a case have?</h4><p>Exactly one, and you can reach it by logic — no guessing.</p>
      <h4>Do hints cost points?</h4><p>No, they’re just counted — the number shows up in the finale.</p>
      <h4>What’s the ticket?</h4><p>Every solved case is a piece of your Nordic Christmas Express ticket. Collect all five and the ticket becomes whole, with a gift code on it.</p>
      <h4>A car is locked?</h4><p>A new one opens every day from December 21 to 25. Missed cases stay available.</p>`;
  };
  const render = () => {
    box.innerHTML = `<div class="htp-head"><h3>How to play</h3><button class="tut-x" aria-label="Close">✕</button></div>
      <div class="htp-tabs" role="tablist">${tabs.map((t, i) => `<button role="tab" aria-selected="${i === tab}" data-i="${i}">${t}</button>`).join("")}</div>
      <div class="htp-body">${body()}</div>`;
    box.querySelector<HTMLButtonElement>(".tut-x")!.onclick = close;
    box.querySelectorAll<HTMLButtonElement>(".htp-tabs button").forEach((b) => (b.onclick = () => {
      tab = Number(b.dataset.i);
      render();
    }));
  };
  render();
}
