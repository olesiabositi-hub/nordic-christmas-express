// Ретро-состав: тёмно-зелёный паровоз с красным низом и неоновой снежинкой, вагоны в гирляндах.
// Поезд смотрит в +X и стоит на месте: едет мир.
import * as THREE from "three";
import { beamTex, softDot, warmSpill } from "./tex";

const GREEN = "#2b6b4d";
const RED = "#a3262b";
const GOLD = "#c9a24a";
const WARM = new THREE.Color(2.6, 1.45, 0.62);

export type Car = {
  caseIndex: number;
  group: THREE.Group;
  lid: THREE.Group; // крыша, которая поднимается
  pick: THREE.Mesh;
  paint: THREE.MeshStandardMaterial;
  inside: THREE.PointLight;
  wheels: THREE.Mesh[];
  open: number; // 0..1 текущее
  openTarget: number;
  hover: number;
  hoverTarget: number;
  locked: boolean;
  lockMat: THREE.MeshBasicMaterial; // окна
  x: number;
  len: number;
  wheelR: number[];
};

const std = (color: THREE.ColorRepresentation, o: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.15, ...o });

function box(w: number, h: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}

function wheel(r: number, mat: THREE.Material) {
  const g = new THREE.CylinderGeometry(r, r, 0.16, 18).rotateX(Math.PI / 2);
  const m = new THREE.Mesh(g, mat);
  // спицы, чтобы вращение было видно
  const spokeMat = new THREE.MeshStandardMaterial({ color: "#2a1414", roughness: 0.6 });
  for (let i = 0; i < 3; i++) {
    const sp = new THREE.Mesh(new THREE.BoxGeometry(r * 1.7, 0.09, 0.18), spokeMat);
    sp.rotation.z = (i * Math.PI) / 3;
    m.add(sp);
  }
  return m;
}

/** Гирлянда: общий InstancedMesh, лампочки мерцают. */
class Garland {
  pts: THREE.Vector3[] = [];
  mesh!: THREE.InstancedMesh;
  base: THREE.Color[] = [];
  add(a: THREE.Vector3, b: THREE.Vector3, step = 0.32, sag = 0.12) {
    const n = Math.max(2, Math.round(a.distanceTo(b) / step));
    for (let i = 0; i <= n; i++) {
      const p = a.clone().lerp(b, i / n);
      // провисание между точками крепления
      p.y -= Math.sin(((i % 4) / 4) * Math.PI) * sag;
      this.pts.push(p);
    }
  }
  build(parent: THREE.Object3D) {
    const palette = [new THREE.Color(3, 2.2, 1.1), new THREE.Color(3, 0.5, 0.4), new THREE.Color(0.6, 2.6, 0.9), new THREE.Color(3, 2.6, 0.6), new THREE.Color(0.9, 1.6, 3.2)];
    this.mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), this.pts.length);
    const m = new THREE.Matrix4();
    this.pts.forEach((p, i) => {
      m.makeTranslation(p.x, p.y, p.z);
      this.mesh.setMatrixAt(i, m);
      const c = palette[i % 5 === 0 ? 1 : i % 7 === 0 ? 2 : i % 11 === 0 ? 4 : 0].clone();
      this.base.push(c);
      this.mesh.setColorAt(i, c);
    });
    parent.add(this.mesh);
  }
  twinkle(t: number) {
    const c = new THREE.Color();
    for (let i = 0; i < this.base.length; i++) {
      const k = 0.55 + 0.45 * Math.sin(t * 3 + i * 1.7) * Math.sin(t * 1.3 + i * 0.37);
      c.copy(this.base[i]).multiplyScalar(0.35 + 0.65 * Math.max(0, k));
      this.mesh.setColorAt(i, c);
    }
    this.mesh.instanceColor!.needsUpdate = true;
  }
}

