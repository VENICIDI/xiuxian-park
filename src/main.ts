import Phaser from "phaser";
import { DESIGN_HEIGHT, DESIGN_WIDTH } from "./game/config";
import { SUPERSAMPLE } from "./game/hidpi";
import { BootScene } from "./game/scenes/BootScene";
import { PreloadScene } from "./game/scenes/PreloadScene";
import { MainMenuScene } from "./game/scenes/MainMenuScene";
import { ParkScene } from "./game/scenes/ParkScene";
import { ResultScene } from "./game/scenes/ResultScene";
import { audio } from "./game/services/AudioService";

/**
 * 全局：所有 Text 默认以 SUPERSAMPLE 分辨率渲染。
 * 因为各场景主相机放大了 SUPERSAMPLE 倍（见 hidpi.ts），文字若仍按 1× 光栅化
 * 会被相机放大而发糊；这里在工厂创建每个 Text 时统一提升其纹理分辨率。
 */
const createText = Phaser.GameObjects.GameObjectFactory.prototype.text;
Phaser.GameObjects.GameObjectFactory.prototype.text = function (
  this: Phaser.GameObjects.GameObjectFactory,
  ...args: Parameters<typeof createText>
) {
  const t = createText.apply(this, args);
  t.setResolution(SUPERSAMPLE);
  return t;
};

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game-root",
  // 画布清屏色：图片背景加载前的兜底，用天空色而非深紫，避免闪紫
  backgroundColor: "#a6dcf2",
  // 后备缓冲按超采样倍数放大，避免 FIT 拉伸导致整体发虚（逻辑坐标仍为 1280×720）
  width: DESIGN_WIDTH * SUPERSAMPLE,
  height: DESIGN_HEIGHT * SUPERSAMPLE,
  pixelArt: false,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, PreloadScene, MainMenuScene, ParkScene, ResultScene],
};

/**
 * 等待推荐字体（HarmonyOS Sans SC）就绪后再创建游戏，避免 Phaser Canvas 文本
 * 以系统字体绘制后无法刷新。离线或加载超时则回退系统字体照常启动。
 */
async function waitForFonts(): Promise<void> {
  const fontset = (document as Document & { fonts?: FontFaceSet }).fonts;
  if (!fontset) return;
  try {
    await Promise.race([
      Promise.all([
        fontset.load('16px "HarmonyOS Sans SC"'),
        fontset.load('bold 16px "HarmonyOS Sans SC"'),
      ]),
      new Promise((resolve) => setTimeout(resolve, 2500)),
    ]);
  } catch {
    /* 忽略：回退到 FONT_FAMILY 中的系统字体 */
  }
}

const gamePromise = waitForFonts().then(() => new Phaser.Game(config));

// 页面隐藏时暂停音频（不改变已计算结果）
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    audio.suspend();
  } else {
    audio.resume();
  }
});

// 首次交互解锁音频
const unlock = () => {
  audio.unlock();
  window.removeEventListener("pointerdown", unlock);
  window.removeEventListener("keydown", unlock);
};
window.addEventListener("pointerdown", unlock);
window.addEventListener("keydown", unlock);

export default gamePromise;
