// Mascot icons: standard Unicode emoji (no third-party brand assets).
const EMOJI: Record<string, string> = {
  eyes: "👀", fire: "🔥", tulip: "🌷", bell: "🔔", sputnik: "🛰️", go: "🚀", heart: "💜", ghost: "👻",
  arrow: "🧭", ufo: "🛸", tangerine: "🍊", battery: "🔋", drink: "🥤", ham: "🍖", xmastree: "🎄",
  fir: "🌲", popper: "🎉", gingerbread: "🍪", mitten: "🧤", snowball: "❄️", reindeer: "🦌", aurora: "🌌",
  sauna: "🧖", kantele: "🪕", coffee: "☕", sled: "🛷",
};
export const emo = (name: string, cls = "e") => `<span class="${cls}" aria-hidden="true">${EMOJI[name] ?? name}</span>`;
