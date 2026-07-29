/* ============================================================
   3D 卧室场景
   - Three.js WebGL 渲染房间与家具(低多边形卡通风)
   - CSS3DRenderer 将 iframe(site.html)对齐到显示器屏幕
   - 「进入屏幕」:相机推进 → 全屏接管 iframe
   ============================================================ */
import * as THREE from "three";
import { CSS3DObject, CSS3DRenderer } from "three/addons/renderers/CSS3DRenderer.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

/* ---------- 常量 ---------- */
// 显示器屏幕可视区(世界单位)与 portal 像素尺寸
const SCREEN_W = 1.68;
const SCREEN_H = 0.99;
const SCREEN_CENTER = new THREE.Vector3(0, 1.87, 0.075);
const PORTAL_PX_W = 1280;

const CAM_HOME_POS = new THREE.Vector3(-2.75, 3.3, 5.9);
const CAM_HOME_TARGET = new THREE.Vector3(0.45, 0.95, -0.35);

/* ---------- 主题配色 ---------- */
const THEMES = {
  classic: {
    label: "Classic",
    floor: 0xb08050, wall: 0xf0e4cf, wallSide: 0xeaddc5, window: 0xfdf7e7,
    desk: 0xd9994e, deskDark: 0xc07f38,
    chair: 0x33313a, chairSeat: 0x66744e, chairBase: 0x4a4848,
    dark: 0x232120, screenBezel: 0x1b1a18,
    keyboard: 0x7d925c, keycap: 0xeae4d0,
    bookA: 0xc8563e, bookB: 0x4a7a68, bookC: 0xdcb04a,
    cup: 0x6fc2e0, straw: 0xf2f2f2,
    pot: 0xb56a3f, soil: 0x5d4530, leaf: 0x6a9a5b, stem: 0x577a44,
    nsBody: 0x2b2b2e, nsLeft: 0x40a8d8, nsRight: 0xe8635a,
    bin: 0xf5f1e8, note: 0xfff9e8,
    rug: 0xeae2d0, shelf: 0xc79157, pegboard: 0xf8f5ec,
    drawer: 0x8c5232, drawerDark: 0x74422a, sofa: 0x74804e,
    lampBase: 0x6b4a33, lampShade: 0xffe9bb, windowFrame: 0xf6f2e7, daylight: 0xfff3d6,
    hemi: 1.05, dir: 1.9, lamp: 0.45, sunSpot: true, bg: "#f1e6d2",
  },
  dark: {
    label: "Dark",
    floor: 0x453830, wall: 0x35323f, wallSide: 0x302d3a, window: 0x8d86c9,
    desk: 0x9a6b38, deskDark: 0x845a2c,
    chair: 0x2a2830, chairSeat: 0x4a5440, chairBase: 0x3c3a40,
    dark: 0x1a191e, screenBezel: 0x141318,
    keyboard: 0x5c7050, keycap: 0xc9c4b4,
    bookA: 0xa8462e, bookB: 0x3a6a58, bookC: 0xbc9038,
    cup: 0x4f9ec0, straw: 0xd8d8d8,
    pot: 0x95562f, soil: 0x4d3826, leaf: 0x527a48, stem: 0x476438,
    nsBody: 0x232328, nsLeft: 0x3690c0, nsRight: 0xd05048,
    bin: 0xb5b1ac, note: 0xd8d2be,
    rug: 0x565064, shelf: 0x8a6038, pegboard: 0x4e4a58,
    drawer: 0x64381f, drawerDark: 0x502c18, sofa: 0x4d5638,
    lampBase: 0x4c3524, lampShade: 0xffd894, windowFrame: 0x3c3946, daylight: 0x8d86c9,
    hemi: 0.4, dir: 0.55, lamp: 1.7, sunSpot: false, bg: "#23222b",
  },
};

let themeName = "classic";

/* ---------- DOM ---------- */
const container = document.getElementById("room-scene");
const loaderEl = document.querySelector("[data-loader]");
const statusEl = document.querySelector("[data-status]");
const enterBtn = document.querySelector("[data-enter]");
const backBtn = document.querySelector("[data-back]");
const styleBtn = document.querySelector("[data-style-toggle]");
const portalEl = document.querySelector("[data-portal]");
const iframeEl = portalEl.querySelector("iframe");

/* 状态提示条:显示一段文字,片刻后自动淡出 */
let statusTimer;
const flashStatus = (text, duration = 2600) => {
  statusEl.textContent = text;
  statusEl.classList.remove("is-hidden");
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => statusEl.classList.add("is-hidden"), duration);
};

/* ---------- 渲染器 ---------- */
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(46, innerWidth / innerHeight, 0.1, 80);
camera.position.copy(CAM_HOME_POS);

const cssRenderer = new CSS3DRenderer();
cssRenderer.setSize(innerWidth, innerHeight);
cssRenderer.domElement.classList.add("css3d-layer");
cssRenderer.domElement.style.zIndex = "1";
container.appendChild(cssRenderer.domElement);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.domElement.style.position = "absolute";
renderer.domElement.style.inset = "0";
renderer.domElement.style.zIndex = "2";
renderer.domElement.style.pointerEvents = "none";
container.appendChild(renderer.domElement);

/* ---------- 材质工厂(支持主题切换) ---------- */
const gradientMap = (() => {
  const steps = 4;
  const data = new Uint8Array(steps);
  for (let i = 0; i < steps; i++) data[i] = Math.round(150 + (i / (steps - 1)) * 105);
  const tex = new THREE.DataTexture(data, steps, 1, THREE.RedFormat);
  tex.minFilter = tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
})();

const themedMats = [];
let sunSpotMesh = null;   // 地板阳光光斑(Dark 主题隐藏)
const mat = (key, extra = {}) => {
  const m = new THREE.MeshToonMaterial({ color: THEMES[themeName][key], gradientMap, ...extra });
  themedMats.push({ m, key });
  return m;
};
const basicMat = (key, extra = {}) => {
  const m = new THREE.MeshBasicMaterial({ color: THEMES[themeName][key], ...extra });
  themedMats.push({ m, key });
  return m;
};

const M = {
  floor: mat("floor"),
  wall: mat("wall"),
  wallSide: mat("wallSide"),
  window: basicMat("window", { transparent: true, opacity: 0.85 }),
  desk: mat("desk"),
  deskDark: mat("deskDark"),
  chair: mat("chair"),
  chairSeat: mat("chairSeat"),
  chairBase: mat("chairBase"),
  dark: mat("dark"),
  screenBezel: mat("screenBezel"),
  keyboard: mat("keyboard"),
  keycap: mat("keycap"),
  bookA: mat("bookA"),
  bookB: mat("bookB"),
  bookC: mat("bookC"),
  cup: mat("cup", { transparent: true, opacity: 0.82 }),
  straw: mat("straw"),
  pot: mat("pot"),
  soil: mat("soil"),
  leaf: mat("leaf"),
  stem: mat("stem"),
  nsBody: mat("nsBody"),
  nsLeft: mat("nsLeft"),
  nsRight: mat("nsRight"),
  bin: mat("bin", { side: THREE.DoubleSide }),
  note: mat("note"),
  rug: mat("rug"),
  shelf: mat("shelf"),
  pegboard: mat("pegboard"),
  drawer: mat("drawer"),
  drawerDark: mat("drawerDark"),
  sofa: mat("sofa"),
  lampBase: mat("lampBase"),
  lampShade: basicMat("lampShade"),
  windowFrame: mat("windowFrame"),
  daylight: basicMat("daylight", { transparent: true, opacity: 0.9 }),
};

