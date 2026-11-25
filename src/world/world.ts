// Сцена целиком: рендер, камера, свет, движение мира, выбор вагона.
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { makeSky } from "./sky";
import { makeHorizon } from "./horizon";
import { CLEAR, makeScenery } from "./scenery";
import { makeJourney, STOPS } from "./landmarks";
import { makeTrain } from "./train";
import { makeFinaleTree, makeReindeer, makeSanta, makeSnow, makeSteam } from "./fx";
import { setTrainMoving, whistle } from "../audio";

export type Tier = 0 | 1 | 2;

function detectTier(): Tier {
  const q = new URLSearchParams(location.search).get("q");
  if (q === "low") return 0;
  if (q === "mid") return 1;
  if (q === "high") return 2;
  const cores = navigator.hardwareConcurrency || 4;
  const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || Math.min(screen.width, screen.height) < 600;
  if (mobile) return cores >= 8 ? 1 : 0;
  return cores >= 8 ? 2 : 1;
}

export type WorldEvents = {
  hover: (caseIndex: number | null) => void;
  select: (caseIndex: number) => void;
  santa: () => void;
};

export function createWorld(container: HTMLElement, events: WorldEvents) {
  let tier = detectTier();
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const renderer = new THREE.WebGLRenderer({ antialias: tier > 0, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, [1, 1.5, 2][tier]));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2("#3a5a8f", 0.0068);
  const camera = new THREE.PerspectiveCamera(42, container.clientWidth / container.clientHeight, 0.5, 2500);

  // Свет: холодная ночь и тёплые акценты
  scene.add(new THREE.HemisphereLight("#9db8f0", "#2a3558", 1.5));
  const moon = new THREE.DirectionalLight("#b9d0ff", 1.9);
  moon.position.set(-50, 80, 70);
  scene.add(moon);
  scene.add(new THREE.AmbientLight("#2a3d6b", 0.35));

  const sky = makeSky(scene);
  const mountains = makeHorizon(scene, tier);
  const scenery = makeScenery(scene, [700, 1200, 1700][tier]);
  const journey = makeJourney(scene, scenery.glow, scenery.lightMat, CLEAR);
  const train = makeTrain(scene);
  const snow = makeSnow(scene, [3500, 7000, 11000][tier]);
  const steam = makeSteam(scene, train.chimney);
  const santa = makeSanta(scene);
  const tree = makeFinaleTree(scene);
  const deer = makeReindeer(scene);
  // свисток паровоза: отдельное облачко пара, валит только во время гудка
  const whistleSteam = makeSteam(scene, new THREE.Vector3(22.8, 4.6, 0), false, 60);
  const toot = () => {
    whistleSteam.puff(2.6);
    whistle();
  };
  let festPrev = scenery.festiveX();

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(container.clientWidth, container.clientHeight), 0.6, 0.5, 0.9);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  let useBloom = tier > 0;

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enablePan = false;
  controls.minDistance = 28;
  controls.maxDistance = 120;
  controls.minPolarAngle = 0.35;
  controls.maxPolarAngle = 1.38;
  controls.autoRotate = !reduceMotion;
  controls.autoRotateSpeed = 0.18;
  controls.target.set(-2, 7, 0);

  const HUB_BASE = new THREE.Vector3(-40, 14, 40);
  const HUB_POS = new THREE.Vector3();
  const hubFor = () => {
    // на узком вертикальном экране отъезжаем дальше, чтобы поезд влез целиком
    const a = container.clientWidth / container.clientHeight;
    HUB_POS.copy(HUB_BASE).multiplyScalar(a < 1 ? 1.9 : a < 1.3 ? 1.35 : 1);
    controls.maxDistance = a < 1 ? 190 : 120;
    return HUB_POS;
  };
  hubFor();
  const skipIntro = new URLSearchParams(location.search).has("nointro");
  camera.position.copy(skipIntro ? HUB_POS : new THREE.Vector3(150, 110, 210));
  camera.lookAt(controls.target);

  // Камера: полёты между точками
  type Shot = { from: THREE.Vector3; to: THREE.Vector3; tFrom: THREE.Vector3; tTo: THREE.Vector3; k: number; dur: number; done?: () => void };
  let shot: Shot | null = null;
  const fly = (pos: THREE.Vector3, target: THREE.Vector3, dur: number, done?: () => void) => {
    controls.enabled = false;
    shot = { from: camera.position.clone(), to: pos, tFrom: controls.target.clone(), tTo: target, k: 0, dur, done };
  };
  if (!skipIntro) fly(HUB_POS.clone(), new THREE.Vector3(-2, 7, 0), reduceMotion ? 0.01 : 5.5, () => (controls.enabled = true));

  let mode: "hub" | "focus" | "finale" = "hub";
  let focused = -1;
  let speed = 11;
  let speedTarget = 11;
  let travelled = 0;

  // Выбор вагона
  const ray = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let hovered: number | null = null;
  let downAt: { x: number; y: number } | null = null;
  const setMouse = (e: PointerEvent) => {
    const r = renderer.domElement.getBoundingClientRect();
    mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  };
  const pickAt = (): { car: number | null; santa: boolean } => {
    ray.setFromCamera(mouse, camera);
    if (santa.flying() && ray.intersectObject(santa.hit, false).length) return { car: null, santa: true };
    const hit = ray.intersectObjects(train.pickables, false)[0];
    return { car: hit ? (hit.object.userData.caseIndex as number) : null, santa: false };
  };
  renderer.domElement.addEventListener("pointermove", (e) => {
    if (mode !== "hub") return;
    setMouse(e);
    const { car, santa: s } = pickAt();
    renderer.domElement.style.cursor = car !== null || s ? "pointer" : "grab";
    if (car !== hovered) {
      hovered = car;
      train.cars.forEach((c) => (c.hoverTarget = c.caseIndex === car ? 1 : 0));
      events.hover(car);
    }
  });
  renderer.domElement.addEventListener("pointerdown", (e) => (downAt = { x: e.clientX, y: e.clientY }));
  renderer.domElement.addEventListener("pointerup", (e) => {
    if (!downAt || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 6) return;
    if (mode !== "hub") return;
    setMouse(e);
    const { car, santa: s } = pickAt();
    if (s) events.santa();
    else if (car !== null) events.select(car);
  });

  // белая вспышка-переход поверх сцены
  const flashEl = document.createElement("div");
  Object.assign(flashEl.style, { position: "absolute", inset: "0", background: "radial-gradient(circle, #ffffff, #cfe2ff)", opacity: "0", pointerEvents: "none", transition: "opacity .6s ease" });
  container.appendChild(flashEl);
  const flash = (mid: () => void) => {
    flashEl.style.opacity = "1";
    setTimeout(() => {
      mid();
      flashEl.style.opacity = "0";
    }, 650);
  };

  const resize = () => {
    const w = container.clientWidth, h = container.clientHeight;
    renderer.setSize(w, h);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    hubFor();
  };
  addEventListener("resize", resize);

  // Самонастройка качества по частоте кадров
  let fpsAcc = 0, fpsN = 0, fpsChecked = false;

  const clock = new THREE.Timer();
  const tmp = new THREE.Vector3();
  const loop = () => {
    clock.update();
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.getElapsed();
    speed += (speedTarget - speed) * Math.min(1, dt * 0.5);
    const dx = speed * dt;
    travelled += dx;
    journey.update(dx, t);
    scenery.update(dx, t);
    mountains.update(dx);
    sky.update(t, dt);
    deer.update(dt, t, speed, !reduceMotion);
    whistleSteam.update(dt, speed);
    // праздничный полустанок впереди — поезд гудит в ответ машущим людям
    const festNow = scenery.festiveX();
    if (festPrev > 52 && festNow <= 52 && speed > 2 && scenery.festiveVisible()) toot();
    festPrev = festNow;
    // и на подходе к каждой настоящей станции маршрута
    const jp = journey.status().pos;
    for (const st of STOPS) {
      const ahead = st.at - jp;
      if (ahead <= 60 && ahead > 60 - dx - 0.001 && speed > 2) toot();
    }
    train.update(dt, t, speed);
    steam.update(dt, speed);
    snow.update(t, travelled, tmp.set(camera.position.x * 0.5, 0, camera.position.z * 0.4));
    santa.update(dt, t, mode !== "focus" && !reduceMotion);
    tree.update(dt, t);
    // ёлка стоит в каньоне: когда поезд трогается, она уезжает назад вместе с миром
    if (tree.group.visible) {
      tree.group.position.x -= dx;
      if (tree.group.position.x < -400) tree.group.visible = false;
    }

    if (shot) {
      shot.k = Math.min(1, shot.k + dt / shot.dur);
      const e = shot.k < 0.5 ? 4 * shot.k ** 3 : 1 - (-2 * shot.k + 2) ** 3 / 2;
      camera.position.lerpVectors(shot.from, shot.to, e);
      // лёгкая дуга, чтобы полёт не был прямой линией
      camera.position.y += Math.sin(e * Math.PI) * 6;
      controls.target.lerpVectors(shot.tFrom, shot.tTo, e);
      camera.lookAt(controls.target);
      if (shot.k >= 1) {
        const d = shot.done;
        shot = null;
        d?.();
      }
    } else if (controls.enabled) {
      controls.update();
    }

    if (useBloom) composer.render();
    else renderer.render(scene, camera);

    if (!fpsChecked && t > 2) {
      fpsAcc += dt;
      fpsN++;
      if (fpsAcc > 4) {
        fpsChecked = true;
        const fps = fpsN / fpsAcc;
        if (fps < 34 && tier > 0) {
          tier = (tier - 1) as Tier;
          renderer.setPixelRatio(Math.min(devicePixelRatio, [1, 1.25, 1.5][tier]));
          resize();
          if (fps < 24) useBloom = false;
        }
      }
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  return {
    /** Экранные координаты вагона — для плашки над ним. */
    screenOf(caseIndex: number) {
      const c = train.carByCase(caseIndex);
      const p = new THREE.Vector3(c.x, caseIndex === 4 ? 6.5 : 5.6, 0).project(camera);
      return { x: ((p.x + 1) / 2) * container.clientWidth, y: ((1 - p.y) / 2) * container.clientHeight, visible: p.z < 1 };
    },
    setLocked(caseIndex: number, locked: boolean) {
      train.carByCase(caseIndex).locked = locked;
    },
    focus(caseIndex: number, onArrive: () => void) {
      mode = "focus";
      focused = caseIndex;
      hovered = null;
      events.hover(null);
      train.cars.forEach((c) => (c.hoverTarget = 0));
      const c = train.carByCase(caseIndex);
      controls.autoRotate = false;
      const wide = container.clientWidth > 900;
      // вагон слева от панели, вид сверху
      const tx = c.x + (wide ? 10 : 0);
      fly(new THREE.Vector3(tx - 2, wide ? 29 : 36, 18), new THREE.Vector3(tx, 1.5, wide ? 0 : 4), 1.6, onArrive);
      setTimeout(() => (c.openTarget = 1), 700);
    },
    unfocus() {
      if (focused >= 0) train.carByCase(focused).openTarget = 0;
      focused = -1;
      fly(HUB_POS.clone(), new THREE.Vector3(-2, 7, 0), 1.8, () => {
        mode = "hub";
        controls.enabled = true;
        controls.autoRotate = !reduceMotion;
      });
    },
    finale(onArrive: () => void) {
      mode = "finale";
      if (focused >= 0) train.carByCase(focused).openTarget = 0;
      focused = -1;
      setTrainMoving(false);
      // поезд прибывает в Рускеалу: короткая снежная вспышка, и мы у мраморного каньона
      flash(() => {
        journey.jump(journey.canyonAt + 4);
        journey.finaleMode(true);
        speed = 0;
        speedTarget = 0;
      });
      setTimeout(toot, 2600);
      setTimeout(() => tree.start(new THREE.Vector3(0, 0.1, -58)), 1400);
      fly(new THREE.Vector3(-40, 24, 42), new THREE.Vector3(0, 15, -46), 3.2, () => {
        controls.enabled = true;
        controls.target.set(0, 15, -46);
        controls.minDistance = 30;
        controls.maxDistance = 160;
        onArrive();
      });
    },
    leaveFinale() {
      mode = "hub";
      speedTarget = 11;
      setTrainMoving(true);
      journey.finaleMode(false);
      controls.minDistance = 28;
      hubFor();
      fly(HUB_POS.clone(), new THREE.Vector3(-2, 7, 0), 2.2, () => (controls.enabled = true));
    },
    toot,
    route: () => journey.status(),
    get mode() {
      return mode;
    },
  };
}
