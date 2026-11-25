// Горизонт Карелии: гор здесь нет — есть пологие холмы, сплошь покрытые хвойным лесом,
// и гранитные скалы-«бараньи лбы». Холмы стоят на земле и уходят в дымку.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

let s = 41;
const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);

const SPAN = 2400;

/** Высота холма в точке: несколько синусоид, чтобы гряда была неровной. */
const hillH = (x: number, k: number, amp: number) =>
  amp * (0.55 + 0.25 * Math.sin(x * 0.006 + k) + 0.15 * Math.sin(x * 0.017 + k * 2.1) + 0.08 * Math.sin(x * 0.041 + k * 3.7));

function farTree() {
  const a = new THREE.ConeGeometry(1.6, 4.8, 6).translate(0, 3.2, 0);
  const b = new THREE.ConeGeometry(1.1, 3.4, 6).translate(0, 5.4, 0);
  return mergeGeometries([a, b])!;
}

function ridge(z: number, depth: number, amp: number, seed: number, col: THREE.Color, snow: THREE.Color, trees: number, treeCol: string) {
  const g = new THREE.Group();
  const segX = 220, segZ = 6;
  const geo = new THREE.PlaneGeometry(SPAN, depth, segX, segZ).rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  const colors = new Float32Array(p.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const zz = p.getZ(i); // от -depth/2 (дальний край) до +depth/2 (ближний)
    const t = 1 - Math.abs(zz) / (depth / 2); // 0 на краях, 1 в середине гряды
    const h = hillH(x, seed, amp) * Math.pow(Math.max(0, t), 0.7) + (rnd() - 0.5) * 2;
    p.setY(i, Math.max(0, h));
    const k = h / (amp * 1.1);
    c.copy(col).lerp(snow, Math.max(0, Math.min(1, (k - 0.55) * 1.6)) * 0.5 + (rnd() < 0.08 ? 0.25 : 0));
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const hill = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1, fog: false }));
  g.add(hill);
  // лес на склонах: тёмные ели плотной щёткой
  const tg = farTree();
  const inst = new THREE.InstancedMesh(tg, new THREE.MeshStandardMaterial({ color: treeCol, roughness: 1, flatShading: true, fog: false }), trees);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i < trees; i++) {
    const x = -SPAN / 2 + rnd() * SPAN;
    const zz = (rnd() - 0.5) * depth * 0.9;
    const t = 1 - Math.abs(zz) / (depth / 2);
    const h = hillH(x, seed, amp) * Math.pow(Math.max(0, t), 0.7);
    const k = 1.4 + rnd() * 1.6;
    v.set(x, Math.max(0, h) - 0.5, zz);
    sc.set(k, k * (0.9 + rnd() * 0.5), k);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * 6.28);
    m.compose(v, q, sc);
    inst.setMatrixAt(i, m);
  }
  g.add(inst);
  g.position.z = z;
  return g;
}

export function makeHorizon(scene: THREE.Scene, tier: number) {
  const layers: { g: THREE.Group; k: number }[] = [];
  const add = (make: () => THREE.Group, k: number) => {
    const a = make();
    const b = make();
    b.position.x = SPAN;
    scene.add(a, b);
    layers.push({ g: a, k }, { g: b, k });
  };
  const n = [900, 1600, 2400][tier];
  for (const side of [-1, 1]) {
    // ближняя гряда: зеленее и ниже
    add(() => ridge(side * 300, 160, 38, side > 0 ? 1 : 4, new THREE.Color("#1f3a3e"), new THREE.Color("#8ea6c2"), n, "#2b4c4a"), 0.32);
    // дальняя гряда: синее, тонет в дымке
    add(() => ridge(side * 470, 220, 62, side > 0 ? 7 : 9, new THREE.Color("#233a5c"), new THREE.Color("#7f95b8"), Math.round(n * 0.7), "#324a6c"), 0.16);
  }
  return {
    update(dx: number) {
      for (const l of layers) {
        l.g.position.x -= dx * l.k;
        if (l.g.position.x < -SPAN * 1.5) l.g.position.x += SPAN * 2;
      }
    },
  };
}

/** Гранитная скала с соснами наверху — для ближнего плана (живёт в полосе мира). */
export function graniteCliff(r: () => number, size: number) {
  const g = new THREE.Group();
  const granite = new THREE.MeshStandardMaterial({ color: "#8a8186", roughness: 1, flatShading: true });
  const granite2 = new THREE.MeshStandardMaterial({ color: "#6f6a73", roughness: 1, flatShading: true });
  const snow = new THREE.MeshStandardMaterial({ color: "#eef4ff", roughness: 0.9, flatShading: true });
  const blocks = 4 + Math.floor(r() * 4);
  let top = 0;
  for (let i = 0; i < blocks; i++) {
    const geo = new THREE.DodecahedronGeometry(1, 0);
    const p = geo.attributes.position;
    for (let v = 0; v < p.count; v++) p.setXYZ(v, p.getX(v) * (0.8 + r() * 0.4), p.getY(v) * (0.8 + r() * 0.4), p.getZ(v) * (0.8 + r() * 0.4));
    geo.computeVertexNormals();
    const w = size * (0.5 + r() * 0.6), h = size * (0.45 + r() * 0.7), d = size * (0.4 + r() * 0.4);
    const b = new THREE.Mesh(geo, i % 2 ? granite : granite2);
    b.scale.set(w, h, d);
    const x = (r() - 0.5) * size * 1.4, z = (r() - 0.5) * size * 0.6;
    b.position.set(x, h * 0.75, z);
    b.rotation.y = r() * 3;
    g.add(b);
    top = Math.max(top, h * 1.6);
    const cap = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), snow);
    cap.scale.set(w * 0.8, h * 0.18, d * 0.8);
    cap.position.set(x, h * 1.62, z);
    g.add(cap);
  }
  // сосны на макушке
  const pineMat = new THREE.MeshStandardMaterial({ color: "#1f4a37", roughness: 0.9, flatShading: true });
  for (let i = 0; i < 3 + Math.floor(r() * 4); i++) {
    const k = 0.8 + r() * 0.9;
    const pine = new THREE.Mesh(new THREE.ConeGeometry(1.2 * k, 4.2 * k, 7), pineMat);
    pine.position.set((r() - 0.5) * size, top * 0.9 + 2 * k, (r() - 0.5) * size * 0.4);
    g.add(pine);
    const sc = new THREE.Mesh(new THREE.ConeGeometry(0.7 * k, 1.6 * k, 7), snow);
    sc.position.set(pine.position.x, pine.position.y + 1.4 * k, pine.position.z);
    g.add(sc);
  }
  return g;
}
