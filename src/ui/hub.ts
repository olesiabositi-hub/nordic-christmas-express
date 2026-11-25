// Интерфейс поверх мира: шапка, плашки вагонов, лента вагонов, мини-карта, модалки.
import { CASES } from "../story/cases";
import { DEMO, fmtTime, isOpen, PREVIEW, resetAll, save, type Save } from "../state";
import { openCase } from "./caseScene";
import { ticketSvg } from "./ticket";
import { emo } from "./emo";
import { STOPS as ROUTE_STOPS } from "../world/landmarks";
import { setSound, soundOn, unlockAudio } from "../audio";

type WorldApi = {
  screenOf: (i: number) => { x: number; y: number; visible: boolean };
  setLocked: (i: number, locked: boolean) => void;
  focus: (i: number, onArrive: () => void) => void;
  unfocus: () => void;
  finale: (onArrive: () => void) => void;
  leaveFinale: () => void;
  route: () => { p: number; pos: number; from: string; to: string; here: string | null };
  readonly mode: string;
};

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", html = "") => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
};

const STATIONS = [
  { name: "Helsinki", x: 92, y: 182 },
  { name: "Lahti", x: 104, y: 156 },
  { name: "Savonlinna", x: 178, y: 140 },
  { name: "Varkaus", x: 146, y: 116 },
  { name: "Kuopio", x: 158, y: 86 },
  { name: "Rovaniemi", x: 112, y: 24 },
];