/* ---------- 灯光 ---------- */
const hemi = new THREE.HemisphereLight(0xfff2dc, 0xb99f7e, THEMES[themeName].hemi);
scene.add(hemi);

const dirLight = new THREE.DirectionalLight(0xffd9a0, THEMES[themeName].dir);
dirLight.position.set(-5.5, 5.5, 3);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
dirLight.shadow.camera.left = -7;
dirLight.shadow.camera.right = 7;
dirLight.shadow.camera.top = 8;
dirLight.shadow.camera.bottom = -5;
dirLight.shadow.bias = -0.0004;
scene.add(dirLight);

// 五斗柜上的台灯(暖光,Dark 主题下更亮)
const lampLight = new THREE.PointLight(0xffb46a, THEMES[themeName].lamp, 7, 1.8);
lampLight.position.set(3.85, 1.75, 0.65);
scene.add(lampLight);

/* ---------- 几何工具 ---------- */
const box = (material, [x, y, z], [w, h, d], { shadow = true, ry = 0 } = {}) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  m.castShadow = shadow;
  m.receiveShadow = true;
  scene.add(m);
  return m;
};
const cyl = (material, [x, y, z], [rt, rb, h, seg = 20], { shadow = true, open = false } = {}) => {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), material);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  scene.add(m);
  return m;
};

/* ---------- 房间 ---------- */
{
  // 程序木纹:浅灰底 + 板缝,由材质 color 上色,主题切换仍生效
  const woodCv = document.createElement("canvas");
  woodCv.width = 256; woodCv.height = 256;
  const wctx = woodCv.getContext("2d");
  wctx.fillStyle = "#d8d2c8";
  wctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 4; i++) {
    const y = i * 64;
    wctx.fillStyle = i % 2 ? "#cfc8bc" : "#d4cdc2";
    wctx.fillRect(0, y, 256, 64);
    wctx.fillStyle = "rgba(90, 70, 50, 0.35)";
    wctx.fillRect(0, y, 256, 3);
    wctx.fillRect(((i * 96) + 40) % 256, y, 3, 64);   // 错缝
    wctx.fillStyle = "rgba(120, 95, 65, 0.12)";
    for (let s = 0; s < 5; s++) wctx.fillRect(0, y + 12 + s * 11, 256, 2);
  }
  const woodTex = new THREE.CanvasTexture(woodCv);
  woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping;
  woodTex.repeat.set(6, 6);
  woodTex.colorSpace = THREE.SRGBColorSpace;
  M.floor.map = woodTex;

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 26), M.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(2, 0, 6);
  floor.receiveShadow = true;
  scene.add(floor);

  const wallBack = new THREE.Mesh(new THREE.PlaneGeometry(30, 10), M.wall);
  wallBack.position.set(2, 5, -1.15);
  wallBack.receiveShadow = true;
  scene.add(wallBack);

  const wallLeft = new THREE.Mesh(new THREE.PlaneGeometry(26, 10), M.wallSide);
  wallLeft.rotation.y = Math.PI / 2;
  wallLeft.position.set(-3.7, 5, 6);
  wallLeft.receiveShadow = true;
  scene.add(wallLeft);

  const wallRight = new THREE.Mesh(new THREE.PlaneGeometry(26, 10), M.wallSide);
  wallRight.rotation.y = -Math.PI / 2;
  wallRight.position.set(4.7, 5, 6);
  wallRight.receiveShadow = true;
  scene.add(wallRight);

  // 踢脚线
  box(M.wallSide, [2, 0.09, -1.13], [30, 0.18, 0.04], { shadow: false });
  box(M.wall, [-3.68, 0.09, 6], [0.04, 0.18, 26], { shadow: false });
  box(M.wall, [4.68, 0.09, 6], [0.04, 0.18, 26], { shadow: false });

  // 左墙窗户:白框 + 百叶 + 亮面
  const wg = new THREE.Group();
  wg.position.set(-3.66, 2.5, 1.1);
  wg.rotation.y = Math.PI / 2;
  const frameW = 2.1, frameH = 2.5;
  const addToGroup = (mesh) => { mesh.castShadow = false; wg.add(mesh); return mesh; };
  const fMat = M.windowFrame;
  [[0, frameH / 2 - 0.045, frameW, 0.09], [0, -frameH / 2 + 0.045, frameW, 0.09]].forEach(([x, y, w, h]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.08), fMat); m.position.set(x, y, 0); addToGroup(m);
  });
  [[-frameW / 2 + 0.045], [frameW / 2 - 0.045]].forEach(([x]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.09, frameH, 0.08), fMat); m.position.set(x, 0, 0); addToGroup(m);
  });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(frameW - 0.16, frameH - 0.16), M.daylight);
  glow.position.z = -0.01;
  addToGroup(glow);
  for (let i = 0; i < 9; i++) {                                   // 百叶
    const blade = new THREE.Mesh(new THREE.BoxGeometry(frameW - 0.2, 0.055, 0.02), fMat);
    blade.position.set(0, frameH / 2 - 0.3 - i * 0.16, 0.03);
    addToGroup(blade);
  }
  scene.add(wg);

  // 地板阳光光斑(百叶条纹感,仅 Classic 显示)
  const spotCv = document.createElement("canvas");
  spotCv.width = 256; spotCv.height = 256;
  const sctx = spotCv.getContext("2d");
  sctx.clearRect(0, 0, 256, 256);
  for (let i = 0; i < 7; i++) {
    sctx.fillStyle = "rgba(255, 236, 190, 0.85)";
    sctx.fillRect(0, i * 38, 256, 22);
  }
  const spotTex = new THREE.CanvasTexture(spotCv);
  const sunSpot = new THREE.Mesh(
    new THREE.PlaneGeometry(2.9, 2.1),
    new THREE.MeshBasicMaterial({ map: spotTex, transparent: true, opacity: 0.5, depthWrite: false })
  );
  sunSpot.rotation.x = -Math.PI / 2;
  sunSpot.rotation.z = 0.5;
  sunSpot.position.set(-1.95, 0.032, 2.15);
  scene.add(sunSpot);
  sunSpotMesh = sunSpot;
}

/* ---------- 内置几何体开关 ----------
 * 用现成 .glb 模型替换某件家具时,把对应开关改为 false,
 * 并在文件末尾的 PROPS 里登记模型(见 README「使用 3D 模型素材」)。 */
const BUILTIN = {
  desk: false, chair: false, monitor: true, keyboard: false, mouse: false,
  note: true, books: true, cup: false, plant: false, console: false,
  bin: true, poster: true, apple: true, rug: false,
};

/* ---------- 桌子 ---------- */
const DESK_TOP = 1.09;
if (BUILTIN.desk) {
  box(M.desk, [0, DESK_TOP, 0.15], [4.15, 0.13, 1.6]);                      // 桌面
  [[-1.9, -0.5], [1.9, -0.5], [-1.9, 0.78], [1.9, 0.78]].forEach(([x, z]) =>
    box(M.deskDark, [x, DESK_TOP / 2 - 0.03, z], [0.14, DESK_TOP - 0.06, 0.14])
  );
  box(M.deskDark, [0, 0.94, -0.44], [3.75, 0.08, 0.07]);                    // 后横梁
}
const DESK_SURFACE = DESK_TOP + 0.065;