function interior(kind: number, len: number, w: number, y0: number) {
  // простая обстановка: видна, когда поднимается крыша
  const g = new THREE.Group();
  const wood = std("#6b4128", { roughness: 0.8 });
  const seat = std("#7a2430", { roughness: 0.9 });
  const metal = std("#5b6270", { metalness: 0.6, roughness: 0.4 });
  const floor = box(len - 0.3, 0.05, w - 0.2, std("#4a2f22", { roughness: 0.9 }), 0, y0 + 0.03, 0);
  g.add(floor);
  const runner = box(len - 1, 0.02, 0.7, std("#8a1f2a", { roughness: 1 }), 0, y0 + 0.07, kind === 2 ? 0.55 : 0);
  g.add(runner);
  const n = 4;
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + 1.3 + i * ((len - 2.6) / (n - 1));
    if (kind === 0) {
      g.add(box(1.1, 1.0, 0.9, std(["#b07a43", "#9c6a3b", "#c48f53"][i % 3], { roughness: 1 }), x, y0 + 0.5, -0.7));
      g.add(box(0.9, 0.7, 0.8, std("#a5713f", { roughness: 1 }), x + 0.3, y0 + 0.35, 0.75));
      g.add(box(0.5, 1.8, 0.5, metal, x - 0.6, y0 + 0.9, 0.9));
    } else if (kind === 1 || kind === 2) {
      g.add(box(1.7, 0.45, 0.75, seat, x, y0 + 0.4, -0.85));
      g.add(box(0.12, 1.9, 1.8, wood, x + 0.95, y0 + 0.95, -0.35));
      g.add(box(0.5, 0.06, 0.6, wood, x, y0 + 0.75, -1.05));
      if (kind === 1) g.add(box(1.6, 0.35, 0.55, seat, x, y0 + 0.35, 1.0));
    } else {
      g.add(box(0.9, 0.06, 1.0, std("#f2ede4"), x, y0 + 0.78, -0.75));
      g.add(box(0.12, 0.78, 0.12, wood, x, y0 + 0.39, -0.75));
      g.add(box(0.9, 0.06, 1.0, std("#f2ede4"), x, y0 + 0.78, 0.75));
      g.add(box(0.12, 0.78, 0.12, wood, x, y0 + 0.39, 0.75));
      const candle = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2, 0.8) }));
      candle.position.set(x, y0 + 0.88, -0.75);
      g.add(candle);
    }
  }
  return g;
}