export function createHub(root: HTMLElement, world: WorldApi, S: Save) {
  const solvedCount = () => Object.keys(S.solved).length;
  const currentIndex = () => {
    // demo: the first unsolved car is "next"; live: the newest opened car
    if (DEMO) {
      const k = CASES.findIndex((c) => !S.solved[c.id]);
      return k < 0 ? CASES.length - 1 : k;
    }
    let i = 0;
    CASES.forEach((_, k) => isOpen(k) && (i = k));
    return i;
  };

  // ---------- Шапка ----------
  const top = el("header", "top");
  top.innerHTML = `<div class="brand"><div class="brand-mark" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M7 25V7l18 18V7" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div><span class="brand-co">NORDVIA</span><h1>The Nordic Christmas Express</h1><p>The last release train of the year · Helsinki → Rovaniemi · Dec 21–25</p></div></div>
    <div class="spacer"></div>${PREVIEW && !DEMO ? `<span class="preview-badge hide-sm">Preview: all cars unlocked</span>` : ""}
    <span class="progress-pill"><span class="hide-sm">Solved </span><b class="pc">0</b><span class="hide-sm"> of 5</span><span class="show-sm">/5</span></span>
    <button class="icon-btn hide-sm" data-a="sound" aria-label="Sound"></button>
    <button class="icon-btn" data-a="ticket">🎟️<span class="hide-sm"> Ticket</span></button>
    <button class="icon-btn" data-a="notes">🗒️<span class="hide-sm"> Notebook</span></button>
    <button class="icon-btn" data-a="rules">❔<span class="hide-sm"> Rules</span></button>`;
  root.appendChild(top);
  top.querySelector<HTMLButtonElement>('[data-a="notes"]')!.onclick = () => showNotes();
  top.querySelector<HTMLButtonElement>('[data-a="ticket"]')!.onclick = () => showTicket();
  top.querySelector<HTMLButtonElement>('[data-a="rules"]')!.onclick = () => showRules();
  const soundBtn = top.querySelector<HTMLButtonElement>('[data-a="sound"]')!;
  const paintSound = () => (soundBtn.textContent = soundOn() ? "🔊" : "🔇");
  paintSound();
  soundBtn.onclick = () => {
    setSound(!soundOn());
    paintSound();
  };
  // браузеры дают включить звук только после первого действия игрока
  addEventListener("pointerdown", () => unlockAudio(), { once: true });

  // ---------- Плашка над вагоном ----------
  const tag = el("div", "car-tag hidden", `<div class="bubble"></div><div class="tail"></div>`);
  root.appendChild(tag);
  let tagFor: number | null = null;

  // ---------- Лента вагонов (от хвоста к паровозу) ----------
  const strip = el("nav", "cars");
  strip.setAttribute("aria-label", "Cars");
  root.appendChild(strip);

  // ---------- Мини-карта ----------
  const map = el("div", "minimap");
  root.appendChild(map);
  map.onclick = () => map.classList.toggle("big");

  const toast = (t: string) => {
    const d = el("div", "toast", t);
    root.appendChild(d);
    setTimeout(() => d.remove(), 3300);
  };

  let panel: { close: () => void } | null = null;
  const host = {
    root,
    save: S,
    toast,
    close: () => {
      panel = null;
      world.unfocus();
      showChrome(true);
      refresh();
    },
    next: (from: number) => {
      panel = null;
      refresh();
      if (from === CASES.length - 1) {
        startFinale();
        return;
      }
      const nxt = from + 1;
      if (isOpen(nxt) && !S.solved[CASES[nxt].id]) {
        world.unfocus();
        setTimeout(() => enter(nxt), 1900);
      } else {
        world.unfocus();
        showChrome(true);
        if (!isOpen(nxt)) toast(`The next car opens ${CASES[nxt].dateLabel.replace(/,.*/, "")}`);
      }
    },
    changed: () => refresh(),
    reopen: (i: number) => {
      panel = openCase(host, i);
    },
  };

  function showChrome(on: boolean) {
    strip.classList.toggle("hidden", !on);
    map.classList.toggle("hidden", !on);
    if (!on) tag.classList.add("hidden");
  }

  function enter(i: number) {
    if (panel) return;
    showChrome(false);
    world.focus(i, () => {
      panel = openCase(host, i);
    });
  }

  function refresh() {
    top.querySelector(".pc")!.textContent = String(solvedCount());
    strip.innerHTML = "";
    const cur = currentIndex();
    CASES.forEach((c, i) => {
      const open = isOpen(i);
      const solved = !!S.solved[c.id];
      world.setLocked(i, !open);
      const b = el("button", `car-btn ${solved ? "solved" : ""} ${!open ? "locked" : ""} ${open && !solved && i === cur ? "today" : ""}`);
      b.innerHTML = `<span class="k">Car ${c.num} · ${c.dateLabel}</span><span class="t">${c.wagon}</span><span class="s">${solved ? "✓ Solved" : open ? (i === cur ? "● New case" : "Ready to investigate") : "🔒 Locked until " + c.dateLabel.replace(/,.*/, "")}</span>`;
      b.onclick = () => enter(i);
      b.onmouseenter = () => (tagFor = i);
      b.onmouseleave = () => (tagFor = null);
      strip.appendChild(b);
    });
    drawMap();
  }

  function drawMap() {
    const solved = CASES.map((c) => !!S.solved[c.id]);
    const cur = currentIndex();
    const seg = (i: number) => `M${STATIONS[i].x},${STATIONS[i].y} L${STATIONS[i + 1].x},${STATIONS[i + 1].y}`;
    void cur;
    lastWhere = "";
    map.innerHTML = `<div class="cap"><span>Train now</span><b class="where">Helsinki</b></div>
    <svg viewBox="0 0 270 200" role="img" aria-label="Train route map: Helsinki to Rovaniemi">
      <defs><linearGradient id="mmAur" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3EE0B4" stop-opacity="0"/><stop offset=".5" stop-color="#3EE0B4" stop-opacity=".35"/><stop offset="1" stop-color="#8B7CFF" stop-opacity="0"/></linearGradient></defs>
      <rect width="270" height="200" fill="#111A2B"/>
      <path d="M0,0 L58,0 C52,24 44,40 46,62 C48,84 30,102 22,124 C16,140 6,150 0,156 Z" fill="#1B3354"/>
      <path d="M0,200 L0,190 C40,184 70,196 104,192 C150,186 200,198 270,188 L270,200 Z" fill="#1B3354"/>
      <g fill="#1B3354">${[[170, 146, 16, 6], [192, 132, 10, 5], [150, 128, 9, 4], [132, 150, 12, 4], [168, 100, 8, 4], [120, 132, 7, 3]].map(([x, y, rx, ry]) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}"/>`).join("")}</g>
      <text x="14" y="70" fill="#5f7fa8" font-size="9" font-weight="700" font-family="Manrope, sans-serif" transform="rotate(-62 14 70)">Gulf of Bothnia</text>
      <text x="168" y="197" fill="#5f7fa8" font-size="9" font-weight="700" font-family="Manrope, sans-serif">Gulf of Finland</text>
      <text x="196" y="160" fill="#5f7fa8" font-size="9" font-weight="700" font-family="Manrope, sans-serif">Saimaa</text>
      <rect x="0" y="6" width="270" height="22" fill="url(#mmAur)"/>
      <path d="M0,40 L270,40" stroke="#8fb3ff" stroke-width="1" stroke-dasharray="3 4" opacity=".45"/>
      <text x="200" y="36" fill="#8fb3ff" font-size="8.5" font-weight="700" font-family="Manrope, sans-serif" opacity=".8">Arctic Circle</text>
      ${CASES.map((_, i) => `<path d="${seg(i)}" stroke="${solved[i] ? "#3EE0B4" : "#3a4a63"}" stroke-width="${solved[i] ? 5 : 4}" stroke-linecap="round" ${solved[i] ? "" : 'stroke-dasharray="2 6"'}/>`).join("")}
      ${STATIONS.map((s, i) => `<g><circle cx="${s.x}" cy="${s.y}" r="5" fill="#fff"/><circle cx="${s.x}" cy="${s.y}" r="2.4" fill="${i <= cur ? "#2F6BFF" : "#6e7a8c"}"/>
        <text x="${s.x + 8}" y="${s.y + 4}" fill="#EEF3F8" font-size="10" font-weight="700" font-family="Manrope, sans-serif">${s.name}</text></g>`).join("")}
      <circle class="pulse" r="12" fill="#3EE0B4" opacity=".35"/>
      <circle class="train" r="6.5" fill="#2F6BFF" stroke="#fff" stroke-width="2.5"/>
    </svg>`;
  }

  // ---------- Где поезд на карте: по реальному положению на маршруте ----------
  let lastWhere = "";
  const placeTrain = (t: number) => {
    const r = world.route();
    let i = 0;
    while (i < ROUTE_STOPS.length - 1 && r.pos >= ROUTE_STOPS[i + 1].at) i++;
    const a = ROUTE_STOPS[i], b = ROUTE_STOPS[i + 1];
    let k = 0;
    let p0 = STATIONS[i], p1 = STATIONS[i];
    if (b) {
      k = (r.pos - a.at) / (b.at - a.at);
      p1 = STATIONS[i + 1];
    } else {
      // after Rovaniemi the train starts a new loop: the dot glides back to Helsinki
      k = (r.pos - a.at) / (6400 - a.at);
      p0 = STATIONS[i];
      p1 = STATIONS[0];
    }
    const x = p0.x + (p1.x - p0.x) * k, y = p0.y + (p1.y - p0.y) * k;
    map.querySelectorAll<SVGCircleElement>("circle.train, circle.pulse").forEach((c) => {
      c.setAttribute("cx", x.toFixed(1));
      c.setAttribute("cy", y.toFixed(1));
    });
    const pulse = map.querySelector<SVGCircleElement>("circle.pulse");
    if (pulse) pulse.setAttribute("r", (9 + Math.sin(t * 4) * 3).toFixed(1));
    const where = r.here ?? (b ? `${a.name} → ${b.name}` : `${a.name} → new loop`);
    if (where !== lastWhere) {
      const w = map.querySelector(".where");
      if (w) w.textContent = where;
      lastWhere = where;
    }
  };

  // ---------- Плашка над вагоном следует за камерой ----------
  const tick = (now: number) => {
    placeTrain(now / 1000);
    const show = tagFor !== null && !panel && world.mode === "hub";
    tag.classList.toggle("hidden", !show);
    if (show) {
      const i = tagFor!;
      const c = CASES[i];
      const p = world.screenOf(i);
      tag.style.left = p.x + "px";
      tag.style.top = p.y + "px";
      const open = isOpen(i);
      tag.querySelector(".bubble")!.innerHTML = `<span class="num ${open ? "" : "lock"}">${open ? "#" + c.num : "🔒"}</span>${c.wagon}<small>${S.solved[c.id] ? "solved" : open ? c.title : c.dateLabel}</small>`;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  // ---------- Модалки ----------
  function modal(html: string, onClose?: () => void, side = false) {
    const bg = el("div", `modal-bg ${side ? "side" : ""}`);
    const m = el("div", "modal", html);
    bg.appendChild(m);
    root.appendChild(bg);
    const close = () => {
      bg.remove();
      onClose?.();
    };
    bg.addEventListener("click", (e) => e.target === bg && close());
    m.querySelectorAll<HTMLElement>("[data-close]").forEach((b) => (b.onclick = close));
    return { m, close };
  }

  function showIntro() {
    modal(
      `<div class="hero-banner"><div class="k">NORDVIA · A mystery in five cars</div><h2>The Nordic Christmas Express</h2><div class="hero-emo">${["xmastree", "reindeer", "eyes", "mitten", "aurora", "popper"].map((n) => emo(n)).join("")}</div></div>
      <p class="lead">December 31st, night. NORDVIA’s last release train of the year is crossing Finland from Helsinki to Rovaniemi. At exactly 00:00 it has to ship the release to production.</p>
      <p class="lead">But something goes wrong in every car. A new case opens every working day from December 21 to 25. Place the suspects using the clues and find the culprit — from Helsinki, Lisbon or anywhere your team works.</p>
      <div class="row"><button class="btn primary" data-close>All aboard</button><button class="btn" data-rules>How to play</button></div>`,
      () => {
        S.introSeen = true;
        save(S);
      },
    ).m.querySelector<HTMLButtonElement>("[data-rules]")!.onclick = (e) => {
      (e.target as HTMLElement).closest(".modal-bg")!.remove();
      S.introSeen = true;
      save(S);
      showRules();
    };
  }

  function showTicket() {
    const have = CASES.map((c) => !!S.solved[c.id]);
    const n = have.filter(Boolean).length;
    modal(`<h2>Your Nordic Christmas Express ticket</h2>
      <p class="lead" style="font-size:16px">${n === 5 ? "Ticket complete! Your gift code is printed on it." : `Pieces collected: ${n} of 5. Every solved case adds a piece. Collect all five and a gift code appears on the ticket in the finale.`}</p>
      <div class="ticket-wrap">${ticketSvg(have, null)}</div>
      <div class="row"><button class="btn primary" data-close>Got it</button></div>`);
  }

  function showRules() {
    modal(`<h2>How to solve a case</h2>
      <div class="rule"><span class="n">1</span><span>A new car opens every day. Inside is a case: a floor plan of the car split into cells and zones (compartments, aisle, kitchen).</span></div>
      <div class="rule"><span class="n">2</span><span>Place every suspect and the evidence. <b>Exactly one per row and one per column.</b></span></div>
      <div class="rule"><span class="n">3</span><span>Occupied cells (hatched: tables, shelving, stoves) can’t be used. Chairs and berths can.</span></div>
      <div class="rule"><span class="n">4</span><span>Everyone has a statement about where they were. “Next to” means the neighbouring cell left, right, above or below <b>in the same zone</b>. “North of” means higher on the plan.</span></div>
      <div class="rule"><span class="n">5</span><span><b>The culprit is the only suspect in the same zone as the evidence.</b></span></div>
      <div class="rule"><span class="n">6</span><span>Every solved case is a piece of your ticket. Collect all five and a gift code appears on it in the finale.</span></div>
      <p class="lead" style="font-size:15px">Tap a cell to add a note, press and hold to place a character. Full help is under “How to play” inside each car. Every case has exactly one solution you can reach by logic. Progress is saved in this browser.</p>
      <div class="row"><button class="btn primary" data-close>Got it</button></div>`);
  }

  function showNotes() {
    const items = CASES.map((c) => {
      const s = S.solved[c.id];
      return `<div class="note ${s ? "" : "locked"}"><span class="ic">${s ? "🗒️" : "❔"}</span><div><small>Car ${c.num} · ${c.wagon}</small>${s ? `<b>${c.evidence}</b> · ${fmtTime(s.ms)}` : isOpen(c.num - 1) ? "Not solved yet" : "Opens " + c.dateLabel.replace(/,.*/, "")}</div></div>`;
    }).join("");
    const { m } = modal(`<h2>Detective’s notebook</h2><p class="lead" style="font-size:15px">Evidence from solved cases. They seem to be connected.</p>${items}
      <p style="color:var(--muted);font-size:13px">Santas caught: ${S.santa}</p>
      <div class="row"><button class="btn" data-close>Close</button>${S.solved[CASES[4].id] ? `<button class="btn primary" data-finale>Replay the finale</button>` : ""}<button class="btn" data-reset style="margin-left:auto;color:var(--muted)">Reset progress</button></div>`);
    const f = m.querySelector<HTMLButtonElement>("[data-finale]");
    if (f) f.onclick = () => {
      (m.parentElement as HTMLElement).remove();
      startFinale();
    };
    const rb = m.querySelector<HTMLButtonElement>("[data-reset]")!;
    rb.onclick = () => {
      // confirm() в некоторых встраиваниях запрещён — подтверждаем вторым нажатием
      if (rb.dataset.armed) {
        resetAll();
        location.reload();
      } else {
        rb.dataset.armed = "1";
        rb.textContent = "Really erase? Tap again";
        rb.style.color = "var(--red)";
      }
    };
  }

  function startFinale() {
    showChrome(false);
    world.finale(() => {
      const total = Object.values(S.solved).reduce((a, s) => a + s.ms, 0);
      const hints = Object.values(S.solved).reduce((a, s) => a + s.hints, 0);
      S.finaleSeen = true;
      save(S);
      modal(
        `<div class="hero-banner"><div class="k">00:00 · January 1, 2027 · Hyvää uutta vuotta!</div><h2>Release delivered</h2><div class="hero-emo">${["popper", "xmastree", "aurora", "reindeer", "snowball", "popper"].map((n) => emo(n)).join("")}</div></div>
        <p class="lead">The train has stopped just past the Arctic Circle. The whole team stepped out into the snow — and a Christmas tree lit up right on NORDVIA’s live map. That was the secret feature everyone had been building all week.</p>
        <div class="tiles"><div class="tile g"><div class="v">${fmtTime(total)}</div><div class="l">across all cases</div></div>
          <div class="tile y"><div class="v">${hints}</div><div class="l">hints used</div></div>
          <div class="tile"><div class="v">${S.santa}</div><div class="l">Santas caught</div></div></div>
        <p class="lead" style="font-size:16px;margin:14px 0 8px">All five pieces collected. Your gift code is on the ticket.</p>
        <div class="ticket-wrap">${ticketSvg(CASES.map(() => true), "SOON")}</div>
        <div class="row"><button class="btn primary" data-close>Admire the tree</button></div>`,
        () => {
          setTimeout(() => {
            world.leaveFinale();
            showChrome(true);
          }, 12000);
        },
        true,
      );
    });
  }

  const SANTA_LINES = ["Joulupukki approved your deploy 🎅", "Santa: “LGTM” 🎅", "Santa is in code freeze until January 7 🎅", "Santa set your ticket priority to “holiday” 🎅", "Santa closed all your tickets. Just kidding 🎅", "Santa checked: it works on his sleigh too 🎅"];
  function santaCaught() {
    S.santa++;
    save(S);
    toast(S.santa === 5 ? "Achievement: Santa catcher! 🦌 Five of five" : `${SANTA_LINES[S.santa % SANTA_LINES.length]} · caught: ${S.santa}`);
  }

  refresh();
  return {
    showIntroIfNeeded: () => !S.introSeen && showIntro(),
    hover: (i: number | null) => (tagFor = i),
    select: (i: number) => enter(i),
    santaCaught,
  };
}