/* ---------- 显示器 + CSS3D 屏幕 ---------- */
let portalObj;
const SCREEN_ASPECT = SCREEN_W / SCREEN_H;
// 调整 portal 像素尺寸(不触发 iframe 重载,仅重排):房间远景用低逻辑分辨率,
// 进入屏幕后提升到视口尺寸保证文字 1:1 清晰
const setPortalPixels = (pxW) => {
  const pxH = Math.round(pxW / SCREEN_ASPECT);
  portalEl.style.width = `${pxW}px`;
  portalEl.style.height = `${pxH}px`;
  portalObj.scale.setScalar(SCREEN_W / pxW);
};
const dockPortalPixels = () => {
  const pxW = Math.round(Math.min(innerWidth, innerHeight * SCREEN_ASPECT));
  setPortalPixels(Math.max(800, pxW));
};
if (BUILTIN.monitor) {
  box(M.dark, [0, DESK_SURFACE + 0.02, 0.02], [0.62, 0.045, 0.32]);         // 底座
  box(M.dark, [0, DESK_SURFACE + 0.32, -0.04], [0.15, 0.62, 0.08]);         // 支柱
  box(M.screenBezel, [0, 1.87, 0.02], [1.82, 1.13, 0.09]);                  // 面板
}
{
  // punch-through:此面把 WebGL 像素清为透明,透出下层 CSS3D iframe
  const hole = new THREE.Mesh(
    new THREE.PlaneGeometry(SCREEN_W, SCREEN_H),
    new THREE.MeshBasicMaterial({ color: 0x000000, opacity: 0, blending: THREE.NoBlending, side: THREE.DoubleSide })
  );
  hole.position.copy(SCREEN_CENTER);
  scene.add(hole);

  // CSS3D portal 对齐到屏幕
  portalObj = new CSS3DObject(portalEl);
  portalObj.position.copy(SCREEN_CENTER);
  scene.add(portalObj);
  setPortalPixels(PORTAL_PX_W);
  // 供 CSS 在屏幕模式下按 contain 尺寸铺放 portal
  document.documentElement.style.setProperty("--screen-aspect", String(SCREEN_ASPECT));
  portalEl.setAttribute("aria-hidden", "false");
  portalEl.classList.add("is-mounted");
}

/* ---------- 键盘 / 鼠标 / 便签 ---------- */
if (BUILTIN.keyboard) {
  box(M.keyboard, [-0.1, DESK_SURFACE + 0.028, 0.58], [1.28, 0.056, 0.37]);
  const cols = 13, rows = 4;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      box(M.keycap,
        [-0.1 - 0.555 + 0.0925 * c + 0.02 * (r % 2), DESK_SURFACE + 0.062, 0.442 + 0.082 * r],
        [0.072, 0.022, 0.062], { shadow: false });
  box(M.keycap, [-0.1, DESK_SURFACE + 0.062, 0.442 + 0.082 * 4 - 0.02], [0.5, 0.022, 0.06], { shadow: false }); // 空格
}
if (BUILTIN.mouse) {
  const mouse = box(M.dark, [0.92, DESK_SURFACE + 0.035, 0.55], [0.155, 0.062, 0.24]);
  mouse.rotation.y = -0.22;
}
if (BUILTIN.note) {
  const note = box(M.note, [-1.18, DESK_SURFACE + 0.006, 0.62], [0.24, 0.008, 0.24], { shadow: false });
  note.rotation.y = 0.3;
}

/* ---------- 书堆 + 饮料杯 ---------- */
if (BUILTIN.books) {
  const stack = [
    [M.bookA, 0.74, 0.085, 0.5, 0.1],
    [M.bookB, 0.68, 0.075, 0.46, -0.16],
    [M.bookC, 0.6, 0.08, 0.42, 0.06],
  ];
  let y = DESK_SURFACE;
  stack.forEach(([m, w, h, d, ry]) => {
    box(m, [-1.5, y + h / 2, 0.5], [w, h, d], { ry });
    y += h;
  });
}
if (BUILTIN.cup) {
  cyl(M.cup, [-0.9, DESK_SURFACE + 0.115, 0.56], [0.088, 0.072, 0.23, 18]);
  const straw = cyl(M.straw, [-0.87, DESK_SURFACE + 0.3, 0.54], [0.012, 0.012, 0.24, 8], { shadow: false });
  straw.rotation.z = -0.35;
  const lemon = cyl(M.keycap, [-0.975, DESK_SURFACE + 0.21, 0.58], [0.05, 0.05, 0.014, 12], { shadow: false });
  lemon.rotation.x = Math.PI / 2;
  lemon.rotation.z = 0.4;
}

/* ---------- 盆栽 ---------- */
if (BUILTIN.plant) {
  cyl(M.pot, [1.38, DESK_SURFACE + 0.085, 0.02], [0.105, 0.082, 0.17, 16]);
  cyl(M.soil, [1.38, DESK_SURFACE + 0.172, 0.02], [0.095, 0.095, 0.012, 16], { shadow: false });
  cyl(M.stem, [1.38, DESK_SURFACE + 0.28, 0.02], [0.013, 0.016, 0.22, 8]);
  const leafGeo = new THREE.SphereGeometry(0.085, 10, 8);
  [[1.3, 0.44, 0.02, 0.9], [1.46, 0.47, 0.06, 1.1], [1.38, 0.52, -0.04, 0.8]].forEach(([x, y, z, s]) => {
    const leaf = new THREE.Mesh(leafGeo, M.leaf);
    leaf.position.set(x, DESK_SURFACE + y, z);
    leaf.scale.set(s, s * 0.62, s * 0.75);
    leaf.castShadow = true;
    scene.add(leaf);
  });
}

/* ---------- 游戏机(平放,双色手柄) ---------- */
if (BUILTIN.console) {
  const g = new THREE.Group();
  g.position.set(1.42, DESK_SURFACE, 0.28);
  g.rotation.y = -0.45;
  const dock = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.2, 0.07), M.nsBody);
  dock.position.y = 0.1;
  dock.castShadow = true;
  const left = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.17, 0.075), M.nsLeft);
  left.position.set(-0.205, 0.105, 0);
  left.castShadow = true;
  const right = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.17, 0.075), M.nsRight);
  right.position.set(0.205, 0.105, 0);
  right.castShadow = true;
  const screenFace = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.15), M.screenBezel);
  screenFace.position.set(0, 0.105, 0.037);
  g.add(dock, left, right, screenFace);
  scene.add(g);
}

