import "@fontsource/manrope/400.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "@fontsource/manrope/800.css";
import "./styles.css";
import "./ui/case.css";
import { createWorld } from "./world/world";
import { createHub } from "./ui/hub";
import { load } from "./state";

const S = load();
let hub: ReturnType<typeof createHub> | null = null;

function noWebGL() {
  try {
    const c = document.createElement("canvas");
    return !(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return true;
  }
}

if (noWebGL()) {
  document.getElementById("ui")!.innerHTML =
    '<div class="modal-bg"><div class="modal"><h2>WebGL required</h2><p class="lead">Your browser couldn’t start 3D. Try a recent Chrome, Safari or Firefox.</p></div></div>';
} else {
  const world = createWorld(document.getElementById("world")!, {
    hover: (i) => hub?.hover(i),
    select: (i) => hub?.select(i),
    santa: () => hub?.santaCaught(),
  });
  hub = createHub(document.getElementById("ui")!, world, S);
  setTimeout(() => hub!.showIntroIfNeeded(), new URLSearchParams(location.search).has("nointro") ? 0 : 3200);
}
