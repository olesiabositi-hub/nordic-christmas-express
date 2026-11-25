// Текстуры, нарисованные на canvas: без внешних файлов.
import * as THREE from "three";

export function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, srgb = true) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Мягкое круглое пятно: снежинки, свечения, пар. */
export const softDot = () =>
  canvasTex(128, 128, (g) => {
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, "rgba(255,255,255,1)");
    r.addColorStop(0.35, "rgba(255,255,255,0.55)");
    r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r;
    g.fillRect(0, 0, 128, 128);
  });

/** Тёплое пятно света из окон на снегу. */
export const warmSpill = () =>
  canvasTex(256, 64, (g) => {
    const lin = g.createLinearGradient(0, 0, 0, 64);
    lin.addColorStop(0, "rgba(255,190,110,0.95)");
    lin.addColorStop(1, "rgba(255,150,70,0)");
    g.fillStyle = lin;
    g.fillRect(0, 0, 256, 64);
    // окна: чуть ярче полосы
    for (let i = 0; i < 8; i++) {
      const x = 16 + i * 30;
      const r = g.createRadialGradient(x + 8, 6, 0, x + 8, 6, 30);
      r.addColorStop(0, "rgba(255,210,140,0.6)");
      r.addColorStop(1, "rgba(255,210,140,0)");
      g.fillStyle = r;
      g.fillRect(x - 24, 0, 64, 64);
    }
    // по краям гасим, чтобы не было резкой рамки
    g.globalCompositeOperation = "destination-in";
    const e = g.createLinearGradient(0, 0, 256, 0);
    e.addColorStop(0, "rgba(0,0,0,0)");
    e.addColorStop(0.12, "rgba(0,0,0,1)");
    e.addColorStop(0.88, "rgba(0,0,0,1)");
    e.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = e;
    g.fillRect(0, 0, 256, 64);
  });

/** Снег: едва заметные неровности и искры. */
export const snowTex = () => {
  const t = canvasTex(512, 512, (g) => {
    g.fillStyle = "#e9f0fa";
    g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 2200; i++) {
      const x = Math.random() * 512, y = Math.random() * 512, r = Math.random() * 22 + 4;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      const shade = Math.random() < 0.5 ? "205,218,238" : "250,252,255";
      gr.addColorStop(0, `rgba(${shade},0.18)`);
      gr.addColorStop(1, `rgba(${shade},0)`);
      g.fillStyle = gr;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(255,255,255,${Math.random() * 0.9})`;
      g.fillRect(Math.random() * 512, Math.random() * 512, 1, 1);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
};

/** Мягкий конус луча прожектора. */
export const beamTex = () =>
  canvasTex(64, 256, (g) => {
    const lin = g.createLinearGradient(0, 0, 0, 256);
    lin.addColorStop(0, "rgba(255,240,210,0.0)");
    lin.addColorStop(0.15, "rgba(255,240,210,0.55)");
    lin.addColorStop(1, "rgba(255,240,210,0)");
    g.fillStyle = lin;
    g.fillRect(0, 0, 64, 256);
    g.globalCompositeOperation = "destination-in";
    const e = g.createLinearGradient(0, 0, 64, 0);
    e.addColorStop(0, "rgba(0,0,0,0)");
    e.addColorStop(0.5, "rgba(0,0,0,1)");
    e.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = e;
    g.fillRect(0, 0, 64, 256);
  });