/* ---------- 办公椅 ---------- */
if (BUILTIN.chair) {
  const g = new THREE.Group();
  g.position.set(0.1, 0, 1.78);
  const part = (material, [x, y, z], [w, h, d], rx = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    m.position.set(x, y, z);
    m.rotation.x = rx;
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
    return m;
  };
  part(M.chairSeat, [0, 0.6, 0], [0.68, 0.14, 0.66]);         // 座垫(绿)
  part(M.chair, [0, 1.02, 0.28], [0.68, 0.62, 0.13], -0.07);  // 靠背
  part(M.chairBase, [0, 1.4, 0.315], [0.1, 0.16, 0.05]);      // 头枕连接杆
  part(M.chair, [0, 1.52, 0.32], [0.42, 0.19, 0.12], -0.07);  // 头枕
  part(M.chairBase, [-0.33, 0.8, 0.02], [0.06, 0.07, 0.38]);  // 扶手横
  part(M.chairBase, [0.33, 0.8, 0.02], [0.06, 0.07, 0.38]);
  part(M.chair, [-0.33, 0.7, 0.16], [0.055, 0.18, 0.055]);    // 扶手立柱
  part(M.chair, [0.33, 0.7, 0.16], [0.055, 0.18, 0.055]);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.38, 12), M.chairBase);
  post.position.set(0, 0.35, 0);
  post.castShadow = true;
  g.add(post);
  for (let i = 0; i < 5; i++) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.07), M.chairBase);
    const a = (i / 5) * Math.PI * 2 + 0.31;
    arm.position.set(Math.cos(a) * 0.25, 0.14, Math.sin(a) * 0.25);
    arm.rotation.y = -a;
    arm.castShadow = true;
    g.add(arm);
    const wheel = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), M.dark);
    wheel.position.set(Math.cos(a) * 0.48, 0.06, Math.sin(a) * 0.48);
    wheel.castShadow = true;
    g.add(wheel);
  }
  scene.add(g);
}

/* ---------- 垃圾桶 ---------- */
if (BUILTIN.bin) {
  cyl(M.bin, [-1.42, 0.27, 1.18], [0.24, 0.185, 0.54, 22], { open: true });
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.185, 22), M.bin);
  bottom.rotation.x = -Math.PI / 2;
  bottom.position.set(-1.42, 0.012, 1.18);
  scene.add(bottom);
}

/* ---------- 墙饰:海报(data.js 的 room.posterImage 可替换图片) ---------- */
if (BUILTIN.poster) {
  // 内置手绘海报(默认,也是图片加载失败时的回退)
  const cv = document.createElement("canvas");
  cv.width = 512; cv.height = 680;
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#f5ecd8";
  ctx.fillRect(0, 0, 512, 680);
  ctx.strokeStyle = "#3aa8a0";
  ctx.lineWidth = 58;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(200, 300, 150, Math.PI * 0.7, Math.PI * 1.75);
  ctx.stroke();
  ctx.fillStyle = "#d4608c";
  ctx.beginPath();
  ctx.arc(350, 420, 74, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e8b84a";
  ctx.beginPath();
  ctx.moveTo(120, 560); ctx.lineTo(230, 470); ctx.lineTo(255, 590);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#1c1813";
  ctx.font = "700 54px 'Space Grotesk', sans-serif";
  ctx.fillText("KEEP", 60, 110);
  ctx.fillText("MAKING", 60, 168);
  ctx.font = "500 20px 'JetBrains Mono', monospace";
  ctx.fillStyle = "#a47a3d";
  ctx.fillText("- room / works -", 60, 630);
  const fallbackTex = new THREE.CanvasTexture(cv);
  fallbackTex.colorSpace = THREE.SRGBColorSpace;

  const POSTER_H = 1.22;
  const posterMat = new THREE.MeshToonMaterial({ map: fallbackTex, gradientMap });
  const poster = new THREE.Mesh(new THREE.PlaneGeometry(0.92, POSTER_H), posterMat);
  poster.position.set(-1.95, 2.35, -1.12);
  poster.rotation.z = 0.015;
  scene.add(poster);

  // 配置了自定义图片:加载成功后替换,并按图片宽高比调整海报比例(高度不变)
  const customUrl = window.SITE_DATA?.room?.posterImage;
  if (customUrl) {
    new THREE.TextureLoader().load(
      customUrl,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        posterMat.map = tex;
        posterMat.needsUpdate = true;
        const aspect = tex.image.width / tex.image.height;
        poster.scale.x = Math.min(1.5, aspect / (0.92 / POSTER_H));   // 过宽的图最多放大 1.5 倍
      },
      undefined,
      () => console.warn(`海报图片加载失败,已回退内置海报: ${customUrl}`)
    );
  }
}

/* ---------- 墙饰:体素苹果 ---------- */
if (BUILTIN.apple) {
  // 0 空 1 红 2 深红 3 高光 4 叶 5 枝
  const pattern = [
    [0, 0, 0, 5, 0, 4, 0],
    [0, 0, 0, 5, 4, 4, 0],
    [0, 1, 1, 1, 1, 1, 0],
    [1, 3, 1, 1, 1, 1, 1],
    [1, 3, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1],
    [0, 1, 1, 0, 1, 1, 0],
  ];
  const colors = { 1: 0xc0392b, 2: 0x8f2a20, 3: 0xe8867a, 4: 0x5f9a4e, 5: 0x6d4a2f };
  const size = 0.085;
  const g = new THREE.Group();
  pattern.forEach((row, ry) =>
    row.forEach((v, cx) => {
      if (!v) return;
      const cube = new THREE.Mesh(
        new THREE.BoxGeometry(size, size, size),
        new THREE.MeshToonMaterial({ color: colors[v], gradientMap })
      );
      cube.position.set((cx - 3) * size, (3 - ry) * size, 0);
      cube.castShadow = true;
      g.add(cube);
    })
  );
  g.position.set(-0.95, 2.72, -1.06);
  scene.add(g);
}

/* ---------- 书架(左侧,靠后墙) ---------- */
if (true) {
  const SX = -2.95, SZ = -0.72;              // 书架中心
  const W = 1.0, D = 0.42, H = 3.3;
  box(M.shelf, [SX - W / 2 + 0.03, H / 2, SZ], [0.06, H, D]);        // 侧板
  box(M.shelf, [SX + W / 2 - 0.03, H / 2, SZ], [0.06, H, D]);
  box(M.shelf, [SX, H - 0.03, SZ], [W, 0.06, D]);                     // 顶板
  box(M.shelf, [SX, 0.05, SZ], [W, 0.1, D]);                          // 底座
  box(M.wallSide, [SX, H / 2, SZ - D / 2 + 0.01], [W - 0.1, H - 0.1, 0.03], { shadow: false }); // 背板
  const levels = [0.72, 1.38, 2.04, 2.7];
  levels.forEach((y) => box(M.shelf, [SX, y, SZ], [W - 0.1, 0.05, D]));

  // 每层杂物:书组 / 储物盒 / 小相框
  const bookRow = (y, x0, mats) => mats.forEach((m, i) =>
    box(m, [SX + x0 + i * 0.085, y + 0.19, SZ + 0.02], [0.07, 0.33, 0.24], { ry: i % 2 ? 0.06 : -0.03 }));
  bookRow(2.7, -0.28, [M.bookB, M.bookA, M.keycap, M.bookC]);
  bookRow(1.38, -0.3, [M.bookC, M.keycap, M.bookB]);
  box(M.note, [SX + 0.22, 2.7 + 0.14, SZ + 0.02], [0.3, 0.24, 0.26]);          // 白盒
  box(M.bookC, [SX + 0.2, 1.38 + 0.11, SZ + 0.04], [0.26, 0.18, 0.22]);        // 黄盒
  box(M.note, [SX - 0.2, 0.72 + 0.16, SZ + 0.02], [0.34, 0.3, 0.26]);          // 大白盒
  box(M.keycap, [SX + 0.22, 0.72 + 0.1, SZ + 0.04], [0.24, 0.18, 0.2]);
  // 第 3 层:小台灯感圆物 + 相框
  cyl(M.keycap, [SX - 0.22, 2.04 + 0.16, SZ + 0.02], [0.09, 0.11, 0.24, 12]);
  box(M.dark, [SX + 0.2, 2.04 + 0.16, SZ + 0.03], [0.2, 0.26, 0.03], { ry: -0.15 });
  // 顶上:相框 + 垂吊绿植
  box(M.dark, [SX - 0.25, H + 0.17, SZ + 0.02], [0.26, 0.3, 0.03], { ry: 0.12 });
  cyl(M.pot, [SX + 0.28, H + 0.1, SZ], [0.09, 0.075, 0.14, 12]);
  const vine = (x, y, z, n) => {
    for (let i = 0; i < n; i++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.045 - i * 0.004, 8, 6), M.leaf);
      s.position.set(x + Math.sin(i * 1.3) * 0.05, y - i * 0.09, z + 0.06);
      s.castShadow = true;
      scene.add(s);
    }
  };
  vine(SX + 0.28, H + 0.16, SZ, 7);                                   // 顶部垂藤
  vine(SX - 0.3, 2.04 - 0.05, SZ + 0.05, 4);                          // 三层垂藤
}

