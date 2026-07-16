import Phaser from "phaser";
import { DESIGN_HEIGHT, DESIGN_WIDTH } from "./game/config";
import { THEME } from "./game/theme";
import { BootScene } from "./game/scenes/BootScene";
import { PreloadScene } from "./game/scenes/PreloadScene";
import { MainMenuScene } from "./game/scenes/MainMenuScene";
import { ParkScene } from "./game/scenes/ParkScene";
import { ResultScene } from "./game/scenes/ResultScene";
import { audio } from "./game/services/AudioService";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game-root",
  backgroundColor: THEME.bg,
  width: DESIGN_WIDTH,
  height: DESIGN_HEIGHT,
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
