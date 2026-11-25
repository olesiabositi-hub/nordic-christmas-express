// Праздничные детали: мерцающие огоньки, гирлянды-растяжки, наряженные ёлки,
// полустанок с машущими людьми.
import * as THREE from "three";
import { canvasTex } from "./tex";

const PALETTE = [
  new THREE.Color(3.0, 2.2, 1.0), // тёплый белый
  new THREE.Color(3.0, 0.55, 0.45), // красный
  new THREE.Color(0.6, 2.8, 1.0), // зелёный
  new THREE.Color(3.0, 2.5, 0.5), // золото
  new THREE.Color(0.9, 1.6, 3.4), // голубой
];

/** Общий материал мерцающих огоньков: всё мерцание — в шейдере. */
export function twinkleMaterial(map: THREE.Texture, clear?: { value: THREE.Vector4[] }, clearGlsl = "") {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { t: { value: 0 }, map: { value: map }, px: { value: Math.min(devicePixelRatio, 2) }, uClear: clear ?? { value: Array.from({ length: 8 }, () => new THREE.Vector4(1, -1, 0, 0)) } },
    vertexShader: `${clearGlsl || "uniform vec4 uClear[8]; bool inClear(vec3 w){ return false; }"}
      attribute vec3 color; attribute float seed; uniform float t, px; varying vec3 c; varying float a;
      void main(){
        c = color;
        a = 0.45 + 0.55 * max(0.0, sin(t * (1.5 + seed * 2.5) + seed * 40.0));
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = (2.2 + seed * 1.2) * px * (40.0 / -mv.z) + 1.5;
        gl_Position = projectionMatrix * mv;
        if (inClear((modelMatrix * vec4(position, 1.0)).xyz)) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      }`,
    fragmentShader: `uniform sampler2D map; varying vec3 c; varying float a;
      void main(){ vec4 tx = texture2D(map, gl_PointCoord); gl_FragColor = vec4(c * a, tx.a * min(1.0, a + 0.2)); }`,
  });
}

/** Набор огоньков по готовым точкам. */
export function lights(points: THREE.Vector3[], mat: THREE.Material, warmOnly = false) {
  const pos = new Float32Array(points.length * 3);
  const col = new Float32Array(points.length * 3);
  const seed = new Float32Array(points.length);
  points.forEach((p, i) => {
    pos.set([p.x, p.y, p.z], i * 3);
    const c = warmOnly ? PALETTE[i % 4 === 0 ? 3 : 0] : PALETTE[Math.floor(Math.random() * PALETTE.length)];
    col.set([c.r, c.g, c.b], i * 3);
    seed[i] = Math.random();
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.setAttribute("seed", new THREE.BufferAttribute(seed, 1));
  const p = new THREE.Points(g, mat);
  p.frustumCulled = false;
  return p;
}

/** Точки гирлянды, провисающей между двумя опорами. */
export function swag(a: THREE.Vector3, b: THREE.Vector3, sag = 0.8, step = 0.45) {
  const n = Math.max(3, Math.round(a.distanceTo(b) / step));
  const out: THREE.Vector3[] = [];
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    const p = a.clone().lerp(b, k);
    p.y -= Math.sin(k * Math.PI) * sag;
    out.push(p);
  }
  return out;
}

/** Огоньки спиралью по ели заданного размера (ель из scenery: высота ~5.4 * k). */
export function treeSpiral(x: number, z: number, k: number, count = 26) {
  const out: THREE.Vector3[] = [];
  for (let i = 0; i < count; i++) {
    const h = i / count;
    const y = (1.2 + h * 4.2) * k;
    const r = (1 - h) * 1.85 * k + 0.15;
    const a = h * Math.PI * 7 + x;
    out.push(new THREE.Vector3(x + Math.cos(a) * r, y, z + Math.sin(a) * r));
  }
  return out;
}

/** Наряженная ёлка: ярусы, снег, шары, огни, звезда. */
export function decoratedTree(height: number, lightMat: THREE.Material) {
  const g = new THREE.Group();
  const green = new THREE.MeshStandardMaterial({ color: "#1f5a3c", roughness: 0.75, flatShading: true });
  const snow = new THREE.MeshStandardMaterial({ color: "#eef4ff", roughness: 0.9, flatShading: true });
  const tiers = 5;
  const base = height * 0.24;
  for (let i = 0; i < tiers; i++) {
    const r = base * (1 - i * 0.17);
    const h = height * 0.3;
    const y = height * 0.08 + i * height * 0.16;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 12), green);
    cone.position.y = y + h / 2;
    g.add(cone);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.6, h * 0.34, 12), snow);
    cap.position.y = y + h * 0.86;
    g.add(cap);
  }
  // шары
  const ballCols = ["#d8262e", "#ffc857", "#2b7bff", "#ffffff", "#3EE0B4"];
  for (let i = 0; i < 26; i++) {
    const h = Math.random() * 0.8 + 0.08;
    const r = (1 - h) * base * 0.95;
    const a = Math.random() * Math.PI * 2;
    const ball = new THREE.Mesh(new THREE.SphereGeometry(height * 0.018, 10, 8), new THREE.MeshStandardMaterial({ color: ballCols[i % 5], metalness: 0.7, roughness: 0.2 }));
    ball.position.set(Math.cos(a) * r, height * (0.08 + h * 0.8), Math.sin(a) * r);
    g.add(ball);
  }
  const pts: THREE.Vector3[] = [];
  const n = Math.round(height * 14);
  for (let i = 0; i < n; i++) {
    const h = i / n;
    const r = (1 - h) * base * 1.02 + 0.1;
    const a = h * Math.PI * 16;
    pts.push(new THREE.Vector3(Math.cos(a) * r, height * (0.1 + h * 0.82), Math.sin(a) * r));
  }
  g.add(lights(pts, lightMat));
  // звезда
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = (i % 2 ? 0.42 : 1) * height * 0.06;
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    if (i) shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    else shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const star = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: height * 0.015, bevelEnabled: false }).center(), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 3.2, 1.2) }));
  star.position.y = height * 0.97;
  star.userData.spin = true;
  g.add(star);
  return g;
}

