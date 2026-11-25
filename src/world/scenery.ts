// Бесконечная полоса мира: поезд стоит на месте, а мир едет под ним, как беговая дорожка.
// Две одинаковые полосы длиной L сменяют друг друга.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { snowTex, softDot } from "./tex";
import { graniteCliff } from "./horizon";
import { animateCrowd, festiveStation, lights, swag, treeSpiral, twinkleMaterial, type Crowd } from "./festive";

export const STRIP = 640;

let s = 7;
const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);

function colored(geo: THREE.BufferGeometry, col: THREE.Color) {
  const n = geo.attributes.position.count;
  const c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) c.set([col.r, col.g, col.b], i * 3);
  geo.setAttribute("color", new THREE.BufferAttribute(c, 3));
  return geo.index ? geo.toNonIndexed() : geo;
}

/** Ель: три яруса хвои с шапками снега и ствол — одна геометрия с цветами вершин. */
export function spruceGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  const green = new THREE.Color("#1d4a35");
  const green2 = new THREE.Color("#265a41");
  const snow = new THREE.Color("#eef4ff");
  parts.push(colored(new THREE.CylinderGeometry(0.18, 0.25, 1.2, 6).translate(0, 0.6, 0), new THREE.Color("#3a2a22")));
  const tiers = [
    { y: 1.0, r: 1.9, h: 2.4 },
    { y: 2.3, r: 1.45, h: 2.1 },
    { y: 3.45, r: 0.95, h: 1.9 },
  ];
  tiers.forEach((t, i) => {
    parts.push(colored(new THREE.ConeGeometry(t.r, t.h, 9).translate(0, t.y + t.h / 2, 0), i % 2 ? green2 : green));
    // снежная шапка: верхушка яруса чуть шире и белая
    parts.push(colored(new THREE.ConeGeometry(t.r * 0.62, t.h * 0.42, 9).translate(0, t.y + t.h * 0.79 + 0.04, 0), snow));
  });
  const g = mergeGeometries(parts)!;
  g.computeVertexNormals();
  return g;
}

function house(warm: THREE.Material) {
  const g = new THREE.Group();
  const w = 4 + rnd() * 2, d = 3.5 + rnd() * 1.5, h = 2.6 + rnd();
  const wallCol = ["#6b2b2b", "#2f4a3c", "#5a4632", "#3b4d6b"][Math.floor(rnd() * 4)];
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: wallCol, roughness: 0.9 }));
  body.position.y = h / 2;
  g.add(body);
  const shape = new THREE.Shape();
  shape.moveTo(-d / 2 - 0.35, 0);
  shape.lineTo(d / 2 + 0.35, 0);
  shape.lineTo(0, d * 0.55);
  shape.closePath();
  const rg = new THREE.ExtrudeGeometry(shape, { depth: w + 0.5, bevelEnabled: false });
  rg.translate(0, 0, -(w + 0.5) / 2);
  rg.rotateY(Math.PI / 2);
  const roof = new THREE.Mesh(rg, new THREE.MeshStandardMaterial({ color: "#f1f6ff", roughness: 0.8 }));
  roof.position.y = h;
  g.add(roof);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 2; i++) {
      if (rnd() < 0.25) continue;
      const win = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.9), warm);
      win.position.set(-w / 4 + (i * w) / 2, h * 0.55, side * (d / 2 + 0.01));
      if (side < 0) win.rotation.y = Math.PI;
      g.add(win);
    }
  }
  const chim = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.2, 0.5), new THREE.MeshStandardMaterial({ color: "#3a3a40" }));
  chim.position.set(w * 0.25, h + d * 0.5, 0);
  g.add(chim);
  return g;
}

