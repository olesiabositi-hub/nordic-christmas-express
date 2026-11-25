// Case screen — murdoku-style mechanics, fairy-tale visuals in the NORDVIA "Polar Night" theme.
//
// Управление (как на сайте):
//  • нажми на персонажа — он выбран;
//  • короткое нажатие на клетку — заметка (маленькая буква);
//  • нажми и подержи клетку — поставить персонажа;
//  • проведи по клеткам — заметки (или крестики) на несколько клеток;
//  • ✕ — режим крестиков, ластик — стереть клетку (удержать — стереть всё), отмена — шаг назад;
//  • подсказка — пошаговое объяснение, «Проверить» — когда все на местах.
import { cellName, clueHtml, hints as buildHints, isBlocked, kindAt, rc, ROWS, zoneAt, type Cell } from "../puzzle/engine";
import { CASES } from "../story/cases";
import { SOLUTIONS } from "../story/solutions";
import { figuresOf } from "../story/figures";
import { hero } from "../story/heroes";
import { fmtTime, isOpen, save, type Save } from "../state";
import { ticketSvg } from "./ticket";
import { howToPlay, tutorial } from "./howto";
import { emo } from "./emo";

export type PanelHost = {
  root: HTMLElement;
  save: Save;
  close: () => void;
  next: (fromIndex: number) => void;
  reopen: (index: number) => void;
  changed: () => void;
  toast: (t: string) => void;
};

const FLOORS = ["floor-wood", "floor-carpet", "floor-tiles", "floor-metal", "floor-green", "floor-parquet", "floor-marble"];
const HOLD_MS = 380;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", html = "") => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
};

type Snap = { board: (Cell | null)[]; notes: Record<string, number[]>; marks: Cell[] };

