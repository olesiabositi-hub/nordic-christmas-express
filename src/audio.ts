// Звук без файлов: гудок паровоза и стук колёс синтезируются WebAudio.
// Включается только после клика (так требуют браузеры), выключается кнопкой.

const KEY = "kodfriz-sound";
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let clackTimer = 0;
let moving = true;
/** Поезд стоит — колёса молчат. */
export const setTrainMoving = (m: boolean) => (moving = m);
let enabled = (() => {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
})();

let unlocked = false;
function ensure() {
  if (ctx || !enabled || !unlocked) return ctx;
  try {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
    startClack();
  } catch {
    ctx = null;
  }
  return ctx;
}

/** Вызвать из обработчика клика: разблокирует звук. */
export function unlockAudio() {
  unlocked = true;
  const c = ensure();
  if (c && c.state === "suspended") c.resume().catch(() => {});
}

export const soundOn = () => enabled;

export function setSound(on: boolean) {
  enabled = on;
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    /* ничего */
  }
  if (on) unlockAudio();
  if (master && ctx) master.gain.setTargetAtTime(on ? 0.55 : 0, ctx.currentTime, 0.1);
}

function noiseBuffer(c: AudioContext, sec: number) {
  const b = c.createBuffer(1, Math.floor(c.sampleRate * sec), c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

/** Паровозный гудок: аккорд из трёх «труб» с паровым шумом. Ту-ту-туууу. */
export function whistle() {
  const c = ensure();
  if (!c || !master || !enabled) return;
  const toots: [number, number][] = [[0, 0.35], [0.5, 0.35], [1.0, 1.7]];
  for (const [start, len] of toots) {
    const t0 = c.currentTime + start;
    const out = c.createGain();
    out.gain.setValueAtTime(0, t0);
    out.gain.linearRampToValueAtTime(0.22, t0 + 0.08);
    out.gain.setValueAtTime(0.22, t0 + len);
    out.gain.exponentialRampToValueAtTime(0.0001, t0 + len + 0.45);
    const bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 900;
    bp.Q.value = 0.8;
    bp.connect(out);
    out.connect(master);
    for (const f of [466, 587, 698]) {
      const o = c.createOscillator();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(f * 0.94, t0);
      o.frequency.linearRampToValueAtTime(f, t0 + 0.12);
      const g = c.createGain();
      g.gain.value = 0.18;
      o.connect(g).connect(bp);
      o.start(t0);
      o.stop(t0 + len + 0.5);
    }
    const n = c.createBufferSource();
    n.buffer = noiseBuffer(c, len + 0.5);
    const ng = c.createGain();
    ng.gain.value = 0.09;
    const hp = c.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 1800;
    n.connect(hp).connect(ng).connect(out);
    n.start(t0);
  }
}

/** Тихий стук колёс: пары ударов на стыках рельсов. */
function startClack() {
  if (!ctx || !master) return;
  const c = ctx;
  const buf = noiseBuffer(c, 0.08);
  const hit = (t: number, vol: number) => {
    const s = c.createBufferSource();
    s.buffer = buf;
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 420;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    s.connect(lp).connect(g).connect(master!);
    s.start(t);
  };
  const loop = () => {
    if (!ctx) return;
    if (enabled && moving && c.state === "running") {
      const t = c.currentTime + 0.05;
      hit(t, 0.12);
      hit(t + 0.13, 0.09);
    }
    clackTimer = window.setTimeout(loop, 900 + Math.random() * 80);
  };
  clearTimeout(clackTimer);
  loop();
}