/* ---------- 洞洞板(显示器右上方) ---------- */
if (true) {
  const PX = 2.15, PY = 2.6, PZ = -1.1;
  const cv = document.createElement("canvas");
  cv.width = 256; cv.height = 208;
  const c = cv.getContext("2d");
  c.fillStyle = "#f8f5ec";
  c.fillRect(0, 0, 256, 208);
  c.fillStyle = "rgba(60, 52, 40, 0.5)";
  for (let ry = 16; ry < 208; ry += 24)
    for (let rx = 16; rx < 256; rx += 24) { c.beginPath(); c.arc(rx, ry, 4, 0, 7); c.fill(); }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  M.pegboard.map = tex;
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.22, 0.05), M.pegboard);
  board.position.set(PX, PY, PZ);
  board.castShadow = true;
  scene.add(board);
  // 小搁板 + 橙色小物
  box(M.shelf, [PX - 0.25, PY + 0.22, PZ + 0.08], [0.5, 0.04, 0.16]);
  box(M.nsRight, [PX - 0.3, PY + 0.32, PZ + 0.08], [0.18, 0.14, 0.1], { ry: 0.1 });
  // 挂着的耳机:头梁 + 两耳罩
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.025, 8, 16, Math.PI), M.dark);
  band.position.set(PX + 0.28, PY - 0.18, PZ + 0.08);
  scene.add(band);
  [[PX + 0.13, PY - 0.26], [PX + 0.43, PY - 0.26]].forEach(([x, y]) => {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.05, 14), M.dark);
    cup.rotation.z = Math.PI / 2;
    cup.position.set(x, y, PZ + 0.08);
    cup.castShadow = true;
    scene.add(cup);
  });
  vineAt(PX + 0.62, PY - 0.52, PZ + 0.05, 6);
}
// 垂藤辅助(供洞洞板使用,书架内定义的是局部函数)
function vineAt(x, y, z, n) {
  for (let i = 0; i < n; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.042 - i * 0.003, 8, 6), M.leaf);
    s.position.set(x + Math.sin(i * 1.4) * 0.045, y - i * 0.085, z + 0.05);
    s.castShadow = true;
    scene.add(s);
  }
}

/* ---------- 五斗柜 + 台灯(右墙) ---------- */
if (true) {
  const CX = 4.05, CZ = 0.65;
  const g = new THREE.Group();
  g.position.set(CX, 0, CZ);
  g.rotation.y = -Math.PI / 2;               // 面朝 -x(房间内)
  const cbox = (m, [x, y, z], [w, h, d]) => {
    const mm = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mm.position.set(x, y, z);
    mm.castShadow = true; mm.receiveShadow = true;
    g.add(mm);
    return mm;
  };
  cbox(M.drawer, [0, 0.62, 0], [1.6, 1.14, 0.6]);                       // 柜体
  cbox(M.drawer, [0, 1.215, 0], [1.68, 0.05, 0.66]);                    // 台面
  [0.32, 0.61, 0.9].forEach((y) => {
    cbox(M.drawerDark, [0, y, 0.305], [1.44, 0.015, 0.02]);             // 抽屉缝
  });
  [0.46, 0.755, 1.05].forEach((y) => {
    cbox(M.lampBase, [0, y, 0.32], [0.34, 0.035, 0.03]);                // 木把手
  });
  [[-0.72, 0.05], [0.72, 0.05]].forEach(([x, y]) => cbox(M.drawerDark, [x, y, 0], [0.12, 0.1, 0.56]));
  scene.add(g);

  // 台灯(锥形木底 + 发光灯罩)
  cyl(M.lampBase, [CX - 0.02, 1.34, CZ + 0.42], [0.035, 0.1, 0.22, 10]);
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.17, 0.24, 14, 1, true), M.lampShade);
  shade.position.set(CX - 0.02, 1.56, CZ + 0.42);
  scene.add(shade);
  // bauhaus 风相框
  const fcv = document.createElement("canvas");
  fcv.width = 128; fcv.height = 160;
  const fc = fcv.getContext("2d");
  fc.fillStyle = "#f3eee2"; fc.fillRect(0, 0, 128, 160);
  fc.fillStyle = "#1c1813";
  fc.font = "700 16px 'Space Grotesk', sans-serif";
  fc.fillText("bauhaus", 22, 28);
  fc.beginPath(); fc.arc(64, 92, 34, 0, 7); fc.stroke();
  fc.lineWidth = 3;
  for (let i = 0; i < 5; i++) { fc.beginPath(); fc.arc(64, 92, 30 - i * 6, Math.PI * 0.2 * i, Math.PI * (1.1 + 0.15 * i)); fc.stroke(); }
  const ftex = new THREE.CanvasTexture(fcv);
  ftex.colorSpace = THREE.SRGBColorSpace;
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.44, 0.03), new THREE.MeshToonMaterial({ map: ftex, gradientMap }));
  frame.position.set(CX + 0.1, 1.47, CZ - 0.35);
  frame.rotation.y = -Math.PI / 2 + 0.15;
  frame.castShadow = true;
  scene.add(frame);
}

/* ---------- 唱片机 + 背景音乐(五斗柜台面,点击播放/暂停) ----------
 * THREE.PositionalAudio 空间音频:声音从唱片机位置发出,随相机远近自然衰减。
 * 音源与曲名在 data.js 的 room.music 配置;播放时唱片旋转、飘出音符。 */