export function openCase(host: PanelHost, index: number) {
  const c = CASES[index];
  const l = c.layout;
  const n = l.n;
  const sol = SOLUTIONS[c.id];
  const figs = figuresOf(c);
  const N = figs.length;
  const S = host.save;
  const letter = (f: number) => (figs[f].item ? "★" : figs[f].name[0]);
  const color = (f: number) => (figs[f].item ? "#FFC857" : hero(figs[f].id).color);
  const avatar = (f: number) => (figs[f].item ? (c.item.img ? emo(c.item.img) : c.item.icon) : emo(hero(figs[f].id).img));

  const scene = el("section", "case-scene");
  scene.setAttribute("role", "dialog");
  scene.setAttribute("aria-label", `${c.wagon}: ${c.title}`);
  host.root.appendChild(scene);
  const snow = snowCanvas(scene);

  let started = performance.now();
  let timerRaf = 0;
  const finish = () => {
    if (!S.solved[c.id] && isOpen(index)) S.ms[c.id] = (S.ms[c.id] || 0) + (performance.now() - started);
    save(S);
    cancelAnimationFrame(timerRaf);
    snow.stop();
    scene.remove();
    removeEventListener("keydown", onKey);
    host.close();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape" && !scene.querySelector(".htp-bg")) finish();
    if ((e.ctrlKey || e.metaKey) && e.key === "z") undo();
  };
  addEventListener("keydown", onKey);

  // ---------- Шапка ----------
  const head = el("header", "cs-head");
  head.innerHTML = `<button class="cs-back" aria-label="Leave the car">← Back to train</button>
    <div class="cs-title"><span>Case #${c.num} · ${c.wagon}</span><b>${isOpen(index) ? c.title : "This car is still locked"}</b></div>
    <div class="cs-timer" aria-label="Time">0:00</div>
    <button class="cs-how">How to play</button>`;
  scene.appendChild(head);
  head.querySelector<HTMLButtonElement>(".cs-back")!.onclick = finish;
  head.querySelector<HTMLButtonElement>(".cs-how")!.onclick = () => howToPlay(scene);

  if (!isOpen(index)) {
    const lock = el("div", "cs-locked");
    lock.innerHTML = `<div class="lock-card"><div class="lock-ic">🔒</div><h2>Opens ${c.dateLabel.replace(/,.*/, "")}</h2>
      <p>${c.segment}. A new case opens every working day from December 21 to 25 — missed ones stay available.</p>
      <div class="ticket-wrap">${ticketSvg(CASES.map((cc) => !!S.solved[cc.id]), null)}</div></div>`;
    scene.appendChild(lock);
    return { close: finish };
  }
  if (S.solved[c.id]) {
    renderReveal(false);
    return { close: finish };
  }

  // ---------- Состояние ----------
  const board: (Cell | null)[] = S.board[c.id]?.length === N ? S.board[c.id].slice() : new Array(N).fill(null);
  let notes: Record<string, number[]> = structuredClone(S.notes[c.id] || {});
  let marks = new Set<Cell>(S.marks[c.id] || []);
  let selected: number | null = null;
  let mode: "note" | "x" | "erase" = "note";
  const history: Snap[] = [];
  const hintList = buildHints(l, figs, sol.clues);
  let hintIdx = -1;

  const snap = (): Snap => ({ board: board.slice(), notes: structuredClone(notes), marks: [...marks] });
  const push = () => {
    history.push(snap());
    if (history.length > 200) history.shift();
  };
  const persist = () => {
    S.board[c.id] = board.slice();
    S.notes[c.id] = notes;
    S.marks[c.id] = [...marks];
    save(S);
  };
  const undo = () => {
    const h = history.pop();
    if (!h) return host.toast("Nothing to undo");
    board.splice(0, N, ...h.board);
    notes = h.notes;
    marks = new Set(h.marks);
    persist();
    draw();
  };

  // ---------- Разметка ----------
  const body = el("div", "cs-body");
  scene.appendChild(body);

  // Карточки подозреваемых
  const cards = el("div", "cs-cards");
  body.appendChild(cards);
  const cardEls = figs.map((f, fi) => {
    const card = el("button", `sus ${f.item ? "item" : ""}`);
    const h = f.item ? null : hero(f.id);
    card.innerHTML = `<div class="portrait" style="--c:${color(fi)}"><span class="emo">${avatar(fi)}</span><span class="ok" aria-hidden="true">✓</span>
        <span class="ribbon">${f.item ? "Evidence" : f.name}</span></div>
      <div class="sus-meta">${h ? `${h.role}` : c.item.name}</div>
      <div class="sus-clue">${clueHtml(l, figs, fi, sol.clues[fi])}</div>`;
    card.title = h ? `${h.trait} Works from ${h.from}.` : "Where the evidence was found";
    card.onclick = () => select(fi);
    cardDrag(card, fi);
    cards.appendChild(card);
    return card;
  });
  const victim = el("div", "sus-rule", `<b>The culprit</b> is the only suspect who ended up <b>in the same zone as the evidence</b>.`);
  cards.appendChild(victim);

  // Поле
  const center = el("div", "cs-center");
  body.appendChild(center);
  const frame = el("div", "board-frame");
  center.appendChild(frame);
  frame.appendChild(garlandSvg());
  const boardEl = el("div", "board2");
  boardEl.style.setProperty("--n", String(n));
  frame.appendChild(boardEl);
  const colLabels = el("div", "coords top", Array.from({ length: n }, (_, i) => `<span>${i + 1}</span>`).join(""));
  const rowLabels = el("div", "coords left", Array.from({ length: n }, (_, i) => `<span>${ROWS[i]}</span>`).join(""));
  const compass = el("div", "compass", `<span>N</span>`);
  compass.title = "North is up, like on a map";
  boardEl.append(colLabels, rowLabels, compass);
  if (l.windows) boardEl.append(el("div", "win-strip top"), el("div", "win-strip bottom"));
  const grid = el("div", "grid2");
  boardEl.appendChild(grid);
  const zoneIdx = (ch: string) => l.zones.findIndex((z) => z.ch === ch);
  const cells: HTMLElement[] = [];
  for (let i = 0; i < n * n; i++) {
    const [r, col] = rc(n, i);
    const d = el("div", `c2 ${FLOORS[zoneIdx(zoneAt(l, i)) % FLOORS.length]}`);
    d.dataset.i = String(i);
    const z = zoneAt(l, i);
    const wall = (rr: number, cc: number) => rr < 0 || cc < 0 || rr >= n || cc >= n || l.regions[rr][cc] !== z;
    if (wall(r - 1, col)) d.classList.add("wt");
    if (wall(r + 1, col)) d.classList.add("wb");
    if (wall(r, col - 1)) d.classList.add("wl");
    if (wall(r, col + 1)) d.classList.add("wr");
    const k = kindAt(l, i);
    if (k) d.innerHTML = `<span class="furn" title="${k.name}${k.blocked ? " — occupied" : ""}">${k.img ? emo(k.img) : k.icon}</span>`;
    if (isBlocked(l, i)) d.classList.add("blocked");
    d.setAttribute("aria-label", `${cellName(n, i)}${k ? ", " + k.name : ""}`);
    grid.appendChild(d);
    cells.push(d);
  }
  // подписи зон — в первой клетке зоны, отдельным слоем поверх поля
  const labels = el("div", "zone-labels");
  boardEl.appendChild(labels);
  for (const z of l.zones) {
    const first = l.regions.join("").indexOf(z.ch);
    const [r, col] = rc(n, first);
    const lab = el("div", "zone-label", z.name);
    lab.style.left = `calc(var(--cell) * ${col})`;
    lab.style.top = `calc(var(--cell) * ${r})`;
    labels.appendChild(lab);
  }

  // Подсказка
  const hintBox = el("div", "hint-box hidden");
  center.appendChild(hintBox);
  const msg = el("div", "cs-msg hidden");
  center.appendChild(msg);

  // Инструменты
  const tools = el("div", "cs-tools");
  tools.innerHTML = `<div class="tl-cap">Tools</div>
    <button class="tl" data-t="x" aria-pressed="false"><span class="ic">✕</span><span>Cross out</span></button>
    <button class="tl" data-t="erase" aria-pressed="false"><span class="ic">🧽</span><span>Eraser<small>hold to clear all</small></span><i class="hold"></i></button>
    <button class="tl" data-t="undo"><span class="ic">↶</span><span>Undo</span></button>
    <button class="tl hint" data-t="hint"><span class="ic">💡</span><span>Hint</span></button>
    <button class="tl submit" data-t="submit" disabled><span>Check</span><small>place everyone first</small></button>`;
  body.appendChild(tools);
  const tBtn = (t: string) => tools.querySelector<HTMLButtonElement>(`[data-t="${t}"]`)!;
  const setMode = (m: typeof mode) => {
    mode = mode === m ? "note" : m;
    tBtn("x").setAttribute("aria-pressed", String(mode === "x"));
    tBtn("erase").setAttribute("aria-pressed", String(mode === "erase"));
    scene.dataset.mode = mode;
  };
  tBtn("x").onclick = () => setMode("x");
  tBtn("undo").onclick = undo;
  tBtn("hint").onclick = () => showHint(Math.min(hintIdx + 1, hintList.length - 1));
  tBtn("submit").onclick = submit;
  // ластик: короткое нажатие — режим, удержание — стереть всё
  {
    const b = tBtn("erase");
    let t = 0;
    let fired = false;
    b.addEventListener("pointerdown", () => {
      fired = false;
      b.classList.add("holding");
      t = window.setTimeout(() => {
        fired = true;
        b.classList.remove("holding");
        push();
        board.fill(null);
        notes = {};
        marks.clear();
        persist();
        draw();
        host.toast("Board cleared");
      }, 900);
    });
    const cancel = () => {
      clearTimeout(t);
      b.classList.remove("holding");
    };
    b.addEventListener("pointerup", () => {
      cancel();
      if (!fired) setMode("erase");
    });
    b.addEventListener("pointerleave", cancel);
  }

  // ---------- Действия с клетками ----------
  function select(f: number | null) {
    selected = f;
    if (f !== null && window.innerWidth <= 900) boardEl.scrollIntoView({ behavior: "smooth", block: "center" });
    draw();
  }
  function place(f: number, cell: Cell) {
    if (isBlocked(l, cell)) return host.toast(`${kindAt(l, cell)!.name}: nobody can stand here`);
    push();
    const other = board.indexOf(cell);
    if (other >= 0) board[other] = null;
    board[f] = cell;
    delete notes[cell];
    marks.delete(cell);
    persist();
    draw(cell);
    if (navigator.vibrate) navigator.vibrate(12);
  }
  function eraseCell(cell: Cell) {
    const who = board.indexOf(cell);
    if (who < 0 && !notes[cell] && !marks.has(cell)) return;
    push();
    if (who >= 0) board[who] = null;
    delete notes[cell];
    marks.delete(cell);
    persist();
    draw();
  }
  // кисть: что делать с клетками при протаскивании (решается по первой клетке)
  let paint: "add" | "remove" | null = null;
  function applyBrush(cell: Cell, first: boolean) {
    if (isBlocked(l, cell) || board.includes(cell)) return;
    if (mode === "x") {
      if (first) paint = marks.has(cell) ? "remove" : "add";
      if (paint === "add") marks.add(cell);
      else marks.delete(cell);
    } else if (mode === "note" && selected !== null) {
      const list = notes[cell] || [];
      if (first) paint = list.includes(selected) ? "remove" : "add";
      const next = paint === "add" ? [...new Set([...list, selected])] : list.filter((x) => x !== selected);
      if (next.length) notes[cell] = next;
      else delete notes[cell];
    }
  }
  let down: { cell: Cell; t: number; moved: boolean; held: boolean; timer: number } | null = null;
  const cellAt = (e: PointerEvent) => {
    const t = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest(".c2") as HTMLElement | null;
    return t && grid.contains(t) ? Number(t.dataset.i) : null;
  };
  grid.addEventListener("pointerdown", (e) => {
    const cell = cellAt(e);
    if (cell === null) return;
    e.preventDefault();
    grid.setPointerCapture(e.pointerId);
    down = { cell, t: performance.now(), moved: false, held: false, timer: 0 };
    cells[cell].classList.add("press");
    if (mode === "note" && selected !== null && !isBlocked(l, cell)) {
      down.timer = window.setTimeout(() => {
        if (!down || down.moved) return;
        down.held = true;
        cells[cell].classList.remove("press");
        place(selected!, cell);
      }, HOLD_MS);
    }
  });
  grid.addEventListener("pointermove", (e) => {
    if (!down) return;
    const cell = cellAt(e);
    if (cell === null || cell === down.cell && !down.moved) return;
    if (!down.moved) {
      // начало протаскивания: красим и первую клетку
      down.moved = true;
      clearTimeout(down.timer);
      cells[down.cell].classList.remove("press");
      if (mode === "erase") return;
      push();
      applyBrush(down.cell, true);
    }
    if (mode === "erase") return;
    applyBrush(cell, false);
    draw();
  });
  const up = () => {
    if (!down) return;
    clearTimeout(down.timer);
    cells[down.cell].classList.remove("press");
    const d = down;
    down = null;
    paint = null;
    if (d.moved) {
      persist();
      draw();
      return;
    }
    if (d.held) return;
    tap(d.cell);
  };
  grid.addEventListener("pointerup", up);
  grid.addEventListener("pointercancel", up);
  grid.addEventListener("contextmenu", (e) => e.preventDefault());

  function tap(cell: Cell) {
    const who = board.indexOf(cell);
    if (mode === "erase") return eraseCell(cell);
    if (mode === "x") {
      if (who >= 0 || isBlocked(l, cell)) return;
      push();
      applyBrush(cell, true);
      persist();
      return draw();
    }
    if (who >= 0 && who !== selected) return select(who);
    if (selected === null) return host.toast("Pick a character on the left first");
    if (isBlocked(l, cell)) return host.toast(`${kindAt(l, cell)!.name}: nobody can stand here`);
    if (who === selected) return host.toast("To remove a character, use the eraser or Undo");
    push();
    applyBrush(cell, true);
    persist();
    draw();
    hintOnce("That’s a note. To place a character, press and hold the cell");
  }
  let hinted = false;
  function hintOnce(t: string) {
    if (hinted || board[selected!] !== null) return;
    hinted = true;
    host.toast(t);
  }

  // Перетаскивание карточки на поле — тоже ставит персонажа
  function cardDrag(card: HTMLElement, fi: number) {
    card.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse") return;
      const sx = e.clientX, sy = e.clientY;
      let ghost: HTMLElement | null = null;
      const move = (m: PointerEvent) => {
        if (!ghost && Math.hypot(m.clientX - sx, m.clientY - sy) > 8) {
          ghost = el("div", "drag-ghost", avatar(fi));
          ghost.style.setProperty("--c", color(fi));
          document.body.appendChild(ghost);
        }
        if (ghost) {
          ghost.style.left = m.clientX + "px";
          ghost.style.top = m.clientY + "px";
        }
      };
      const upH = (u: PointerEvent) => {
        removeEventListener("pointermove", move);
        removeEventListener("pointerup", upH);
        if (!ghost) return;
        ghost.remove();
        const t = (document.elementFromPoint(u.clientX, u.clientY) as HTMLElement | null)?.closest(".c2") as HTMLElement | null;
        if (t && grid.contains(t)) {
          selected = fi;
          place(fi, Number(t.dataset.i));
        }
      };
      addEventListener("pointermove", move);
      addEventListener("pointerup", upH);
    });
  }

  // ---------- Подсказки ----------
  function showHint(i: number) {
    if (!hintList.length) return;
    hintIdx = i;
    S.hintAt[c.id] = Math.max(S.hintAt[c.id] ?? -1, i);
    S.hints[c.id] = (S.hintAt[c.id] ?? -1) + 1;
    save(S);
    const h = hintList[i];
    hintBox.classList.remove("hidden");
    hintBox.innerHTML = `<div class="hb-head"><b>💡 Hint ${i + 1}/${hintList.length}</b><button class="hb-x" aria-label="Close hint">✕</button></div>
      <p>${h.text}</p><div class="hb-nav"><button class="hb-prev" ${i === 0 ? "disabled" : ""}>‹ Back</button><button class="hb-next" ${i === hintList.length - 1 ? "disabled" : ""}>Next ›</button></div>`;
    hintBox.querySelector<HTMLButtonElement>(".hb-x")!.onclick = () => {
      hintIdx = Math.max(-1, hintIdx);
      hintBox.classList.add("hidden");
      draw();
    };
    hintBox.querySelector<HTMLButtonElement>(".hb-prev")!.onclick = () => showHint(i - 1);
    hintBox.querySelector<HTMLButtonElement>(".hb-next")!.onclick = () => showHint(i + 1);
    draw();
  }

  // ---------- Проверка ----------
  function submit() {
    if (board.some((x) => x === null)) return;
    const wrong = board.filter((x, f) => x !== sol.pos[f]).length;
    if (wrong) {
      msg.className = "cs-msg bad";
      msg.innerHTML = `<b>Not quite yet.</b> ${wrong === 1 ? "One character is" : `${wrong} characters are`} in the wrong place. Re-read the clues — or take a hint.`;
      setTimeout(() => msg.classList.add("hidden"), 5000);
      return;
    }
    // раскрыто
    S.ms[c.id] = (S.ms[c.id] || 0) + (performance.now() - started);
    started = performance.now();
    S.solved[c.id] = { at: Date.now(), ms: S.ms[c.id], hints: S.hints[c.id] || 0 };
    save(S);
    host.changed();
    const culprit = c.suspects.indexOf(c.culprit);
    const z = zoneAt(l, board[N - 1]!);
    cells.forEach((d, i) => d.classList.toggle("zone-hl", zoneAt(l, i) === z));
    scene.classList.add("solved");
    cells[board[culprit]!].classList.add("culprit");
    cells[board[N - 1]!].classList.add("culprit");
    msg.className = "cs-msg good";
    msg.innerHTML = `<b>Case solved!</b> ${hero(c.culprit).name} was the only one ${l.zones.find((zz) => zz.ch === z)!.in} with the evidence.`;
    setTimeout(() => renderReveal(true), 2200);
  }

  // ---------- Отрисовка ----------
  function draw(justPlaced?: Cell) {
    const used = new Set<number>();
    board.forEach((cell) => {
      if (cell === null) return;
      const [r, col] = rc(n, cell);
      for (let k = 0; k < n; k++) {
        used.add(r * n + k);
        used.add(k * n + col);
      }
    });
    const hint = hintIdx >= 0 && !hintBox.classList.contains("hidden") ? hintList[hintIdx] : null;
    cells.forEach((d, i) => {
      d.querySelector(".tok")?.remove();
      d.querySelector(".notes")?.remove();
      d.querySelector(".xm")?.remove();
      const who = board.indexOf(i);
      d.classList.toggle("sel-cell", selected !== null && board[selected] === i);
      d.classList.toggle("hint-place", !!hint && hint.place.cell === i);
      d.classList.toggle("hint-cross", !!hint && hint.crossed.includes(i));
      if (who >= 0) {
        const t = el("div", `tok ${figs[who].item ? "item" : ""} ${who === selected ? "sel" : ""} ${justPlaced === i ? "pop" : ""}`);
        t.style.setProperty("--c", color(who));
        t.innerHTML = `<span class="emo">${avatar(who)}</span><span class="nm">${figs[who].item ? "evidence" : figs[who].name}</span>`;
        d.appendChild(t);
        return;
      }
      if (isBlocked(l, i)) return;
      const ns = notes[i];
      if (ns?.length) {
        const box = el("div", "notes");
        box.innerHTML = ns.map((f) => `<i style="color:${color(f)}">${letter(f)}</i>`).join("");
        d.appendChild(box);
      }
      if (marks.has(i)) d.appendChild(el("span", "xm", "✕"));
      else if (used.has(i) && !ns?.length) d.appendChild(el("span", "xm auto", "✕"));
    });
    cardEls.forEach((card, fi) => {
      card.classList.toggle("sel", fi === selected);
      card.classList.toggle("placed", board[fi] !== null);
    });
    const all = board.every((x) => x !== null);
    const sb = tBtn("submit");
    sb.disabled = !all;
    sb.querySelector("small")!.textContent = all ? "everyone is placed" : `${board.filter((x) => x === null).length} left to place`;
    scene.dataset.sel = selected === null ? "" : "1";
  }

  // таймер
  const timerEl = head.querySelector(".cs-timer")!;
  const tick = () => {
    const ms = (S.ms[c.id] || 0) + (performance.now() - started);
    const s = Math.floor(ms / 1000);
    timerEl.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
    timerRaf = requestAnimationFrame(tick);
  };
  tick();

  // фигуры с первой улики: выбрать первого не расставленного
  const firstFree = board.findIndex((x) => x === null);
  selected = firstFree >= 0 ? firstFree : null;
  draw();
  if (!S.tutorialSeen) {
    tutorial(scene, () => {
      S.tutorialSeen = true;
      save(S);
    });
  }
  return { close: finish };

  // ---------- Развязка ----------
  function renderReveal(fresh: boolean) {
    scene.querySelector(".cs-body")?.remove();
    cancelAnimationFrame(timerRaf);
    const tEl = head.querySelector(".cs-timer");
    if (tEl) tEl.textContent = fmtTime(S.solved[c.id].ms);
    const h = hero(c.culprit);
    const r = S.solved[c.id];
    const last = index === CASES.length - 1;
    const have = CASES.map((cc) => !!S.solved[cc.id]);
    const wrap = el("div", "cs-reveal");
    wrap.innerHTML = `
      <div class="rv-hero"><div class="portrait big" style="--c:${h.color}"><span class="emo">${emo(h.img)}</span><span class="ribbon">${h.name}</span></div>
        <div><div class="rv-k">${fresh ? "Case solved" : "Solved case"} · ${c.wagon}</div><h2>${h.name} · ${h.role}</h2></div></div>
      <div class="rv-text">${c.reveal.map((p) => `<p>${p}</p>`).join("")}</div>
      <div class="rv-tiles">
        <div class="tile g"><div class="v">${fmtTime(r.ms)}</div><div class="l">to solve</div></div>
        <div class="tile y"><div class="v">${r.hints}</div><div class="l">${r.hints === 1 ? "hint" : "hints"}</div></div>
        <div class="tile"><div class="v">${have.filter(Boolean).length}/5</div><div class="l">ticket pieces</div></div>
      </div>
      <div class="rv-ticket"><div class="rv-tk">${fresh ? `🎟️ You get <b>piece ${c.num}</b> of the ticket` : `🎟️ You have piece ${c.num} of the ticket`} · 🗒️ ${c.evidence}</div>
        <div class="ticket-wrap">${ticketSvg(have, null, { animateIndex: fresh ? index : undefined })}</div></div>
      <div class="rv-actions"></div>`;
    const actions = wrap.querySelector(".rv-actions")!;
    const go = el("button", "btn primary", last ? "To the finale →" : "Next car →");
    go.onclick = () => {
      snow.stop();
      cancelAnimationFrame(timerRaf);
      scene.remove();
      removeEventListener("keydown", onKey);
      host.next(index);
    };
    const again = el("button", "btn", "↺ Solve again");
    again.onclick = () => {
      delete S.solved[c.id];
      S.board[c.id] = [];
      S.marks[c.id] = [];
      S.notes[c.id] = {};
      S.ms[c.id] = 0;
      S.hints[c.id] = 0;
      S.hintAt[c.id] = -1;
      save(S);
      snow.stop();
      scene.remove();
      removeEventListener("keydown", onKey);
      host.reopen(index);
    };
    actions.append(go, again);
    scene.appendChild(wrap);
    head.querySelector(".cs-title b")!.textContent = c.title;
  }
}