function lamp(glowTex: THREE.Texture) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 4.2, 6), new THREE.MeshStandardMaterial({ color: "#20242c", metalness: 0.4 }));
  pole.position.y = 2.1;
  g.add(pole);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.1, 1.2) }));
  bulb.position.y = 4.25;
  g.add(bulb);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(1, 0.75, 0.45), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.setScalar(4.5);
  halo.position.y = 4.25;
  g.add(halo);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(3.2, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: glowTex, color: new THREE.Color(1, 0.7, 0.4), transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending }));
  pool.position.y = 0.03;
  g.add(pool);
  return g;
}

/** NORDVIA station marker: aurora-teal pin with a white core. Hovers above stations. */
export function stationPin() {
  const g = new THREE.Group();
  const green = new THREE.MeshStandardMaterial({ color: "#2BCFA4", emissive: "#2BCFA4", emissiveIntensity: 0.9, roughness: 0.35 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), green);
  head.position.y = 2.2;
  g.add(head);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.72, 1.6, 24).rotateX(Math.PI), green);
  tip.position.y = 1.05;
  g.add(tip);
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(2, 2, 2) }));
  dot.position.set(0, 2.2, 0.7);
  g.add(dot);
  return g;
}

/** Материал инстансов, которые исчезают внутри CLEAR-прямоугольников (лес, столбы). */
export function clearable<T extends THREE.Material>(m: T): T {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uClear = CLEAR;
    sh.vertexShader = CLEAR_GLSL + "\n" + sh.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      #ifdef USE_INSTANCING
        if (inClear((modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz)) transformed = vec3(0.0);
      #endif`,
    );
  };
  return m;
}

type Prop = { obj: THREE.Object3D; x0: number; x1: number; z0: number; z1: number };
export type Strip = { group: THREE.Group; pins: THREE.Object3D[]; props: Prop[]; festive?: { x: number; crowd: Crowd; tree: THREE.Group; obj: THREE.Object3D } };
type Shared = { spruce: THREE.BufferGeometry; treeMat: THREE.Material; poleMat: THREE.Material; snow: THREE.Texture; glow: THREE.Texture; lightMat: THREE.Material };