/** Человечек в шапке, который машет. */
function person(rnd: () => number, glow: THREE.Texture) {
  const g = new THREE.Group();
  const coats = ["#c0262d", "#1f8a70", "#2F6BFF", "#FFC857", "#7b4bd6", "#f06a2a", "#e9e4da"];
  const hats = ["#d8262e", "#ffffff", "#1f8a70", "#FFC857", "#2F6BFF"];
  const coat = new THREE.MeshStandardMaterial({ color: coats[Math.floor(rnd() * coats.length)], roughness: 0.8 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.42, 1.15, 10), coat);
  body.position.y = 0.6;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), new THREE.MeshStandardMaterial({ color: "#f0c8a4", roughness: 0.7 }));
  head.position.y = 1.4;
  g.add(head);
  const hatMat = new THREE.MeshStandardMaterial({ color: hats[Math.floor(rnd() * hats.length)], roughness: 0.8 });
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.45, 10), hatMat);
  hat.position.y = 1.68;
  hat.rotation.z = 0.25;
  g.add(hat);
  const pom = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshStandardMaterial({ color: "#ffffff" }));
  pom.position.set(-0.1, 1.9, 0);
  g.add(pom);
  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.06, 6, 14).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: hats[Math.floor(rnd() * hats.length)] }));
  scarf.position.y = 1.2;
  g.add(scarf);
  // машущая рука: опора в плече, рука вверх
  const arm = new THREE.Group();
  arm.position.set(0.3, 1.12, 0);
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.62, 6).translate(0, 0.31, 0), coat);
  arm.add(sleeve);
  const mitten = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), hatMat);
  mitten.position.y = 0.66;
  arm.add(mitten);
  if (rnd() < 0.35) {
    // бенгальский огонь
    const spark = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: new THREE.Color(3, 2.4, 1.2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    spark.scale.setScalar(0.7);
    spark.position.y = 0.95;
    spark.userData.spark = true;
    arm.add(spark);
  }
  g.add(arm);
  const other = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.55, 6).translate(0, -0.27, 0), coat);
  other.position.set(-0.3, 1.1, 0);
  other.rotation.z = -0.25;
  g.add(other);
  return { g, arm, phase: rnd() * 6.28 };
}

function bannerTex() {
  return canvasTex(1024, 192, (g) => {
    const gr = g.createLinearGradient(0, 0, 1024, 0);
    gr.addColorStop(0, "#1E4FD8");
    gr.addColorStop(1, "#14A88A");
    g.fillStyle = gr;
    g.beginPath();
    g.roundRect(0, 0, 1024, 192, 36);
    g.fill();
    g.fillStyle = "#ffffff";
    g.font = "800 70px Manrope, system-ui, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("Hyvää uutta vuotta 2027!", 512, 100);
  });
}

export type Crowd = { people: { g: THREE.Group; arm: THREE.Group; phase: number; baseY: number }[] };