const music = { group: null, disc: null, notes: [], sound: null, ready: false, vol: 0.85 };
{
  const g = new THREE.Group();
  g.position.set(4.05, 1.24, 0.55);            // 五斗柜台面中段
  g.rotation.y = -Math.PI / 2 + 0.1;           // 与柜子同朝向,微转更生动
  const part = (geo, m, [x, y, z]) => {
    const mm = new THREE.Mesh(geo, m);
    mm.position.set(x, y, z);
    mm.castShadow = true;
    g.add(mm);
    return mm;
  };
  part(new THREE.BoxGeometry(0.44, 0.07, 0.34), M.lampBase, [0, 0.035, 0]);                    // 木质机身
  const disc = part(new THREE.CylinderGeometry(0.135, 0.135, 0.012, 24), M.dark, [-0.05, 0.078, 0]); // 黑胶
  const label = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.013, 16), M.nsRight);  // 唱片标签
  label.position.y = 0.002;
  disc.add(label);
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.03, 8), M.keycap);     // 中轴
  pin.position.y = 0.012;
  disc.add(pin);
  part(new THREE.CylinderGeometry(0.024, 0.028, 0.05, 10), M.chairBase, [0.16, 0.095, -0.1]);  // 唱臂基座
  const arm = part(new THREE.BoxGeometry(0.014, 0.012, 0.19), M.chairBase, [0.075, 0.118, -0.06]);
  arm.rotation.y = -1.12;                       // 唱臂从基座斜伸到唱片上方
  part(new THREE.BoxGeometry(0.03, 0.02, 0.05), M.chairBase, [-0.01, 0.112, -0.02]);           // 唱头
  part(new THREE.CylinderGeometry(0.02, 0.022, 0.025, 10), M.keycap, [0.17, 0.082, 0.11]);     // 旋钮
  // 点击热区:罩住整机的隐形盒(Raycaster 不检查 visible,可命中但不渲染)
  const hit = part(new THREE.BoxGeometry(0.6, 0.42, 0.5), new THREE.MeshBasicMaterial(), [0, 0.16, 0]);
  hit.visible = false;
  hit.castShadow = false;

  // 音符贴图(播放时从唱片上方飘出,颜色随主题)
  const ncv = document.createElement("canvas");
  ncv.width = ncv.height = 128;
  const nc = ncv.getContext("2d");
  nc.font = "700 92px 'Space Grotesk', serif";
  nc.textAlign = "center";
  nc.textBaseline = "middle";
  nc.fillStyle = "#fff";
  nc.fillText("♪", 64, 66);
  const noteTex = new THREE.CanvasTexture(ncv);
  for (let i = 0; i < 3; i++) {
    const sm = new THREE.SpriteMaterial({
      map: noteTex, color: THEMES[themeName].nsRight,
      transparent: true, opacity: 0, depthWrite: false,
    });
    themedMats.push({ m: sm, key: "nsRight" });
    const sp = new THREE.Sprite(sm);
    sp.scale.setScalar(0.14);
    sp.userData.t = i / 3;
    sp.position.set(-0.05, 0.2, 0);
    g.add(sp);
    music.notes.push(sp);
  }
  scene.add(g);
  music.group = g;
  music.disc = disc;

  // 空间音频挂到唱片机上
  const listener = new THREE.AudioListener();
  camera.add(listener);
  const sound = new THREE.PositionalAudio(listener);
  sound.setRefDistance(2.6);
  sound.setRolloffFactor(0.9);
  sound.setVolume(music.vol);
  g.add(sound);
  music.sound = sound;
  const src = window.SITE_DATA?.room?.music?.src || "assets/media/bgm.mp3";
  new THREE.AudioLoader().load(
    src,
    (buffer) => { sound.setBuffer(buffer); sound.setLoop(true); music.ready = true; },
    undefined,
    () => console.warn(`背景音乐加载失败: ${src}`)
  );
}

const musicRay = new THREE.Raycaster();
const musicPointer = new THREE.Vector2();
const pickMusic = (x, y) => {
  musicPointer.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
  musicRay.setFromCamera(musicPointer, camera);
  return musicRay.intersectObject(music.group, true).length > 0;
};
const toggleMusic = () => {
  if (!music.ready) { flashStatus("背景音乐还没就绪(加载中或文件缺失)"); return; }
  const ctx = music.sound.context;
  if (ctx.state === "suspended") ctx.resume();   // 浏览器自动播放策略:须由用户手势解锁
  if (music.sound.isPlaying) {
    music.sound.pause();
    flashStatus("♪ 音乐已暂停");
  } else {
    music.sound.play();
    const title = window.SITE_DATA?.room?.music?.title;
    flashStatus(title ? `♪ 正在播放:${title}` : "♪ 正在播放 — 再点唱片机暂停", 3600);
  }
};
addEventListener("pointerdown", (e) => {
  if (mode === "room" && pickMusic(e.clientX, e.clientY)) toggleMusic();
});

/* ---------- 沙发 + 茶几 + 地毯(前景) ---------- */
if (true) {
  // 军绿布艺沙发(朝 +x 微转)
  const g = new THREE.Group();
  g.position.set(-3.1, 0, 3.35);
  g.rotation.y = 0.45;
  const sbox = (m, [x, y, z], [w, h, d]) => {
    const mm = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mm.position.set(x, y, z);
    mm.castShadow = true; mm.receiveShadow = true;
    g.add(mm);
    return mm;
  };
  sbox(M.sofa, [0, 0.28, 0], [1.9, 0.32, 0.95]);                        // 底座
  sbox(M.sofa, [0, 0.52, -0.36], [1.9, 0.62, 0.28]);                    // 靠背
  sbox(M.sofa, [-0.86, 0.56, 0.05], [0.22, 0.44, 0.85]);                // 扶手
  sbox(M.sofa, [0.86, 0.56, 0.05], [0.22, 0.44, 0.85]);
  sbox(M.chairSeat, [-0.4, 0.5, 0.08], [0.78, 0.14, 0.75]);             // 坐垫
  sbox(M.chairSeat, [0.42, 0.5, 0.08], [0.78, 0.14, 0.75]);
  scene.add(g);

  // 圆角木茶几 + 书 + 马克杯
  cyl(M.shelf, [-1.35, 0.42, 2.9], [0.52, 0.58, 0.07, 22]);
  [[-1.62, 0.2, 2.72], [-1.05, 0.2, 3.1], [-1.35, 0.2, 2.62]].forEach(([x, y, z]) =>
    cyl(M.shelf, [x, y, z], [0.05, 0.06, 0.4, 10]));
  box(M.note, [-1.5, 0.485, 2.82], [0.42, 0.05, 0.3], { ry: 0.25 });    // 白色画册
  box(M.nsRight, [-1.5, 0.52, 2.82], [0.36, 0.02, 0.24], { ry: 0.25 });
  cyl(M.keycap, [-1.12, 0.51, 2.98], [0.055, 0.05, 0.11, 12]);          // 马克杯
  // 地毯(白底黑点)
  if (BUILTIN.rug) {
    const rcv = document.createElement("canvas");
    rcv.width = 256; rcv.height = 200;
    const rc = rcv.getContext("2d");
    rc.fillStyle = "#efe8d8"; rc.fillRect(0, 0, 256, 200);
    rc.fillStyle = "rgba(30, 26, 20, 0.75)";
    for (let y = 0; y < 5; y++)
      for (let x = 0; x < 7; x++)
        rc.fillRect(20 + x * 34 + (y % 2) * 10, 18 + y * 38, 7, 7);
    const rtex = new THREE.CanvasTexture(rcv);
    rtex.colorSpace = THREE.SRGBColorSpace;
    M.rug.map = rtex;
    const rug = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.025, 3.1), M.rug);
    rug.position.set(0.35, 0.013, 2.1);
    rug.receiveShadow = true;
    scene.add(rug);
  }
}

