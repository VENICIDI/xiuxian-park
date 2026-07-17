import Phaser from "phaser";
import { DESIGN_HEIGHT, DESIGN_WIDTH } from "../config";
import { FONT_FAMILY, THEME } from "../theme";
import { SaveService } from "../services/SaveService";
import { audio } from "../services/AudioService";
import { Background } from "../rendering/Background";
import { applyHiDpiCamera } from "../hidpi";
import { Button } from "../../ui/Button";
import { GuidePanel } from "../../ui/GuidePanel";

export class MainMenuScene extends Phaser.Scene {
  private guide?: GuidePanel;

  constructor() {
    super("MainMenu");
  }

  create(): void {
    applyHiDpiCamera(this);
    const cx = DESIGN_WIDTH / 2;

    this.cameras.main.setBackgroundColor(THEME.bg);
    this.cameras.main.fadeIn(320, 166, 220, 242);
    new Background(this, { image: "bg-park", motes: 18, darken: 0.22 });

    const title = this.add
      .text(cx, 150, "修仙游乐园", {
        fontFamily: FONT_FAMILY,
        fontSize: "72px",
        color: THEME.textGold,
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setShadow(0, 4, "#000000", 8, true, true);
    // 标题轻微呼吸
    this.tweens.add({
      targets: title,
      scale: 1.03,
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.add
      .text(cx, 218, "Xian Park · Game Jam MVP", {
        fontFamily: FONT_FAMILY,
        fontSize: "22px",
        color: THEME.accentText,
      })
      .setOrigin(0.5);

    this.add
      .text(
        cx,
        278,
        "经营你的修仙乐园：摆放建筑、联动生财、撑过 15 天成仙路。",
        {
          fontFamily: FONT_FAMILY,
          fontSize: "18px",
          color: THEME.textDim,
        },
      )
      .setOrigin(0.5);

    const hasSave = SaveService.hasSave();

    new Button(this, cx, 370, "新的游戏", {
      width: 240,
      height: 56,
      fontSize: 24,
      onClick: () => this.startGame(false),
    });

    const cont = new Button(this, cx, 440, "继续游戏", {
      width: 240,
      height: 56,
      fontSize: 24,
      onClick: () => this.startGame(true),
    });
    cont.setEnabled(hasSave);

    new Button(this, cx, 510, "玩法说明", {
      width: 240,
      height: 56,
      fontSize: 24,
      variant: "secondary",
      onClick: () => this.showHelp(),
    });

    this.add
      .text(
        cx,
        DESIGN_HEIGHT - 30,
        "PC 横屏 · 鼠标操作 · 确定性随机（同种子可复现）",
        {
          fontFamily: FONT_FAMILY,
          fontSize: "14px",
          color: THEME.textDim,
        },
      )
      .setOrigin(0.5);
  }

  private startGame(continueGame: boolean): void {
    audio.unlock();
    audio.startMusic();
    this.cameras.main.fadeOut(280, 166, 220, 242);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start("Park", { continueGame });
    });
  }

  private showHelp(): void {
    if (!this.guide) this.guide = new GuidePanel(this);
    audio.unlock();
    this.guide.open();
  }
}