/** Гирлянда над полем: провод и мерцающие лампочки. */
function garlandSvg() {
  const d = el("div", "frame-garland");
  const cols = ["#FFC857", "#e5484d", "#3EE0B4", "#6CCFF6", "#ffffff"];
  const y = (k: number) => 12 + Math.sin(k * Math.PI * 4) * 7;
  const wire = Array.from({ length: 41 }, (_, i) => `${(i / 40) * 1000},${y(i / 40).toFixed(1)}`).join(" ");
  d.innerHTML =
    `<svg viewBox="0 0 1000 34" preserveAspectRatio="none"><polyline points="${wire}" stroke="#1d3b2c" stroke-width="2" fill="none" vector-effect="non-scaling-stroke"/></svg>` +
    Array.from({ length: 25 }, (_, i) => {
      const k = i / 24;
      return `<i style="left:${k * 100}%;top:${y(k) + 2}px;--b:${cols[i % 5]};animation-delay:${((i * 0.37) % 2).toFixed(2)}s"></i>`;
    }).join("");
  return d;
}

/** Лёгкий снег на фоне сцены. */
function snowCanvas(parent: HTMLElement) {
  const cv = el("canvas", "cs-snow");
  parent.appendChild(cv);
  const g = cv.getContext("2d")!;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const flakes = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 2.2 + 0.6, s: Math.random() * 0.3 + 0.15, w: Math.random() * 6.28 }));
  let raf = 0;
  const frame = (t: number) => {
    const w = (cv.width = cv.clientWidth * devicePixelRatio), h = (cv.height = cv.clientHeight * devicePixelRatio);
    g.clearRect(0, 0, w, h);
    g.fillStyle = "rgba(255,255,255,.75)";
    for (const f of flakes) {
      if (!reduce) {
        f.y += f.s / 600;
        f.x += Math.sin(t / 1500 + f.w) / 4000;
        if (f.y > 1.02) f.y = -0.02;
      }
      g.beginPath();
      g.arc(f.x * w, f.y * h, f.r * devicePixelRatio, 0, 6.28);
      g.fill();
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return { stop: () => cancelAnimationFrame(raf) };
}