/* ---------- 可选:加载现成 .glb 模型素材 ----------
 * 1. 把模型放到 assets/models/(推荐 CC0 素材:Poly Pizza、Kenney、Quaternius)
 * 2. 在下方 PROPS 登记:url、position(落点)、targetSize(最长边,世界单位,桌高≈1.09)
 * 3. 把 BUILTIN 里对应的内置几何体关掉
 * 示例:
 *   { url: "assets/models/keyboard.glb", position: [-0.1, DESK_SURFACE, 0.58],
 *     targetSize: 1.3, rotationY: 0, alignBottom: true },
 */
const PROPS = [
  {
    url: "assets/models/desk.glb",          // Adjustable Desk by jeff cobesign (CC-BY, Poly Pizza)
    position: [0, 0, 0.57],
    targetHeight: 1.09,                     // 桌面顶 ≈ 原积木桌高
    targetFootprint: [4.0, 1.5],            // 桌板 宽4.0 × 深1.5
    rotationY: -Math.PI / 2,                // 平直长边贴墙,L 翼右前朝椅子(椅子坐进缺口)
    tint: { "Plane": 0xa8764a },            // 只染桌板为暖木色,腿保持黑色
  },
  {
    url: "assets/models/Chair.glb",
    position: [0.1, 0, 1.78],
    targetHeight: 1.55,
    rotationY: Math.PI,                     // 面向桌子(背对相机)
    tint: 0x46543f,                         // 整体染墨绿(单一网格,只能整体染)
  },
  {
    url: "assets/models/Keyboard.glb",
    position: [-0.1, DESK_SURFACE, 0.58],
    targetSize: 1.3,
  },
  {
    url: "assets/models/Cup.glb",
    position: [-0.9, DESK_SURFACE, 0.56],
    targetSize: 0.26,
  },
  {
    url: "assets/models/Plant.glb",
    position: [1.28, DESK_SURFACE, 0.08],
    targetHeight: 0.55,
  },
  {
    url: "assets/models/Switch.glb",
    position: [1.66, DESK_SURFACE, 0.34],
    targetSize: 0.5,
    rotationY: 2.7,                         // 屏幕面转向相机
  },
  {
    url: "assets/models/mouse.glb",
    position: [0.92, DESK_SURFACE, 0.55],
    targetSize: 0.24,
    rotationY: Math.PI - 0.25,              // 按键端朝向使用者
  },
  {
    url: "assets/models/Oriental.glb",
    position: [0.35, 0.005, 2.1],           // 与原内置地毯同位,微抬避免与地板 z-fighting
    targetFootprint: [4.4, 3.1],
    targetHeight: 0.03,
    rotationY: Math.PI / 2,                 // 模型长边沿 z,转 90° 让长边贴墙(沿 x)
    castShadow: false,                      // 地毯只接收阴影,避免薄片自阴影
  },
];

/* 模型染色:tint 为数字则整体染色;为对象则按 mesh 名(正则)分部件染色,
 * 例如 { "Plane": 0x9c6b45 } 只把名字含 Plane 的部件染成木色 */
const applyTint = (root, tint) => {
  if (tint == null) return;
  root.traverse((c) => {
    if (!c.isMesh) return;
    const recolor = (color) => {
      c.material = c.material.clone();
      c.material.color.set(color);
    };
    if (typeof tint === "number") { recolor(tint); return; }
    for (const [pattern, color] of Object.entries(tint)) {
      if (new RegExp(pattern, "i").test(c.name)) { recolor(color); break; }
    }
  });
};

const gltfLoader = new GLTFLoader();
PROPS.forEach((p) => {
  gltfLoader.load(
    p.url,
    (gltf) => {
      const obj = gltf.scene;
      // 内层只旋转,外层 wrapper 负责缩放/定位 —— 保证 targetFootprint 沿世界轴生效
      const wrapper = new THREE.Group();
      wrapper.name = "prop:" + p.url;
      if (p.rotationY) obj.rotation.y = p.rotationY;
      wrapper.add(obj);
      wrapper.updateMatrixWorld(true);
      const box3 = new THREE.Box3().setFromObject(wrapper);
      const size = box3.getSize(new THREE.Vector3());
      let sx, sy, sz;
      if (p.targetHeight || p.targetFootprint) {
        sy = (p.targetHeight || size.y) / size.y;
        sx = p.targetFootprint ? p.targetFootprint[0] / size.x : sy;
        sz = p.targetFootprint ? p.targetFootprint[1] / size.z : sy;
      } else {
        sx = sy = sz = (p.targetSize || 1) / Math.max(size.x, size.y, size.z);
      }
      wrapper.scale.set(p.mirrorX ? -sx : sx, sy, sz);   // 负缩放镜像,three 自动修正面朝向
      wrapper.updateMatrixWorld(true);
      box3.setFromObject(wrapper);
      const center = box3.getCenter(new THREE.Vector3());
      wrapper.position.set(
        p.position[0] - center.x,
        p.position[1] - (p.alignBottom !== false ? box3.min.y : center.y),
        p.position[2] - center.z
      );
      wrapper.traverse((c) => {
        if (c.isMesh) { c.castShadow = p.castShadow !== false; c.receiveShadow = true; }
      });
      applyTint(wrapper, p.tint);
      scene.add(wrapper);
    },
    undefined,
    (err) => console.warn(`模型加载失败: ${p.url}`, err)
  );
});

/* ---------- 主题切换 ---------- */
const applyTheme = (name) => {
  themeName = name;
  const t = THEMES[name];
  themedMats.forEach(({ m, key }) => m.color.set(t[key]));
  hemi.intensity = t.hemi;
  dirLight.intensity = t.dir;
  lampLight.intensity = t.lamp;
  if (sunSpotMesh) sunSpotMesh.visible = t.sunSpot;
  document.body.classList.toggle("theme-dark", name === "dark");
  styleBtn.textContent = `Style: ${t.label}`;
};
styleBtn.addEventListener("click", () =>
  applyTheme(themeName === "classic" ? "dark" : "classic")
);

/* ---------- 相机:滚轮/按钮统一的推进模型 ----------
 * zoom ∈ [0,1]:0 = 房间全景,1 = 贴到屏幕前(自动进入屏幕模式)。
 * 滚轮向前滚 → 推近;向后滚 → 拉远;点击「进入屏幕」= 目标直接设为 1。 */
const target = CAM_HOME_TARGET.clone();
const mouse = { x: 0, y: 0 };
const smooth = { x: 0, y: 0 };
const homeP = new THREE.Vector3();
const dockP = new THREE.Vector3();
let mode = "room";              // room | screen
let zoomTarget = 0;
let zoomCur = 0;
let portalHiRes = false;

addEventListener("pointermove", (e) => {
  mouse.x = (e.clientX / innerWidth) * 2 - 1;
  mouse.y = (e.clientY / innerHeight) * 2 - 1;
  // 悬停唱片机时给出可点击提示
  document.body.style.cursor =
    mode === "room" && pickMusic(e.clientX, e.clientY) ? "pointer" : "";
});

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// 相机到屏幕的对焦距离:contain 模式 —— 屏幕完整入画,黑色边框自然形成画框
const screenDockDistance = () => {
  const halfFov = THREE.MathUtils.degToRad(camera.fov / 2);
  const dV = SCREEN_H / 2 / Math.tan(halfFov);
  const dH = SCREEN_W / 2 / (Math.tan(halfFov) * camera.aspect);
  return Math.max(dV, dH) * 1.012;
};

