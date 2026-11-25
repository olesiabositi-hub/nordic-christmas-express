// Снег, пар, Санта на оленях, финальная ёлка с салютом.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { softDot } from "./tex";

/** Снег тремя слоями: всё в шейдере, процессор не трогаем. */
export function makeSnow(scene: THREE.Scene, count: number) {
  const box = new THREE.Vector3(160, 50, 140);
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos.set([Math.random() * box.x, Math.random() * box.y, Math.random() * box.z], i * 3);
    seed[i] = Math.random();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("seed", new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      t: { value: 0 },
      drift: { value: 0 },
      box: { value: box },
      center: { value: new THREE.Vector3() },
      map: { value: softDot() },
      px: { value: Math.min(window.devicePixelRatio, 2) },
    },
    vertexShader: `attribute float seed; uniform float t, drift, px; uniform vec3 box, center; varying float a;
      void main(){
        vec3 p = position;
        float sp = 1.6 + seed*2.2;
        p.y = mod(p.y - t*sp, box.y);
        p.x = mod(p.x - drift*(0.55 + seed*0.5) + sin(t*0.7 + seed*40.0)*1.5, box.x);
        p.z = mod(p.z + sin(t*0.5 + seed*17.0)*1.2, box.z);
        p += center - vec3(box.x*0.5, 0.0, box.z*0.5);
        vec4 mv = modelViewMatrix*vec4(p,1.0);
        float size = (seed < 0.08 ? 7.0 : seed < 0.4 ? 3.2 : 1.8) * px;
        gl_PointSize = size * (60.0 / -mv.z);
        a = smoothstep(0.0, 4.0, p.y) * (seed < 0.08 ? 0.55 : 0.9);
        gl_Position = projectionMatrix*mv;
      }`,
    fragmentShader: `uniform sampler2D map; varying float a; void main(){ vec4 c = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vec3(0.92,0.95,1.0), c.a*a); }`,
  });
  const pts = new THREE.Points(g, mat);
  pts.frustumCulled = false;
  scene.add(pts);
  return {
    update(t: number, travelled: number, center: THREE.Vector3) {
      mat.uniforms.t.value = t;
      mat.uniforms.drift.value = travelled;
      mat.uniforms.center.value.copy(center);
    },
  };
}

/** Пар из трубы: клубы растут, сносятся назад и тают. */
export function makeSteam(scene: THREE.Scene, origin: THREE.Vector3, continuous = true, N = 90) {
  let puff = 0; // секунды «гудка»: пар валит из свистка
  const pos = new Float32Array(N * 3);
  const size = new Float32Array(N);
  const alpha = new Float32Array(N);
  const life = new Float32Array(N).map(() => Math.random() * 4);
  const vel = Array.from({ length: N }, () => new THREE.Vector3());
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("size", new THREE.BufferAttribute(size, 1));
  g.setAttribute("alpha", new THREE.BufferAttribute(alpha, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { map: { value: softDot() }, px: { value: Math.min(window.devicePixelRatio, 2) } },
    vertexShader: `attribute float size, alpha; uniform float px; varying float a; varying float h;
      void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); gl_PointSize = size*px*(300.0/-mv.z); a = alpha; h = position.y; gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform sampler2D map; varying float a; varying float h;
      void main(){ vec4 c = texture2D(map, gl_PointCoord);
        vec3 warm = vec3(1.0,0.86,0.68); vec3 cold = vec3(0.72,0.8,0.95);
        gl_FragColor = vec4(mix(warm, cold, clamp((h-5.0)/9.0,0.0,1.0)), c.a*a); }`,
  });
  const pts = new THREE.Points(g, mat);
  pts.frustumCulled = false;
  scene.add(pts);
  const reset = (i: number) => {
    pos.set([origin.x + (Math.random() - 0.5) * 0.3, origin.y, origin.z + (Math.random() - 0.5) * 0.3], i * 3);
    vel[i].set(-2 - Math.random(), 3.2 + Math.random() * 1.5, (Math.random() - 0.5) * 0.8);
    life[i] = 0;
  };
  for (let i = 0; i < N; i++) {
    reset(i);
    if (!continuous) life[i] = 99;
  }
  return {
    puff(sec: number) {
      puff = sec;
    },
    update(dt: number, speed: number) {
      puff = Math.max(0, puff - dt);
      for (let i = 0; i < N; i++) {
        life[i] += dt;
        const L = continuous ? 4.2 : 2.2;
        if (life[i] > L) {
          if (continuous || (puff > 0 && Math.random() < 0.5)) {
            reset(i);
            if (!continuous) vel[i].set(-1 - Math.random(), 5 + Math.random() * 2, (Math.random() - 0.5) * 1.2);
          } else {
            alpha[i] = 0;
            continue;
          }
        }
        const k = life[i] / L;
        vel[i].y *= 1 - dt * 0.6;
        vel[i].x -= dt * speed * 0.35;
        pos[i * 3] += vel[i].x * dt;
        pos[i * 3 + 1] += vel[i].y * dt;
        pos[i * 3 + 2] += vel[i].z * dt;
        size[i] = 1.2 + k * 7;
        alpha[i] = Math.min(1, k * 8) * (1 - k) * 0.55;
      }
      g.attributes.position.needsUpdate = true;
      g.attributes.size.needsUpdate = true;
      g.attributes.alpha.needsUpdate = true;
    },
  };
}

