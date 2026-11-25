// The Nordic Christmas Express ticket: five pieces, one per solved case.
// In the finale the whole ticket shows a slot for the gift code.
import { CASES } from "../story/cases";

const W = 600, H = 250;
const PIECE = W / 5;

/** Рваный край между частями: зигзаг. */
function edge(x: number, seed: number) {
  const pts: string[] = [];
  for (let y = 0; y <= H; y += 12.5) {
    const k = Math.round(y / 12.5);
    pts.push(`${x + (k % 2 ? 5 : -5) + ((seed * 7 + k * 3) % 3) - 1},${y}`);
  }
  return pts;
}

function piecePath(i: number) {
  // левый край сверху вниз, затем правый край снизу вверх
  const leftDown = i === 0 ? ["0,0", `0,${H}`] : edge(i * PIECE, i);
  const rightUp = i === 4 ? [`${W},${H}`, `${W},0`] : edge((i + 1) * PIECE, i + 1).reverse();
  return `M${leftDown.join(" L")} L${rightUp.join(" L")} Z`;
}

/**
 * SVG билета. have — какие части уже есть (по индексам дел), code — подарочный код (или null).
 */
export function ticketSvg(have: boolean[], code: string | null, opts: { animateIndex?: number } = {}) {
  const pieces = CASES.map((c, i) => {
    const got = have[i];
    const id = `tp${i}`;
    return `
      <clipPath id="${id}"><path d="${piecePath(i)}"/></clipPath>
      <g class="piece ${got ? "got" : "missing"} ${opts.animateIndex === i ? "fresh" : ""}" data-i="${i}">
        ${got ? `<g clip-path="url(#${id})"><use href="#ticketArt"/></g>` : `<path d="${piecePath(i)}" fill="rgba(255,255,255,.04)" stroke="rgba(255,255,255,.28)" stroke-width="2" stroke-dasharray="6 6"/>
          <text x="${i * PIECE + PIECE / 2}" y="${H / 2 - 6}" text-anchor="middle" font-size="26">${c.num}</text>
          <text x="${i * PIECE + PIECE / 2}" y="${H / 2 + 20}" text-anchor="middle" font-size="11" fill="rgba(255,255,255,.55)" font-family="Manrope, sans-serif">${c.dateLabel.split(",")[0]}</text>`}
      </g>`;
  }).join("");
  return `<svg class="ticket-svg" viewBox="-8 -8 ${W + 16} ${H + 16}" role="img" aria-label="Nordic Christmas Express ticket: ${have.filter(Boolean).length} of 5 pieces collected">
    <defs>
      <pattern id="guil" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M0 8 Q4 0 8 8 T16 8" fill="none" stroke="#2F6BFF" stroke-opacity=".12" stroke-width="1.2"/></pattern>
      <g id="ticketArt">
        <rect width="${W}" height="${H}" rx="18" fill="#F3F6FB"/>
        <rect width="${W}" height="${H}" rx="18" fill="url(#guil)"/>
        <rect width="${W}" height="58" rx="18" fill="#0F1E3D"/>
        <rect y="40" width="${W}" height="18" fill="#0F1E3D"/>
        <rect y="54" width="${W}" height="4" fill="#3EE0B4"/>
        <text x="24" y="38" font-family="Manrope, sans-serif" font-weight="800" font-size="24" fill="#fff">The Nordic Christmas Express</text>
        <text x="${W - 24}" y="37" text-anchor="end" font-family="Manrope, sans-serif" font-weight="700" font-size="14" fill="#3EE0B4">NORDVIA · № 2027</text>
        <text x="24" y="92" font-family="Manrope, sans-serif" font-size="13" fill="#6E7A8C">From — To</text>
        <text x="24" y="118" font-family="Manrope, sans-serif" font-weight="800" font-size="22" fill="#0F1E3D">Helsinki → Rovaniemi</text>
        <text x="24" y="150" font-family="Manrope, sans-serif" font-size="13" fill="#6E7A8C">Departure</text>
        <text x="24" y="172" font-family="Manrope, sans-serif" font-weight="700" font-size="17" fill="#0F1E3D">31.12.2026 · 23:59</text>
        <text x="236" y="150" font-family="Manrope, sans-serif" font-size="13" fill="#6E7A8C">Cars</text>
        <text x="236" y="172" font-family="Manrope, sans-serif" font-weight="700" font-size="17" fill="#0F1E3D">1–5 · mystery</text>
        <g transform="translate(24 192)">${Array.from({ length: 38 }, (_, k) => `<rect x="${k * 6}" width="${k % 3 ? 2 : 4}" height="34" fill="#0F1E3D"/>`).join("")}</g>
        <rect x="372" y="78" width="204" height="150" rx="14" fill="#3EE0B4"/>
        <text x="474" y="108" text-anchor="middle" font-family="Manrope, sans-serif" font-weight="700" font-size="14" fill="#0F1E3D">Your gift</text>
        <text x="474" y="160" text-anchor="middle" font-family="Manrope, sans-serif" font-weight="800" font-size="${code ? 26 : 30}" letter-spacing="2" fill="#0F1E3D">${code ?? "SOON"}</text>
        <text x="474" y="200" text-anchor="middle" font-family="Manrope, sans-serif" font-size="12" fill="#0F1E3D">code unlocks in the finale</text>
        <circle cx="0" cy="${H / 2}" r="12" fill="#0B1220"/><circle cx="${W}" cy="${H / 2}" r="12" fill="#0B1220"/>
      </g>
    </defs>
    ${pieces}
  </svg>`;
}
