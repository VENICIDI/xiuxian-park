#!/usr/bin/env node
/**
 * 用无头 Chrome + three.js 把 .glb 以「等距角度、透明背景」离线渲染成 PNG。
 * 不依赖 GUI，可复现：改变方位角/俯仰角即可重出图。
 *
 * 用法：
 *   node scripts/render-glb.cjs <model.glb> <out.png> [az=45] [el=30] [size=2048]
 * 例：
 *   node scripts/render-glb.cjs src/assets/model.glb src/assets/model-shot.png 45 30 2048
 *
 * az  方位角（度）：绕竖直轴，45 = 看正面一角
 * el  俯仰角（度）：30 ≈ 游戏 2:1 伪等距的俯视角
 * size 画布边长（正方形，越大越清晰）
 *
 * 输出为透明底 PNG；随后可用 scripts/remove-bg.cjs 裁剪到内容边界。
 */
const fs = require("fs");
const path = require("path");
const http = require("http");
const puppeteer = require("puppeteer");

const ROOT = process.cwd();
const MIME = {
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".html": "text/html",
  ".wasm": "application/wasm",
  ".glb": "model/gltf-binary",
  ".bin": "application/octet-stream",
  ".json": "application/json",
  ".png": "image/png",
};

function pageHtml() {
  return `<!doctype html><html><head><meta charset="utf-8">
<style>html,body{margin:0;background:transparent}canvas{display:block}</style>
<script type="importmap">
{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}
</script></head><body>
<script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const log = (...a) => console.log('[page]', ...a);
try {
  const p = new URLSearchParams(location.search);
  const SIZE = +(p.get('size') || 2048);
  const AZ = THREE.MathUtils.degToRad(+(p.get('az') || 45));
  const EL = THREE.MathUtils.degToRad(+(p.get('el') || 30));
  const MODEL = p.get('model');

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(SIZE, SIZE);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(4, 6, 3);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xcfe4ff, 0.9);
  fill.position.set(-4, 2, -2);
  scene.add(fill);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x3a3a4a, 0.7));

  const loader = new GLTFLoader();
  const draco = new DRACOLoader();
  draco.setDecoderPath('/node_modules/three/examples/jsm/libs/draco/');
  loader.setDRACOLoader(draco);
  loader.setMeshoptDecoder(MeshoptDecoder);

  loader.load(MODEL, (gltf) => {
    try {
      const obj = gltf.scene;
      let box = new THREE.Box3().setFromObject(obj);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      obj.position.sub(center);
      scene.add(obj);

      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const dirV = new THREE.Vector3(
        Math.cos(EL) * Math.sin(AZ),
        Math.sin(EL),
        Math.cos(EL) * Math.cos(AZ),
      ).normalize();
      const dist = maxDim * 4;
      const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, dist * 6);
      cam.position.copy(dirV.multiplyScalar(dist));
      cam.up.set(0, 1, 0);
      cam.lookAt(0, 0, 0);
      cam.updateMatrixWorld();

      box = new THREE.Box3().setFromObject(obj);
      const view = cam.matrixWorldInverse;
      let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
      for (const xx of [box.min.x, box.max.x])
        for (const yy of [box.min.y, box.max.y])
          for (const zz of [box.min.z, box.max.z]) {
            const v = new THREE.Vector3(xx, yy, zz).applyMatrix4(view);
            minx = Math.min(minx, v.x); maxx = Math.max(maxx, v.x);
            miny = Math.min(miny, v.y); maxy = Math.max(maxy, v.y);
          }
      const pad = 1.06;
      const half = Math.max((maxx - minx) / 2, (maxy - miny) / 2) * pad;
      cam.left = -half; cam.right = half; cam.top = half; cam.bottom = -half;
      cam.updateProjectionMatrix();

      renderer.render(scene, cam);
      window.__png = renderer.domElement.toDataURL('image/png');
      log('rendered ok');
    } catch (e) {
      window.__error = 'render: ' + (e && e.stack || e);
    }
  }, (xhr) => {
    if (xhr && xhr.total) log('loading', Math.round((xhr.loaded / xhr.total) * 100) + '%');
  }, (err) => {
    window.__error = 'load: ' + (err && (err.message || err));
  });
} catch (e) {
  window.__error = 'init: ' + (e && e.stack || e);
}
</script></body></html>`;
}

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = decodeURIComponent(req.url.split("?")[0]);
      if (url === "/__render") {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(pageHtml());
        return;
      }
      const filePath = path.join(ROOT, url);
      if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.writeHead(404);
        res.end("not found");
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
      fs.createReadStream(filePath).pipe(res);
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

async function main() {
  const [, , modelArg, outArg, azA, elA, sizeA] = process.argv;
  const model = modelArg || "src/assets/model.glb";
  const out = outArg || "src/assets/model-shot.png";
  const az = azA ? +azA : 45;
  const el = elA ? +elA : 30;
  const size = sizeA ? +sizeA : 2048;

  if (!fs.existsSync(path.join(ROOT, model))) {
    console.error("模型不存在：", model);
    process.exit(1);
  }

  const server = await startServer();
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;
  const modelUrl = "/" + model.replace(/\\/g, "/");
  const pageUrl = `${base}/__render?model=${encodeURIComponent(modelUrl)}&az=${az}&el=${el}&size=${size}`;

  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--use-angle=swiftshader",
      "--ignore-gpu-blocklist",
      "--enable-webgl",
    ],
  });
  try {
    const page = await browser.newPage();
    page.on("console", (m) => console.log(m.text()));
    page.on("pageerror", (e) => console.log("[pageerror]", e.message));
    await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
    console.log("渲染中：", model, `az=${az} el=${el} size=${size}`);
    await page.goto(pageUrl, { waitUntil: "load", timeout: 60000 });
    await page.waitForFunction("window.__png || window.__error", { timeout: 180000 });
    const err = await page.evaluate("window.__error || null");
    if (err) throw new Error(err);
    const dataUrl = await page.evaluate("window.__png");
    const b64 = dataUrl.replace(/^data:image\/png;base64,/, "");
    fs.writeFileSync(path.join(ROOT, out), Buffer.from(b64, "base64"));
    console.log("done ->", out, `(${size}x${size}, transparent)`);
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
