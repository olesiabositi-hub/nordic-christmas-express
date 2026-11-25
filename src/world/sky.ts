// Небо синего часа: градиент, звёзды, луна, северное сияние, горы на горизонте.
import * as THREE from "three";
import { softDot } from "./tex";

export function makeSky(scene: THREE.Scene) {
  const group = new THREE.Group();
  scene.add(group);

  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      top: { value: new THREE.Color("#03081a") },
      mid: { value: new THREE.Color("#0f2250") },
      horizon: { value: new THREE.Color("#3b5f99") },
      glow: { value: new THREE.Color("#7aa0d8") },
    },
    vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform vec3 top, mid, horizon, glow; varying vec3 vP;
      void main(){
        float h = vP.y;
        vec3 c = mix(horizon, mid, smoothstep(0.0, 0.25, h));
        c = mix(c, top, smoothstep(0.25, 0.85, h));
        c += glow * 0.35 * exp(-abs(h) * 14.0);
        c = mix(c, horizon*0.6, step(h, 0.0));
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(950, 32, 16), skyMat);
  group.add(sky);

  // Звёзды
  const n = 1400;
  const pos = new Float32Array(n * 3);
  const tw = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const u = Math.random() * Math.PI * 2;
    const v = Math.acos(1 - Math.random() * 0.9) ; // верхняя полусфера
    const r = 900;
    pos[i * 3] = r * Math.sin(v) * Math.cos(u);
    pos[i * 3 + 1] = r * Math.cos(v) + 20;
    pos[i * 3 + 2] = r * Math.sin(v) * Math.sin(u);
    tw[i] = Math.random() * 6.28;
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  sg.setAttribute("tw", new THREE.BufferAttribute(tw, 1));
  const starMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    fog: false,
    blending: THREE.AdditiveBlending,
    uniforms: { t: { value: 0 }, map: { value: softDot() } },
    vertexShader: `attribute float tw; uniform float t; varying float a;
      void main(){ a = 0.45 + 0.55*sin(t*1.7 + tw*3.0); vec4 mv = modelViewMatrix*vec4(position,1.); gl_PointSize = 2.2 + 1.6*fract(tw); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform sampler2D map; varying float a; void main(){ vec4 c = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vec3(0.85,0.9,1.0), c.a*a); }`,
  });
  group.add(new THREE.Points(sg, starMat));

  // Луна
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color: new THREE.Color(1.6, 1.65, 1.8), fog: false, depthWrite: false }));
  moon.scale.setScalar(60);
  moon.position.set(-420, 330, -620);
  group.add(moon);
  const moonDisc = new THREE.Mesh(new THREE.CircleGeometry(11, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.2, 2.3), fog: false }));
  moonDisc.position.copy(moon.position).multiplyScalar(0.99);
  moonDisc.lookAt(0, 0, 0);
  group.add(moonDisc);

  // Северное сияние
  const auroraMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    fog: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: { t: { value: 0 }, strength: { value: 0.55 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float t, strength; varying vec2 vUv;
      float n(float x){ return sin(x)*0.5+0.5; }
      void main(){
        float x = vUv.x*10.0;
        float wave = 0.35 + 0.18*sin(x*0.7 + t*0.15) + 0.08*sin(x*2.3 - t*0.3);
        float d = abs(vUv.y - wave);
        float curtain = smoothstep(0.32, 0.0, d) * (0.55 + 0.45*n(x*6.0 + t*0.8 + sin(x*1.7)*2.0));
        float fadeX = smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.75, vUv.x);
        float rays = smoothstep(wave-0.02, wave+0.4, vUv.y);
        vec3 col = mix(vec3(0.15,1.0,0.55), vec3(0.3,0.55,1.0), rays);
        gl_FragColor = vec4(col, curtain*fadeX*strength*(1.0 - rays*0.6));
      }`,
  });
  const aurora = new THREE.Mesh(new THREE.PlaneGeometry(1500, 360, 1, 1), auroraMat);
  aurora.position.set(80, 165, -700);
  group.add(aurora);
  // второй, розово-фиолетовый занавес — виден только на пике
  const aurora2Mat = auroraMat.clone();
  aurora2Mat.fragmentShader = auroraMat.fragmentShader.replace("vec3(0.15,1.0,0.55), vec3(0.3,0.55,1.0)", "vec3(0.35,1.0,0.7), vec3(0.85,0.35,1.0)");
  const aurora2 = new THREE.Mesh(new THREE.PlaneGeometry(1200, 300, 1, 1), aurora2Mat);
  aurora2.position.set(-260, 210, -650);
  aurora2.rotation.y = 0.35;
  group.add(aurora2);

  // Падающие звёзды
  const SN = 40;
  const sp = new Float32Array(SN * 3);
  const sa = new Float32Array(SN);
  const sgeo = new THREE.BufferGeometry();
  sgeo.setAttribute("position", new THREE.BufferAttribute(sp, 3));
  sgeo.setAttribute("tw", new THREE.BufferAttribute(sa, 1));
  const shootMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    fog: false,
    blending: THREE.AdditiveBlending,
    uniforms: { map: { value: softDot() } },
    vertexShader: `attribute float tw; varying float a; void main(){ a = tw; vec4 mv = modelViewMatrix*vec4(position,1.); gl_PointSize = 1.0 + 7.0*tw; gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform sampler2D map; varying float a; void main(){ vec4 c = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vec3(1.0,0.95,0.85)*1.6, c.a*a); }`,
  });
  const shoot = new THREE.Points(sgeo, shootMat);
  shoot.frustumCulled = false;
  group.add(shoot);
  let shootNext = 8 + Math.random() * 10;
  let shootT = -1;
  const sFrom = new THREE.Vector3(), sDir = new THREE.Vector3();

  // Сияние вспышками: долго тихо, потом разгорается на полминуты
  let level = 0.12;
  let episode = -1;
  let nextEpisode = new URLSearchParams(location.search).has("aurora") ? 0 : 20 + Math.random() * 20;

  return {
    update(t: number, dt = 0.016) {
      starMat.uniforms.t.value = t;
      auroraMat.uniforms.t.value = t;
      aurora2Mat.uniforms.t.value = t * 1.3 + 40;
      if (episode < 0) {
        nextEpisode -= dt;
        if (nextEpisode <= 0) episode = 0;
      } else {
        episode += dt;
        if (episode > 34) {
          episode = -1;
          nextEpisode = 45 + Math.random() * 50;
        }
      }
      const peak = episode < 0 ? 0 : Math.sin(Math.min(1, episode / 34) * Math.PI);
      const target = 0.12 + peak * 0.95;
      level += (target - level) * Math.min(1, dt * 1.5);
      auroraMat.uniforms.strength.value = level;
      aurora2Mat.uniforms.strength.value = Math.max(0, level - 0.3) * 0.9;

      if (shootT < 0) {
        shootNext -= dt;
        if (shootNext <= 0) {
          shootT = 0;
          const u = Math.random() * Math.PI * 0.8 - Math.PI * 0.9;
          sFrom.set(Math.cos(u) * 700, 380 + Math.random() * 160, Math.sin(u) * 700);
          sDir.set(Math.random() - 0.5, -0.45, Math.random() - 0.5).normalize().multiplyScalar(520);
        }
      } else {
        shootT += dt;
        const k = shootT / 1.1;
        for (let i = 0; i < SN; i++) {
          const kk = Math.max(0, k - i * 0.006);
          sp.set([sFrom.x + sDir.x * kk, sFrom.y + sDir.y * kk, sFrom.z + sDir.z * kk], i * 3);
          sa[i] = k > 1 ? 0 : (1 - i / SN) * Math.sin(Math.min(1, k) * Math.PI);
        }
        sgeo.attributes.position.needsUpdate = true;
        sgeo.attributes.tw.needsUpdate = true;
        if (k > 1.2) {
          shootT = -1;
          shootNext = 10 + Math.random() * 18;
        }
      }
    },
  };
}