/** Полустанок без остановки: ёлка, гирлянды, баннер, люди машут поезду. */
export function festiveStation(rnd: () => number, glow: THREE.Texture, lightMat: THREE.Material, warm: THREE.Material) {
  const g = new THREE.Group();
  const platform = new THREE.Mesh(new THREE.BoxGeometry(52, 0.9, 5), new THREE.MeshStandardMaterial({ color: "#8d94a0", roughness: 0.9 }));
  platform.position.set(0, 0.45, -5.1);
  g.add(platform);
  const top = new THREE.Mesh(new THREE.BoxGeometry(52, 0.08, 5), new THREE.MeshStandardMaterial({ color: "#eef3fb" }));
  top.position.set(0, 0.94, -5.1);
  g.add(top);

  // павильон
  const hut = new THREE.Group();
  const wall = new THREE.Mesh(new THREE.BoxGeometry(9, 3.6, 4), new THREE.MeshStandardMaterial({ color: "#8a2b2b", roughness: 0.85 }));
  wall.position.y = 1.8;
  hut.add(wall);
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-2.6, 0);
  roofShape.lineTo(2.6, 0);
  roofShape.lineTo(0, 2.2);
  roofShape.closePath();
  const roof = new THREE.Mesh(new THREE.ExtrudeGeometry(roofShape, { depth: 9.8, bevelEnabled: false }).translate(0, 0, -4.9).rotateY(Math.PI / 2), new THREE.MeshStandardMaterial({ color: "#f2f6ff", roughness: 0.85 }));
  roof.position.y = 3.6;
  hut.add(roof);
  for (let i = 0; i < 3; i++) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.3), warm);
    w.position.set(-3 + i * 3, 1.9, 2.01);
    hut.add(w);
  }
  hut.position.set(12, 0.9, -11);
  g.add(hut);
  // огоньки по краю крыши павильона
  g.add(lights([...swag(new THREE.Vector3(7.2, 4.55, -8.9), new THREE.Vector3(16.8, 4.55, -8.9), 0.25, 0.35)], lightMat));

  // большая ёлка
  const tree = decoratedTree(11, lightMat);
  tree.position.set(-17, 0.9, -7.2);
  g.add(tree);

  // фонари и растяжки гирлянд вдоль платформы
  const posts: THREE.Vector3[] = [];
  for (let i = 0; i < 6; i++) {
    const x = -24 + i * 9.6;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 4.6, 6), new THREE.MeshStandardMaterial({ color: "#1d2128", metalness: 0.5 }));
    pole.position.set(x, 3.2, -7.3);
    g.add(pole);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.1, 1.1) }));
    bulb.position.set(x, 5.55, -7.3);
    g.add(bulb);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: new THREE.Color(1, 0.75, 0.45), transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.scale.setScalar(4.5);
    halo.position.copy(bulb.position);
    g.add(halo);
    posts.push(new THREE.Vector3(x, 5.3, -7.3));
  }
  const garland: THREE.Vector3[] = [];
  for (let i = 0; i < posts.length - 1; i++) garland.push(...swag(posts[i], posts[i + 1], 1.1, 0.4));
  // поперечные растяжки к навесу над путём не тянем: только вдоль платформы и зигзагом к земле
  for (let i = 0; i < posts.length; i++) garland.push(...swag(posts[i], new THREE.Vector3(posts[i].x + 2.5, 1.0, -9.6), 0.3, 0.45));
  g.add(lights(garland, lightMat));

  // баннер
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(10, 1.9), new THREE.MeshBasicMaterial({ map: bannerTex(), transparent: true, color: new THREE.Color(1.15, 1.15, 1.15) }));
  // полустанок по ту сторону пути: баннер и люди смотрят и на поезд, и на камеру
  banner.position.set(-1, 4.6, -7.25);
  g.add(banner);
  for (const bx of [-6, 4]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 4.2, 6), new THREE.MeshStandardMaterial({ color: "#1d2128" }));
    p.position.set(bx, 2.9, -7.3);
    g.add(p);
  }

  // люди
  const crowd: Crowd = { people: [] };
  for (let i = 0; i < 14; i++) {
    const p = person(rnd, glow);
    const kid = rnd() < 0.3;
    const sc = kid ? 0.72 : 1;
    p.g.scale.setScalar(sc);
    const x = -12 + i * 2.2 + (rnd() - 0.5) * 0.8;
    const z = -(4.0 + rnd() * 2.4);
    p.g.position.set(x, 0.94, z);
    p.g.rotation.y = (rnd() - 0.5) * 0.5; // лицом к пути
    g.add(p.g);
    crowd.people.push({ ...p, baseY: 0.94 });
  }
  return { group: g, crowd, tree };
}

/** Анимация толпы: excite 0..1 — насколько близко поезд. */
export function animateCrowd(c: Crowd, t: number, excite: number) {
  c.people.forEach((p, i) => {
    const speed = 3 + excite * 9;
    p.arm.rotation.z = -0.35 - excite * 0.35 + Math.sin(t * speed + p.phase) * (0.25 + excite * 0.45);
    p.g.position.y = p.baseY + Math.max(0, Math.sin(t * 7 + p.phase + i)) * 0.28 * excite;
    p.arm.children.forEach((ch) => {
      if (ch.userData.spark) (ch as THREE.Sprite).scale.setScalar(0.5 + Math.random() * 0.5);
    });
  });
}
