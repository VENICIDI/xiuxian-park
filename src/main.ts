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

const game = new Phaser.Game(config);

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

export default game;