// 推近过半时提升 iframe 分辨率保证清晰,拉远后降回,避免反复重排
const setHiRes = (on) => {
  if (on === portalHiRes) return;
  portalHiRes = on;
  if (on) dockPortalPixels(); else setPortalPixels(PORTAL_PX_W);
};

const finishEnter = () => {
  mode = "screen";
  document.body.classList.add("screen-mode");
  backBtn.hidden = false;
};

const enterScreen = () => {
  if (mode !== "room") return;
  zoomTarget = 1;
};

const leaveScreen = () => {
  if (mode !== "screen") return;
  mode = "room";
  document.body.classList.remove("screen-mode");
  backBtn.hidden = true;
  zoomTarget = 0;
};

// 滚轮推进:向下滚拉近(与网页"向下滚进入内容"直觉一致),滚满自动进入屏幕;向上滚拉远
addEventListener("wheel", (e) => {
  if (mode !== "room") return;
  const dy = e.deltaMode === 1 ? e.deltaY * 33
    : e.deltaMode === 2 ? e.deltaY * innerHeight
    : e.deltaY;
  zoomTarget = THREE.MathUtils.clamp(zoomTarget + dy * 0.0008, 0, 1);
}, { passive: true });

// 屏幕模式:代理 iframe 滚动(3D transform 中的 iframe 滚轮默认滚动在 Chrome 失效),
// 并支持对称退出手势 —— 已在顶部时继续向上滚,累计一定量后退回房间
let exitAccum = 0;
const onFrameWheel = (e) => {
  if (mode !== "screen") return;
  const win = iframeEl.contentWindow;
  if (!win) return;
  const dy = e.deltaMode === 1 ? e.deltaY * 33
    : e.deltaMode === 2 ? e.deltaY * win.innerHeight
    : e.deltaY;
  const wasAtTop = win.scrollY <= 0;
  e.preventDefault();
  win.scrollBy({ top: dy, behavior: "instant" });
  if (wasAtTop && dy < 0) {
    exitAccum += -dy;
    if (exitAccum > 320) { exitAccum = 0; leaveScreen(); }
  } else {
    exitAccum = 0;
  }
};
// module 加载晚于 iframe load 时也要能绑上;重复绑定同一函数引用会被浏览器去重
const bindExitGesture = () => {
  try {
    iframeEl.contentWindow?.addEventListener("wheel", onFrameWheel, { passive: false });
  } catch { /* 跨域时静默跳过 */ }
};
iframeEl.addEventListener("load", bindExitGesture);
bindExitGesture();

enterBtn.addEventListener("click", enterScreen);
backBtn.addEventListener("click", leaveScreen);
addEventListener("keydown", (e) => {
  if (e.key === "Escape" && mode === "screen") leaveScreen();
});

/* ---------- resize ---------- */
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  cssRenderer.setSize(innerWidth, innerHeight);
  if (portalHiRes) dockPortalPixels();
});

/* ---------- 加载完成 ---------- */
let firstFrame = false;
const percentEl = document.querySelector("[data-loader-percent]");
const barFillEl = document.querySelector("[data-loader-bar]");
let realProgress = 0;     // Three.js 资源真实进度(0~1)
let shownProgress = 0;    // 展示进度,缓动逼近真实值
let assetsReady = false;
let revealed = false;

// GLTFLoader / TextureLoader 默认走 DefaultLoadingManager,total 会随排队增长,取 max 保证单调
THREE.DefaultLoadingManager.onProgress = (_url, loaded, total) => {
  if (total > 0) realProgress = Math.max(realProgress, loaded / total);
};

const reveal = () => {
  if (revealed) return;
  revealed = true;
  loaderEl.classList.add("is-hidden");
  enterBtn.disabled = false;
  flashStatus("向下滚动进入屏幕,滚到顶再向上滚可退出;点击柜子上的唱片机可以听歌", 8000);
};

// 首帧渲染 + iframe 就绪前最多显示到 96%,避免"假 100%"后还在等待
const progressTick = () => {
  const target = assetsReady ? 100 : Math.min(realProgress * 100, 96);
  shownProgress += (target - shownProgress) * 0.075;
  if (assetsReady && shownProgress > 99.2) shownProgress = 100;
  percentEl.textContent = Math.round(shownProgress) + "%";
  barFillEl.style.width = shownProgress + "%";
  if (shownProgress >= 100) { reveal(); return; }
  requestAnimationFrame(progressTick);
};
progressTick();

const iframeReady = new Promise((resolve) => {
  iframeEl.addEventListener("load", resolve, { once: true });
  setTimeout(resolve, 3500);
});
iframeReady.then(() => {
  const wait = () => (firstFrame ? (assetsReady = true) : requestAnimationFrame(wait));
  wait();
});

/* ---------- 渲染循环 ---------- */
const tick = () => {
  requestAnimationFrame(tick);

  zoomCur += (zoomTarget - zoomCur) * 0.065;
  if (Math.abs(zoomTarget - zoomCur) < 0.0004) zoomCur = zoomTarget;
  if (mode === "room" && zoomTarget === 1 && zoomCur > 0.988) {
    zoomCur = 1;
    finishEnter();
  }
  setHiRes(mode === "screen" || zoomTarget > 0.45);

  // 鼠标视差,随推近逐渐衰减
  smooth.x += (mouse.x - smooth.x) * 0.05;
  smooth.y += (mouse.y - smooth.y) * 0.05;
  const sway = Math.max(0, 1 - zoomCur * 1.35);
  homeP.set(
    CAM_HOME_POS.x + smooth.x * 0.28 * sway,
    CAM_HOME_POS.y - smooth.y * 0.16 * sway,
    CAM_HOME_POS.z
  );
  dockP.set(SCREEN_CENTER.x, SCREEN_CENTER.y, SCREEN_CENTER.z + screenDockDistance());

  const k = easeInOut(zoomCur);
  camera.position.lerpVectors(homeP, dockP, k);
  target.lerpVectors(CAM_HOME_TARGET, SCREEN_CENTER, k);
  camera.lookAt(target);

  // 唱片机:播放时唱片旋转、音符上飘;屏幕模式下音量渐弱不抢注意力
  if (music.sound) {
    music.vol += ((mode === "screen" ? 0.3 : 0.85) - music.vol) * 0.05;
    music.sound.setVolume(music.vol);
  }
  if (music.sound?.isPlaying) {
    music.disc.rotation.y -= 0.045;
    music.notes.forEach((sp, i) => {
      const t = (sp.userData.t = (sp.userData.t + 0.0045) % 1);
      sp.position.set(-0.05 + Math.sin(t * 6 + i * 2.1) * 0.08, 0.15 + t * 0.55, 0);
      sp.material.opacity = Math.sin(Math.PI * t) * 0.9;
    });
  } else if (music.notes[0]?.material.opacity > 0) {
    music.notes.forEach((sp) => (sp.material.opacity = 0));
  }

  renderer.render(scene, camera);
  cssRenderer.render(scene, camera);
  firstFrame = true;
};
requestAnimationFrame(tick);