/**
 * Дед Мороз на олене — анимированная модель от заказчицы (public/models/santa.json, 1,65 с цикл бега).
 * Пролетает раз в 30–50 секунд со случайной стороны, за ним искристый хвост.
 */
export function makeSanta(scene: THREE.Scene) {
  const g = new THREE.Group();
  const model = new THREE.Group(); // поворачиваем всю группу по направлению полёта
  g.add(model);
  let mixer: THREE.AnimationMixer | null = null;
  // Модель лежит как glTF-JSON со встроенными данными (так её отдаёт любой хостинг).
  // Собираем из неё GLB в памяти и разбираем без лишних запросов (data:-адреса могут быть запрещены политикой страницы).
  fetch(`${import.meta.env.BASE_URL}models/santa.json`)
    .then((r) => r.json())
    .then((json) => {
      const b64 = String(json.buffers[0].uri).split(",")[1];
      const bin = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
      delete json.buffers[0].uri;
      json.buffers[0].byteLength = bin.length;
      const jsonBytes = new TextEncoder().encode(JSON.stringify(json));
      const jsonLen = Math.ceil(jsonBytes.length / 4) * 4;
      const binLen = Math.ceil(bin.length / 4) * 4;
      const glb = new ArrayBuffer(12 + 8 + jsonLen + 8 + binLen);
      const dv = new DataView(glb);
      dv.setUint32(0, 0x46546c67, true); // "glTF"
      dv.setUint32(4, 2, true);
      dv.setUint32(8, glb.byteLength, true);
      dv.setUint32(12, jsonLen, true);
      dv.setUint32(16, 0x4e4f534a, true); // "JSON"
      const u8 = new Uint8Array(glb);
      u8.fill(0x20, 20, 20 + jsonLen);
      u8.set(jsonBytes, 20);
      dv.setUint32(20 + jsonLen, binLen, true);
      dv.setUint32(24 + jsonLen, 0x004e4942, true); // "BIN"
      u8.set(bin, 28 + jsonLen);
      new GLTFLoader().parse(glb, "", (gltf) => {
        const root = gltf.scene;
        // в модели ~25 единиц от саней до морды оленя; уменьшаем до размера, читаемого в небе
        root.scale.setScalar(0.7);
        root.traverse((o) => {
          const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
          if (m && "emissive" in m) {
            // ночь: чуть подсвечиваем, чтобы модель не была тёмным силуэтом
            m.emissive = new THREE.Color("#3a2a24");
            m.emissiveMap = m.map ?? null;
            m.emissiveIntensity = 0.55;
          }
        });
        model.add(root);
        mixer = new THREE.AnimationMixer(root);
        gltf.animations.forEach((a) => mixer!.clipAction(a).play());
      });
    })
    .catch(() => {
      // модель не загрузилась — Дед Мороз просто не прилетит, игра работает
    });
  // тёплый свет фонаря саней
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color: new THREE.Color(2.2, 1.6, 0.9), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.scale.setScalar(9);
  glow.position.set(0, 3, 0);
  g.add(glow);
  // искристый хвост
  const T = 160;
  const tp = new Float32Array(T * 3);
  const tg = new THREE.BufferGeometry();
  tg.setAttribute("position", new THREE.BufferAttribute(tp, 3));
  const trail = new THREE.Points(tg, new THREE.PointsMaterial({ map: softDot(), size: 1.1, color: new THREE.Color(2.6, 2.2, 1.2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  trail.frustumCulled = false;
  scene.add(trail);
  g.visible = false;
  scene.add(g);
  const hit = new THREE.Mesh(new THREE.SphereGeometry(9, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.set(0, 3, 2);
  g.add(hit);

  let next = new URLSearchParams(location.search).has("santa") ? 1 : 12 + Math.random() * 10;
  let tFly = -1;
  const dur = 10;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  let ti = 0;
  const prev = new THREE.Vector3();
  const p = new THREE.Vector3();
  return {
    hit,
    flying: () => g.visible,
    update(dt: number, t: number, allowed: boolean) {
      mixer?.update(dt);
      for (let i = 0; i < T; i++) tp[i * 3 + 1] -= dt * 1.5;
      tg.attributes.position.needsUpdate = true;
      if (tFly < 0) {
        next -= dt;
        if (next <= 0 && allowed && mixer) {
          const dir = Math.random() < 0.5 ? 1 : -1;
          const z = -16 - Math.random() * 22;
          a.set(-dir * 150, 11 + Math.random() * 5, z - 25);
          c.set(dir * 150, 14 + Math.random() * 6, z + 8 + Math.random() * 12);
          b.set((Math.random() - 0.5) * 30, 18 + Math.random() * 5, z);
          tFly = 0;
          g.visible = true;
        }
        return;
      }
      tFly += dt;
      const k = tFly / dur;
      if (k >= 1) {
        tFly = -1;
        g.visible = false;
        next = 30 + Math.random() * 20;
        return;
      }
      prev.copy(g.position);
      p.copy(a).multiplyScalar((1 - k) ** 2).addScaledVector(b, 2 * (1 - k) * k).addScaledVector(c, k * k);
      g.position.copy(p);
      const dir = p.clone().sub(prev);
      if (dir.lengthSq() > 1e-6) {
        // олень в модели смотрит в −Z: разворачиваем, чтобы он летел впереди саней
        g.rotation.y = Math.atan2(dir.x, dir.z) + Math.PI;
        g.rotation.z = Math.sin(t * 1.3) * 0.05;
        dir.normalize();
      }
      tp.set([p.x - dir.x * 9 + (Math.random() - 0.5), p.y + 2 + (Math.random() - 0.5), p.z - dir.z * 9 + (Math.random() - 0.5)], (ti % T) * 3);
      ti++;
    },
  };
}

/** Финал: огромная ёлка, которая вырастает рядом с путём, и салют. */
export function makeFinaleTree(scene: THREE.Scene) {
  const g = new THREE.Group();
  g.visible = false;
  scene.add(g);
  const green = new THREE.MeshStandardMaterial({ color: "#1d5a3c", roughness: 0.7, flatShading: true });
  const snow = new THREE.MeshStandardMaterial({ color: "#eef4ff", roughness: 0.9, flatShading: true });
  const tiers = 7;
  for (let i = 0; i < tiers; i++) {
    const r = 9 - i * 1.15;
    const h = 7;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 14), green);
    cone.position.y = 3 + i * 4.2 + h / 2;
    g.add(cone);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.6, h * 0.35, 14), snow);
    cap.position.y = 3 + i * 4.2 + h * 0.85;
    g.add(cap);
  }
  // огни спиралью
  const n = 420;
  const lp = new Float32Array(n * 3);
  const lc = new Float32Array(n * 3);
  const pal = [new THREE.Color(3, 2.3, 1), new THREE.Color(3, 0.6, 0.4), new THREE.Color(0.6, 2.8, 1.0), new THREE.Color(1, 1.8, 3.4), new THREE.Color(3, 2.8, 0.6)];
  for (let i = 0; i < n; i++) {
    const k = i / n;
    const y = 3 + k * 32;
    const r = (1 - k) * 9.2 + 0.4;
    const a = k * Math.PI * 22;
    lp.set([Math.cos(a) * r, y, Math.sin(a) * r], i * 3);
    const c = pal[i % pal.length];
    lc.set([c.r, c.g, c.b], i * 3);
  }
  const lg = new THREE.BufferGeometry();
  lg.setAttribute("position", new THREE.BufferAttribute(lp, 3));
  lg.setAttribute("color", new THREE.BufferAttribute(lc, 3));
  const lights = new THREE.Points(lg, new THREE.PointsMaterial({ map: softDot(), size: 1.3, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  g.add(lights);
  // звезда
  const starShape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 1.1 : 2.6;
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i) starShape.lineTo(x, y);
    else starShape.moveTo(x, y);
  }
  const star = new THREE.Mesh(new THREE.ExtrudeGeometry(starShape, { depth: 0.5, bevelEnabled: false }).center(), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 3.2, 1.2) }));
  star.position.y = 38;
  g.add(star);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color: new THREE.Color(2.5, 2, 1), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.setScalar(16);
  halo.position.y = 38;
  g.add(halo);

  // салют
  const F = 600;
  const fp = new Float32Array(F * 3);
  const fc = new Float32Array(F * 3);
  const fv = Array.from({ length: F }, () => new THREE.Vector3());
  const fg = new THREE.BufferGeometry();
  fg.setAttribute("position", new THREE.BufferAttribute(fp, 3));
  fg.setAttribute("color", new THREE.BufferAttribute(fc, 3));
  const fw = new THREE.Points(fg, new THREE.PointsMaterial({ map: softDot(), size: 1.1, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  fw.frustumCulled = false;
  g.add(fw);
  let burstT = 0;
  let burst = 0;
  const boom = () => {
    const per = 120;
    const base = (burst % 5) * per;
    const c = pal[burst % pal.length];
    const center = new THREE.Vector3((Math.random() - 0.5) * 50, 42 + Math.random() * 18, (Math.random() - 0.5) * 30);
    for (let i = 0; i < per; i++) {
      const j = base + i;
      fp.set([center.x, center.y, center.z], j * 3);
      fv[j].randomDirection().multiplyScalar(9 + Math.random() * 4);
      fc.set([c.r, c.g, c.b], j * 3);
    }
    burst++;
  };
  let grow = 0;
  return {
    group: g,
    start(at: THREE.Vector3) {
      g.position.copy(at);
      g.visible = true;
      grow = 0;
    },
    update(dt: number, t: number) {
      if (!g.visible) return;
      grow = Math.min(1, grow + dt * 0.35);
      const e = 1 - Math.pow(1 - grow, 3);
      g.scale.set(e, e, e);
      star.rotation.y = t;
      (lights.material as THREE.PointsMaterial).size = 1.1 + Math.sin(t * 4) * 0.25;
      burstT -= dt;
      if (grow > 0.8 && burstT <= 0) {
        boom();
        burstT = 0.9 + Math.random() * 0.8;
      }
      for (let i = 0; i < F; i++) {
        fv[i].y -= dt * 6;
        fv[i].multiplyScalar(1 - dt * 0.9);
        fp[i * 3] += fv[i].x * dt;
        fp[i * 3 + 1] += fv[i].y * dt;
        fp[i * 3 + 2] += fv[i].z * dt;
        fc[i * 3] *= 1 - dt * 0.7;
        fc[i * 3 + 1] *= 1 - dt * 0.7;
        fc[i * 3 + 2] *= 1 - dt * 0.7;
      }
      fg.attributes.position.needsUpdate = true;
      fg.attributes.color.needsUpdate = true;
    },
  };
}

/** Стадо северных оленей: иногда выбегает из леса и бежит рядом с поездом, оставляя искры. */
export function makeReindeer(scene: THREE.Scene) {
  const fur = new THREE.MeshStandardMaterial({ color: "#8a5a3c", roughness: 0.85 });
  const light = new THREE.MeshStandardMaterial({ color: "#efe6da", roughness: 0.9 });
  const horn = new THREE.MeshStandardMaterial({ color: "#d9c39a", roughness: 0.6 });
  const dark = new THREE.MeshStandardMaterial({ color: "#2a1d16", roughness: 0.8 });
  type Deer = { g: THREE.Group; legs: THREE.Group[]; phase: number; off: THREE.Vector3 };
  const mkDeer = (): Deer => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.3, 4, 10).rotateZ(Math.PI / 2), fur);
    body.position.y = 1.55;
    g.add(body);
    const belly = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 1.0, 4, 8).rotateZ(Math.PI / 2), light);
    belly.position.set(0, 1.38, 0);
    g.add(belly);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 0.9, 8), fur);
    neck.position.set(0.85, 2.0, 0);
    neck.rotation.z = -0.7;
    g.add(neck);
    const mane = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), light);
    mane.scale.set(1, 1.3, 0.9);
    mane.position.set(0.85, 1.85, 0);
    g.add(mane);
    const head = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.45, 4, 8).rotateZ(Math.PI / 2 + 0.3), fur);
    head.position.set(1.3, 2.4, 0);
    g.add(head);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 5), dark);
    nose.position.set(1.6, 2.3, 0);
    g.add(nose);
    // ветвистые рога
    for (const z of [-0.12, 0.12]) {
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.9, 5), horn);
      beam.position.set(1.15, 2.95, z * 2.2);
      beam.rotation.set(z * 2, 0, 0.45);
      g.add(beam);
      for (let k = 0; k < 3; k++) {
        const tine = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.35, 4), horn);
        tine.position.set(1.05 + k * 0.08, 2.75 + k * 0.22, z * (2.6 + k * 0.6));
        tine.rotation.set(z * 3, 0, -0.5);
        g.add(tine);
      }
    }
    const tail = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5), light);
    tail.position.set(-1.05, 1.75, 0);
    g.add(tail);
    const legs: THREE.Group[] = [];
    for (const [x, z] of [[0.6, 0.22], [0.6, -0.22], [-0.6, 0.22], [-0.6, -0.22]]) {
      const leg = new THREE.Group();
      leg.position.set(x, 1.35, z);
      const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 1.2, 6).translate(0, -0.6, 0), fur);
      leg.add(upper);
      const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.12, 6), dark);
      hoof.position.y = -1.22;
      leg.add(hoof);
      g.add(leg);
      legs.push(leg);
    }
    return { g, legs, phase: Math.random() * 6.28, off: new THREE.Vector3() };
  };
  const herd = new THREE.Group();
  herd.visible = false;
  scene.add(herd);
  const deer: Deer[] = [];
  for (let i = 0; i < 6; i++) {
    const d = mkDeer();
    d.off.set((i % 3) * -4.2 - Math.floor(i / 3) * 2.1, 0, Math.floor(i / 3) * 3.2 + (i % 2) * 0.8);
    d.g.scale.setScalar(i === 0 ? 1.45 : 1.1 + Math.random() * 0.25);
    herd.add(d.g);
    deer.push(d);
  }
  // золотая пыль из-под копыт
  const N = 260;
  const dp = new Float32Array(N * 3);
  const dl = new Float32Array(N);
  const dv = Array.from({ length: N }, () => new THREE.Vector3());
  const dg = new THREE.BufferGeometry();
  dg.setAttribute("position", new THREE.BufferAttribute(dp, 3));
  const dust = new THREE.Points(dg, new THREE.PointsMaterial({ map: softDot(), size: 0.55, color: new THREE.Color(2.6, 2.1, 1.1), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  dust.frustumCulled = false;
  scene.add(dust);
  let di = 0;

  // ?deer — стадо сразу (для проверки)
  let next = new URLSearchParams(location.search).has("deer") ? 0.5 : 14 + Math.random() * 8;
  let active = false;
  let run = 0;
  const tmp = new THREE.Vector3();
  return {
    update(dt: number, t: number, speed: number, allowed: boolean) {
      // искры живут и без стада: догорают
      for (let i = 0; i < N; i++) {
        dl[i] -= dt;
        if (dl[i] <= 0) {
          dp[i * 3 + 1] = -50;
          continue;
        }
        dv[i].y -= dt * 0.8;
        dp[i * 3] += (dv[i].x - speed) * dt;
        dp[i * 3 + 1] += dv[i].y * dt;
        dp[i * 3 + 2] += dv[i].z * dt;
      }
      dg.attributes.position.needsUpdate = true;
      if (!active) {
        next -= dt;
        if (next <= 0 && allowed) {
          active = true;
          run = 0;
          const near = Math.random() < 0.75;
          herd.position.set(60, 0, near ? 15 + Math.random() * 6 : -(22 + Math.random() * 12));
          herd.rotation.y = 0;
          herd.visible = true;
        }
        return;
      }
      run += dt;
      // бегут почти вровень с поездом и понемногу отстают, в конце уходят в лес
      const runSpeed = speed - 1.8;
      herd.position.x += (runSpeed - speed) * dt;
      if (run > 38) herd.position.z += Math.sign(herd.position.z) * dt * 6;
      if (herd.position.x < -120 || Math.abs(herd.position.z) > 90) {
        active = false;
        herd.visible = false;
        next = 35 + Math.random() * 30;
        return;
      }
      deer.forEach((d, i) => {
        const ph = t * 9 + d.phase;
        d.g.position.set(d.off.x + Math.sin(t * 0.7 + i) * 0.8, Math.max(0, Math.sin(ph)) * 0.55, d.off.z + Math.sin(t * 0.5 + i * 2) * 0.5);
        d.g.rotation.z = Math.cos(ph) * 0.08;
        d.legs.forEach((l, k) => (l.rotation.z = Math.sin(ph + (k < 2 ? 0 : Math.PI)) * 0.75));
        if (Math.random() < dt * 22) {
          d.g.getWorldPosition(tmp);
          const j = di++ % N;
          dp.set([tmp.x - 0.8 + Math.random() * 1.6, 0.25 + Math.random() * 0.3, tmp.z + (Math.random() - 0.5)], j * 3);
          dv[j].set(speed * 0.82 + (Math.random() - 0.5), 0.8 + Math.random() * 1.2, (Math.random() - 0.5) * 0.8);
          dl[j] = 1.2 + Math.random();
        }
      });
    },
  };
}