export function makeStrip(trees: number, seed: number, shared: Shared, withFestive: boolean): Strip {
  s = seed;
  const group = new THREE.Group();
  const L = STRIP;
  const pins: THREE.Object3D[] = [];
  const fest = { x: -40 };
  // Постройки полосы — отдельными группами: когда рядом проезжаем реальное место, они прячутся
  const props: Prop[] = [];
  const prop = (x0: number, x1: number, z0: number, z1: number) => {
    const obj = new THREE.Group();
    group.add(obj);
    props.push({ obj, x0, x1, z0, z1 });
    return obj;
  };

  // Земля
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(L, 1600).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: "#dbe5f3", map: shared.snow, roughness: 0.92 }),
  );
  (ground.material as THREE.MeshStandardMaterial).map!.repeat.set(L / 40, 1600 / 40);
  group.add(ground);

  // Насыпь, шпалы, рельсы
  const bed = new THREE.Mesh(new THREE.BoxGeometry(L, 0.3, 4.2), new THREE.MeshStandardMaterial({ color: "#9aa6b8", roughness: 1 }));
  bed.position.y = 0.12;
  group.add(bed);
  const sleeperCount = Math.floor(L / 1.1);
  const sleepers = new THREE.InstancedMesh(new THREE.BoxGeometry(0.32, 0.14, 2.9), new THREE.MeshStandardMaterial({ color: "#3b302c", roughness: 1 }), sleeperCount);
  const m = new THREE.Matrix4();
  for (let i = 0; i < sleeperCount; i++) {
    m.makeTranslation(-L / 2 + i * 1.1, 0.33, 0);
    sleepers.setMatrixAt(i, m);
  }
  group.add(sleepers);
  for (const z of [-0.72, 0.72]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(L, 0.14, 0.12), new THREE.MeshStandardMaterial({ color: "#b9c3d1", metalness: 0.85, roughness: 0.25 }));
    rail.position.set(0, 0.47, z);
    group.add(rail);
  }

  // Озеро
  const lake = { x: 120, z: -62, rx: 70, rz: 26 };
  const ice = new THREE.Mesh(new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: "#8fb2dd", roughness: 0.12, metalness: 0.35 }));
  ice.scale.set(lake.rx, 1, lake.rz);
  ice.position.set(lake.x, 0.04, lake.z);
  prop(lake.x - lake.rx, lake.x + lake.rx, lake.z - lake.rz, lake.z + lake.rz).add(ice);

  // Деревня
  const village = { x: -170, z: 34, r: 30 };
  const warm = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 1.55, 0.7) });
  const vg = prop(village.x - 36, village.x + 36, village.z - 14, village.z + 34);
  for (let i = 0; i < 9; i++) {
    const h = house(warm);
    h.position.set(village.x + (rnd() - 0.5) * 54, 0, village.z + (rnd() - 0.2) * 34);
    h.rotation.y = (rnd() - 0.5) * 0.6;
    vg.add(h);
  }
  const vPosts: THREE.Vector3[] = [];
  for (let i = 0; i < 4; i++) {
    const lp = lamp(shared.glow);
    lp.position.set(village.x - 24 + i * 16, 0, village.z - 9);
    vg.add(lp);
    vPosts.push(new THREE.Vector3(village.x - 24 + i * 16, 4.0, village.z - 9));
  }
  const vLights: THREE.Vector3[] = [];
  for (let i = 0; i < vPosts.length - 1; i++) vLights.push(...swag(vPosts[i], vPosts[i + 1], 1.2, 0.45));
  vg.add(lights(vLights, shared.lightMat));

  // праздничный полустанок (только на одной из двух полос, чтобы он встречался реже)
  let festive: Strip["festive"];
  if (withFestive) {
    const warm2 = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 1.55, 0.7) });
    const f = festiveStation(rnd, shared.glow, shared.lightMat, warm2);
    f.group.position.x = fest.x;
    const fg = prop(fest.x - 30, fest.x + 30, -16, -2);
    fg.add(f.group);
    const pin = stationPin();
    pin.position.set(fest.x + 12, 11, -11);
    pin.scale.setScalar(1.4);
    fg.add(pin);
    pins.push(pin);
    festive = { x: fest.x, crowd: f.crowd, tree: f.tree, obj: fg };
  }

  // Station with platform, lamps and a NORDVIA marker
  const st = { x: 230 };
  const sgp = prop(st.x - 27, st.x + 27, 2, 18);
  const platform = new THREE.Mesh(new THREE.BoxGeometry(46, 0.9, 4), new THREE.MeshStandardMaterial({ color: "#9097a3", roughness: 0.9 }));
  platform.position.set(st.x, 0.45, 4.6);
  sgp.add(platform);
  const pSnow = new THREE.Mesh(new THREE.BoxGeometry(46, 0.08, 4), new THREE.MeshStandardMaterial({ color: "#eef3fb" }));
  pSnow.position.set(st.x, 0.94, 4.6);
  sgp.add(pSnow);
  const stPosts: THREE.Vector3[] = [];
  for (let i = 0; i < 5; i++) {
    const lp = lamp(shared.glow);
    lp.position.set(st.x - 20 + i * 10, 0.9, 6.1);
    sgp.add(lp);
    stPosts.push(new THREE.Vector3(st.x - 20 + i * 10, 4.9, 6.1));
  }
  // гирлянды между фонарями станции
  const stLights: THREE.Vector3[] = [];
  for (let i = 0; i < stPosts.length - 1; i++) stLights.push(...swag(stPosts[i], stPosts[i + 1], 0.9, 0.42));
  sgp.add(lights(stLights, shared.lightMat, true));
  const station = house(warm);
  station.scale.set(1.8, 1.4, 1.5);
  station.position.set(st.x, 0, 11.5);
  sgp.add(station);
  const pin = stationPin();
  pin.position.set(st.x, 9.5, 11.5);
  pin.scale.setScalar(1.5);
  sgp.add(pin);
  pins.push(pin);

  // Столбы с проводами
  const poleGeo = mergeGeometries([new THREE.CylinderGeometry(0.12, 0.16, 7, 6).translate(0, 3.5, 0), new THREE.BoxGeometry(0.12, 0.12, 1.6).translate(0, 6.6, 0)])!;
  const poleXs: number[] = [];
  for (let x = -L / 2; x < L / 2; x += 32) if (!(withFestive && Math.abs(x - fest.x) < 34)) poleXs.push(x); // у полустанка столбов нет
  const poles = new THREE.InstancedMesh(poleGeo, shared.poleMat, poleXs.length);
  poleXs.forEach((x, i) => poles.setMatrixAt(i, new THREE.Matrix4().makeTranslation(x, 0, -6.5)));
  group.add(poles);
  const spans: [number, number][] = withFestive ? [[-L / 2, fest.x - 34], [fest.x + 34, L / 2]] : [[-L / 2, L / 2]];
  for (const [x0, x1] of spans)
    for (const dz of [-0.6, 0.6]) {
      const wire = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.03, 0.03), new THREE.MeshBasicMaterial({ color: "#141821" }));
      wire.position.set((x0 + x1) / 2, 6.7, -6.5 + dz);
      group.add(wire);
    }

  // Гранитные скалы с соснами — Карелия
  const cliffs: { x: number; z: number; r: number }[] = [];
  for (let i = 0; i < 8; i++) {
    const x = -L / 2 + 30 + rnd() * (L - 60);
    const side = rnd() < 0.6 ? -1 : 1;
    const z = side * (55 + rnd() * 120);
    const size = 7 + rnd() * 9;
    const c = graniteCliff(rnd, size);
    c.position.set(x, 0, z);
    prop(x - size * 1.3, x + size * 1.3, z - size, z + size).add(c);
    cliffs.push({ x, z, r: size * 1.2 });
  }

  // Лес
  const inst = new THREE.InstancedMesh(shared.spruce, shared.treeMat, trees);
  const q = new THREE.Quaternion();
  const sc = new THREE.Vector3();
  const pos = new THREE.Vector3();
  const col = new THREE.Color();
  let placed = 0;
  let guard = 0;
  const fairy: THREE.Vector3[] = [];
  while (placed < trees && guard++ < trees * 20) {
    const x = -L / 2 + rnd() * L;
    const side = rnd() < 0.5 ? -1 : 1;
    // ближе к пути гуще, дальше реже
    const z = side * (8 + Math.pow(rnd(), 1.35) * 190);
    if (((x - lake.x) / (lake.rx + 6)) ** 2 + ((z - lake.z) / (lake.rz + 6)) ** 2 < 1) continue;
    if (Math.hypot(x - village.x, z - village.z) < village.r + 6) continue;
    if (Math.abs(x - st.x) < 30 && z > 0 && z < 22) continue;
    if (Math.abs(z + 6.5) < 2.5) continue; // столбы
    if (cliffs.some((c) => Math.hypot(x - c.x, z - c.z) < c.r)) continue;
    // ближний к зрителю край — снежная поляна: виден поезд, по ней бегут олени
    if (z > 8 && z < 30 && rnd() < 0.8) continue;
    if (Math.abs(x - fest.x) < 34 && z < 0 && z > -26) continue; // полустанок
    const k = 0.75 + rnd() * 1.25 + (Math.abs(z) > 60 ? 0.5 : 0);
    pos.set(x, 0, z);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * Math.PI * 2);
    sc.set(k, k * (0.9 + rnd() * 0.35), k);
    m.compose(pos, q, sc);
    inst.setMatrixAt(placed, m);
    col.setHSL(0.38 + rnd() * 0.05, 0.25 + rnd() * 0.2, 0.75 + rnd() * 0.3);
    inst.setColorAt(placed, col);
    // часть елей у дороги наряжена огоньками — лес как из сказки
    if (Math.abs(z) < 60 && rnd() < 0.09) fairy.push(...treeSpiral(x, z, k, 22));
    placed++;
  }
  group.add(lights(fairy, shared.lightMat));
  inst.count = placed;
  group.add(inst);

  // Искры на снегу
  const sparkN = 900;
  const sp = new Float32Array(sparkN * 3);
  for (let i = 0; i < sparkN; i++) sp.set([-L / 2 + rnd() * L, 0.08, (rnd() - 0.5) * 120], i * 3);
  const sg = new THREE.BufferGeometry();
  sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
  const sparks = new THREE.Points(sg, new THREE.PointsMaterial({ map: shared.glow, size: 0.35, color: new THREE.Color(1.4, 1.5, 1.8), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  group.add(sparks);

  return { group, pins, props, festive };
}

/** Прямоугольники (x0, x1, z0, z1 в мировых координатах), где лес и огоньки не рисуются: там стоят реальные места. */
export const CLEAR = { value: Array.from({ length: 8 }, () => new THREE.Vector4(1, -1, 0, 0)) };
export const CLEAR_GLSL = `uniform vec4 uClear[8];
  bool inClear(vec3 w){ for (int i = 0; i < 8; i++){ vec4 r = uClear[i]; if (w.x > r.x && w.x < r.y && w.z > r.z && w.z < r.w) return true; } return false; }`;

export function makeScenery(scene: THREE.Scene, treesPerStrip: number) {
  const treeMat = clearable(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true }));
  const shared = {
    spruce: spruceGeometry(),
    treeMat: treeMat as THREE.Material,
    poleMat: clearable(new THREE.MeshStandardMaterial({ color: "#2b2420", roughness: 1 })) as THREE.Material,
    snow: snowTex(),
    glow: softDot(),
    lightMat: null as unknown as THREE.ShaderMaterial,
  };
  shared.lightMat = twinkleMaterial(shared.glow, CLEAR, CLEAR_GLSL);
  const a = makeStrip(treesPerStrip, 11, shared, true);
  const b = makeStrip(treesPerStrip, 11, shared, false);
  // полустанок встречается секунд через 20 после старта; ?fest ставит его прямо у поезда (для проверки)
  const fq = new URLSearchParams(location.search).get("fest");
  const startX = fq !== null ? 40 + (Number(fq) || 0) : 300;
  a.group.position.x = startX;
  b.group.position.x = startX - STRIP;
  scene.add(a.group, b.group);
  const strips = [a, b];
  return {
    /** Где сейчас праздничный полустанок (мировой x) — для гудка. */
    festiveX: () => a.group.position.x + a.festive!.x,
    festiveVisible: () => a.festive!.obj.visible,
    update(dx: number, t: number) {
      shared.lightMat.uniforms.t.value = t;
      const fx = a.group.position.x + a.festive!.x;
      animateCrowd(a.festive!.crowd, t, THREE.MathUtils.smoothstep(70 - Math.abs(fx), 0, 55));
      a.festive!.tree.children.forEach((c) => c.userData.spin && (c.rotation.y = t * 1.2));
      for (const st of strips) {
        st.group.position.x -= dx;
        if (st.group.position.x < -STRIP) st.group.position.x += STRIP * 2;
        // постройки полосы, которые налезают на реальное место, прячем
        for (const pr of st.props) {
          const x0 = st.group.position.x + pr.x0, x1 = st.group.position.x + pr.x1;
          pr.obj.visible = !CLEAR.value.some((r) => r.x < r.y && x1 > r.x && x0 < r.y && pr.z1 > r.z && pr.z0 < r.w);
        }
        for (const p of st.pins) {
          p.position.y = 9.5 + Math.sin(t * 2) * 0.35;
          p.rotation.y = t * 0.8;
        }
      }
    },
    glow: shared.glow,
    lightMat: shared.lightMat,
  };
}