export function makeTrain(scene: THREE.Scene) {
  const train = new THREE.Group();
  scene.add(train);
  const garland = new Garland();
  const glow = softDot();
  const spill = warmSpill();
  const cars: Car[] = [];
  const allWheels: { m: THREE.Mesh; r: number }[] = [];
  const windowMats: THREE.MeshBasicMaterial[] = [];

  // ---------- Вагоны ----------
  const W = 2.7;
  const H = 2.9;
  const Y0 = 1.45; // пол вагона
  const LEN = 10;
  const GAP = 0.8;
  const LOCO = 14;
  const front = 29;
  const order = [3, 2, 1, 0]; // от паровоза к хвосту: ресторан, купе, плацкарт, багажный

  const wheelMat = std(RED, { roughness: 0.45, metalness: 0.4 });
  const darkMat = std("#16181c", { roughness: 0.8 });

  order.forEach((caseIndex, i) => {
    const x = front - LOCO - GAP - LEN / 2 - i * (LEN + GAP);
    const g = new THREE.Group();
    g.position.x = x;
    train.add(g);
    const paint = std(GREEN, { roughness: 0.45, metalness: 0.25 });
    const red = std(RED, { roughness: 0.5 });
    // стенки и торцы (сверху вагон открыт — внутрь заглядываем через крышу)
    for (const z of [-1, 1]) {
      g.add(box(LEN, H, 0.1, paint, 0, Y0 + H / 2, z * (W / 2 - 0.05)));
      g.add(box(LEN + 0.02, 0.38, 0.12, red, 0, Y0 + 0.3, z * (W / 2 - 0.04)));
      g.add(box(LEN + 0.02, 0.05, 0.13, std("#e9dcc0"), 0, Y0 + 0.55, z * (W / 2 - 0.04)));
    }
    for (const xx of [-1, 1]) g.add(box(0.1, H, W, paint, xx * (LEN / 2 - 0.05), Y0 + H / 2, 0));
    g.add(box(LEN, 0.1, W, darkMat, 0, Y0, 0));
    // переходы-гармошки
    g.add(box(0.5, 2.2, 1.6, darkMat, -LEN / 2 - 0.25, Y0 + 1.2, 0));
    // окна
    const winMat = new THREE.MeshBasicMaterial({ color: WARM.clone() });
    windowMats.push(winMat);
    for (const z of [-1, 1]) {
      for (let k = 0; k < 8; k++) {
        const wx = -LEN / 2 + 0.9 + k * ((LEN - 1.8) / 7);
        const win = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.8), winMat);
        win.position.set(wx, Y0 + 1.75, z * (W / 2 + 0.012));
        if (z < 0) win.rotation.y = Math.PI;
        g.add(win);
        const frame = box(0.94, 0.96, 0.02, std("#d8c79e", { metalness: 0.5 }), wx, Y0 + 1.75, z * (W / 2 - 0.004));
        g.add(frame);
      }
    }
    g.add(interior(caseIndex, LEN, W, Y0));
    // крыша-крышка
    const lid = new THREE.Group();
    lid.position.y = Y0 + H;
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, LEN + 0.2, 24, 1).rotateZ(Math.PI / 2), std("#2a2d33", { roughness: 0.7 }));
    roof.scale.set(1, 0.28, 1);
    lid.add(roof);
    const snowCap = new THREE.Mesh(new THREE.CylinderGeometry(1.22, 1.22, LEN - 0.2, 20, 1).rotateZ(Math.PI / 2), std("#f2f6ff", { roughness: 0.9 }));
    snowCap.scale.set(1, 0.2, 0.92);
    snowCap.position.y = 0.16;
    lid.add(snowCap);
    g.add(lid);
    // гирлянда по краям крыши
    for (const z of [-1, 1]) {
      garland.add(new THREE.Vector3(x - LEN / 2 + 0.2, Y0 + H + 0.05, z * (W / 2 + 0.06)), new THREE.Vector3(x + LEN / 2 - 0.2, Y0 + H + 0.05, z * (W / 2 + 0.06)));
    }
    // тележки и колёса
    const wheels: THREE.Mesh[] = [];
    for (const bx of [-LEN / 2 + 1.8, LEN / 2 - 1.8]) {
      g.add(box(2.6, 0.45, W - 0.5, darkMat, bx, 1.12, 0));
      for (const dx of [-0.7, 0.7])
        for (const z of [-1, 1]) {
          const wm = wheel(0.45, wheelMat);
          wm.position.set(bx + dx, 0.99, z * 0.78);
          g.add(wm);
          wheels.push(wm);
          allWheels.push({ m: wm, r: 0.45 });
        }
    }
    // свет из окон на снегу
    for (const z of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(LEN + 2, 4.5).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: spill, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }));
      if (z < 0) (p.geometry as THREE.BufferGeometry).rotateY(Math.PI);
      p.position.set(0, 0.06, z * (W / 2 + 2.3));
      g.add(p);
    }
    const inside = new THREE.PointLight("#ffb46a", 0, 9, 1.6);
    inside.position.set(0, Y0 + 2.2, 0);
    g.add(inside);
    const pick = new THREE.Mesh(new THREE.BoxGeometry(LEN + 0.6, H + 1.6, W + 0.8), new THREE.MeshBasicMaterial({ visible: false }));
    pick.position.y = Y0 + H / 2;
    pick.userData.caseIndex = caseIndex;
    g.add(pick);
    cars.push({ caseIndex, group: g, lid, pick, paint, inside, wheels, open: 0, openTarget: 0, hover: 0, hoverTarget: 0, locked: false, lockMat: winMat, x, len: LEN, wheelR: wheels.map(() => 0.45) });
  });

  // ---------- Паровоз ----------
  const loco = new THREE.Group();
  loco.position.x = front - LOCO / 2;
  train.add(loco);
  const lpaint = std(GREEN, { roughness: 0.35, metalness: 0.35 });
  const lred = std(RED, { roughness: 0.45, metalness: 0.3 });
  const black = std("#111215", { roughness: 0.5, metalness: 0.5 });
  const gold = std(GOLD, { roughness: 0.25, metalness: 0.9 });
  const fx = LOCO / 2; // нос
  // рама и путеочиститель
  loco.add(box(LOCO - 1, 0.55, 2.4, lred, -0.3, 1.0, 0));
  const pilotShape = new THREE.Shape();
  pilotShape.moveTo(0, 0);
  pilotShape.lineTo(1.1, 0);
  pilotShape.lineTo(0, 1.0);
  pilotShape.closePath();
  const pilot = new THREE.Mesh(new THREE.ExtrudeGeometry(pilotShape, { depth: 2.3, bevelEnabled: false }).translate(0, 0, -1.15), lred);
  pilot.position.set(fx - 0.9, 0.25, 0);
  loco.add(pilot);
  // котёл
  const boiler = new THREE.Mesh(new THREE.CylinderGeometry(1.12, 1.12, 6.6, 32).rotateZ(Math.PI / 2), lpaint);
  boiler.position.set(fx - 4.6, 2.45, 0);
  loco.add(boiler);
  for (const bx of [-6.9, -5.3, -3.7, -2.4]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(1.135, 0.04, 8, 40).rotateY(Math.PI / 2), gold);
    band.position.set(fx + bx, 2.45, 0);
    loco.add(band);
  }
  // дымовая коробка и лицо
  const smoke = new THREE.Mesh(new THREE.CylinderGeometry(1.22, 1.22, 1.4, 32).rotateZ(Math.PI / 2), black);
  smoke.position.set(fx - 0.95, 2.45, 0);
  loco.add(smoke);
  const face = new THREE.Mesh(new THREE.CircleGeometry(1.22, 40).rotateY(Math.PI / 2), std("#0b0c0e", { roughness: 0.6 }));
  face.position.set(fx - 0.24, 2.45, 0);
  loco.add(face);
  // неоновая снежинка
  const neon = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.8, 3.4) });
  const flake = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const arm = new THREE.Group();
    arm.rotation.x = (i * Math.PI) / 3;
    const bar = box(0.03, 0.9, 0.05, neon, 0, 0.45, 0);
    arm.add(bar);
    for (const sgn of [-1, 1]) {
      const br = box(0.03, 0.3, 0.04, neon, 0, 0.62, sgn * 0.1);
      br.rotation.x = sgn * 0.75;
      arm.add(br);
      const br2 = box(0.03, 0.2, 0.04, neon, 0, 0.34, sgn * 0.07);
      br2.rotation.x = sgn * 0.75;
      arm.add(br2);
    }
    flake.add(arm);
  }
  flake.position.set(fx - 0.2, 2.45, 0);
  loco.add(flake);
  // неоновые завитки под снежинкой
  const swirlMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 1.8, 0.5) });
  for (const sgn of [-1, 1]) {
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.025, 6, 24, Math.PI * 1.5).rotateY(Math.PI / 2), swirlMat);
    arc.position.set(fx - 0.2, 1.55, sgn * 0.45);
    arc.rotation.x = sgn * 0.8;
    loco.add(arc);
  }
  loco.add(box(0.04, 0.04, 1.6, swirlMat, fx - 0.2, 1.32, 0));
  // труба, купола
  const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.3, 1.3, 20), black);
  chimney.position.set(fx - 1.1, 4.05, 0);
  loco.add(chimney);
  for (const [dx, r] of [[-3.2, 0.48], [-5.0, 0.42]] as const) {
    const dome = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), gold);
    dome.position.set(fx + dx, 3.5, 0);
    dome.scale.y = 1.2;
    loco.add(dome);
  }
  // прожектор
  const lampHouse = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.5, 20).rotateZ(Math.PI / 2), black);
  lampHouse.position.set(fx - 0.45, 3.85, 0);
  loco.add(lampHouse);
  const lampGlass = new THREE.Mesh(new THREE.CircleGeometry(0.27, 24).rotateY(Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 3.6, 2.8) }));
  lampGlass.position.set(fx - 0.19, 3.85, 0);
  loco.add(lampGlass);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: new THREE.Color(1.6, 1.4, 1.0), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.position.set(fx + 0.2, 3.85, 0);
  halo.scale.setScalar(3.4);
  loco.add(halo);
  for (const z of [-0.8, 0.8]) {
    const small = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.4, 1.5) }));
    small.position.set(fx - 0.1, 1.25, z);
    loco.add(small);
  }
  const spot = new THREE.SpotLight("#ffe2b0", 260, 90, 0.42, 0.55, 1.4);
  spot.position.set(fx + 0.2, 3.85, 0);
  spot.target.position.set(fx + 40, 0, 0);
  loco.add(spot, spot.target);
  // луч в снегу
  const beam = new THREE.Mesh(new THREE.ConeGeometry(4.5, 34, 24, 1, true).rotateZ(Math.PI / 2), new THREE.MeshBasicMaterial({ map: beamTex(), transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  beam.position.set(fx + 17, 2.6, 0);
  beam.rotation.z = -0.05;
  loco.add(beam);
  // будка машиниста
  const cabX = -LOCO / 2 + 4.4;
  const cab = new THREE.Group();
  cab.position.x = cabX;
  loco.add(cab);
  for (const z of [-1, 1]) cab.add(box(2.6, 2.9, 0.1, lpaint, 0, 2.95, z * 1.3));
  cab.add(box(0.1, 2.9, 2.6, lpaint, 1.25, 2.95, 0));
  cab.add(box(0.1, 1.4, 2.6, lpaint, -1.25, 2.2, 0));
  const cabWin = new THREE.MeshBasicMaterial({ color: WARM.clone() });
  windowMats.push(cabWin);
  for (const z of [-1, 1]) {
    const w1 = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.85), cabWin);
    w1.position.set(0.2, 3.5, z * 1.36);
    if (z < 0) w1.rotation.y = Math.PI;
    cab.add(w1);
  }
  for (const z of [-0.6, 0.6]) {
    const fw = new THREE.Mesh(new THREE.CircleGeometry(0.3, 18).rotateY(Math.PI / 2), cabWin);
    fw.position.set(1.31, 3.7, z);
    cab.add(fw);
  }
  cab.add(interiorCab());
  const cabLid = new THREE.Group();
  cabLid.position.y = 4.45;
  const cabRoof = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 3.0, 24).rotateZ(Math.PI / 2), std("#2a2d33"));
  cabRoof.scale.set(1, 0.22, 0.95);
  cabLid.add(cabRoof);
  const cabSnow = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 2.7, 20).rotateZ(Math.PI / 2), std("#f2f6ff", { roughness: 0.9 }));
  cabSnow.scale.set(1, 0.16, 0.9);
  cabSnow.position.y = 0.12;
  cabLid.add(cabSnow);
  cab.add(cabLid);
  // тендер
  const tx = -LOCO / 2 + 1.5;
  loco.add(box(2.8, 2.1, 2.6, lpaint, tx, 2.2, 0));
  loco.add(box(2.82, 0.35, 2.62, lred, tx, 1.35, 0));
  const coal = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2, 0), std("#1a1a1c", { roughness: 1 }));
  coal.scale.set(1.1, 0.45, 0.95);
  coal.position.set(tx, 3.3, 0);
  loco.add(coal);
  const coalSnow = new THREE.Mesh(new THREE.DodecahedronGeometry(1.0, 0), std("#eef3fb", { roughness: 1 }));
  coalSnow.scale.set(1.0, 0.3, 0.8);
  coalSnow.position.set(tx, 3.55, 0);
  loco.add(coalSnow);
  // колёса паровоза
  const locoWheels: THREE.Mesh[] = [];
  for (const z of [-1, 1]) {
    for (const [wx, r] of [[fx - 2.3, 0.5], [fx - 4.0, 0.82], [fx - 5.8, 0.82], [fx - 7.6, 0.82], [tx - 0.7, 0.45], [tx + 0.7, 0.45]] as const) {
      const wm = wheel(r, wheelMat);
      wm.position.set(wx, r + 0.55, z * 1.12);
      wm.userData.wheel = true;
      loco.add(wm);
      locoWheels.push(wm);
      allWheels.push({ m: wm, r });
    }
    // шатун
    const rod = box(3.8, 0.12, 0.08, std("#c7ccd6", { metalness: 0.9, roughness: 0.2 }), fx - 5.8, 1.37, z * 1.25);
    rod.userData.rod = true;
    rod.userData.wheel = true;
    loco.add(rod);
  }
  // гирлянда паровоза
  for (const z of [-1, 1]) {
    garland.add(new THREE.Vector3(front - LOCO + 0.2, 3.78, z * 1.36), new THREE.Vector3(front - LOCO + 2.9, 3.78, z * 1.36));
    garland.add(new THREE.Vector3(front - 7.5, 3.45, z * 1.02), new THREE.Vector3(front - 1.6, 3.45, z * 1.02), 0.3, 0.06);
    garland.add(new THREE.Vector3(front - LOCO + 3.1, 4.95, z * 1.48), new THREE.Vector3(front - LOCO + 5.7, 4.95, z * 1.48), 0.3, 0.05);
  }
  const locoPaint = lpaint;
  const locoInside = new THREE.PointLight("#ffb46a", 0, 7, 1.6);
  locoInside.position.set(0, 3.6, 0);
  cab.add(locoInside);
  const locoPick = new THREE.Mesh(new THREE.BoxGeometry(LOCO + 0.4, 5, 3.4), new THREE.MeshBasicMaterial({ visible: false }));
  locoPick.position.y = 2.5;
  locoPick.userData.caseIndex = 4;
  loco.add(locoPick);
  cars.unshift({ caseIndex: 4, group: loco, lid: cabLid, pick: locoPick, paint: locoPaint, inside: locoInside, wheels: locoWheels, open: 0, openTarget: 0, hover: 0, hoverTarget: 0, locked: false, lockMat: cabWin, x: front - LOCO / 2, len: LOCO, wheelR: [] });
  // свет от паровоза на снегу
  for (const z of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(6, 3.5).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: spill, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
    p.position.set(cabX, 0.06, z * 3);
    loco.add(p);
  }

  // корпус паровоза над колёсами
  for (const ch of loco.children) if (!ch.userData.wheel) ch.position.y += 0.45;
  garland.build(train);

  const chimneyWorld = new THREE.Vector3(front - 1.1, 5.25, 0);
  let gt = 0;
  const rods = loco.children.filter((c) => c.userData.rod);

  return {
    group: train,
    cars,
    chimney: chimneyWorld,
    pickables: cars.map((c) => c.pick),
    carByCase: (i: number) => cars.find((c) => c.caseIndex === i)!,
    update(dt: number, t: number, speed: number) {
      for (const w of allWheels) w.m.rotation.z -= (speed * dt) / w.r;
      const ang = locoWheels[1]?.rotation.z ?? 0;
      rods.forEach((r, i) => {
        r.position.y = 1.37 + Math.sin(ang + i * Math.PI) * 0.32;
        r.position.x = fx - 5.8 + Math.cos(ang + i * Math.PI) * 0.32;
      });
      cars.forEach((c, i) => {
        c.group.position.y = Math.sin(t * 9 + i * 1.3) * 0.012 + Math.sin(t * 2.1 + i) * 0.01;
        c.group.rotation.x = Math.sin(t * 1.4 + i * 0.8) * 0.004;
        c.open += (c.openTarget - c.open) * Math.min(1, dt * 3);
        c.hover += (c.hoverTarget - c.hover) * Math.min(1, dt * 8);
        const o = c.open;
        c.lid.position.y = (c.caseIndex === 4 ? 4.45 : Y0 + H) + o * 3.2;
        c.lid.rotation.x = o * 0.35;
        c.lid.position.z = -o * 0.9;
        c.inside.intensity = o * 18;
        c.paint.emissive.set("#2BCFA4");
        c.paint.emissiveIntensity = c.hover * 0.35;
        c.lockMat.color.copy(WARM).multiplyScalar(c.locked ? 0.25 : 1);
      });
      gt += dt;
      if (gt > 0.08) {
        garland.twinkle(t);
        gt = 0;
      }
      flake.rotation.x = Math.sin(t * 0.4) * 0.05;
      neon.color.setRGB(2.4, 2.8, 3.4).multiplyScalar(0.9 + 0.1 * Math.sin(t * 6) * Math.sin(t * 2.3));
      halo.material.opacity = 0.85 + 0.15 * Math.sin(t * 13);
    },
    windowMats,
  };
}

function interiorCab() {
  const g = new THREE.Group();
  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.2, 2.0), std("#3a3f48", { metalness: 0.5 }));
  panel.position.set(1.0, 2.2, 0);
  g.add(panel);
  for (let i = 0; i < 5; i++) {
    const gauge = new THREE.Mesh(new THREE.CircleGeometry(0.1, 16).rotateY(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.0, 1.4) }));
    gauge.position.set(0.74, 2.5, -0.8 + i * 0.4);
    g.add(gauge);
  }
  const fire = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.7), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.5, 1.4, 0.3) }));
  fire.position.set(1.22, 2.0, 0);
  g.add(fire);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), std("#7a2430"));
  seat.position.set(0.2, 1.8, 0.7);
  g.add(seat);
  return g;
}
