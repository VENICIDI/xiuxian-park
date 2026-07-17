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
  private storyShowing = false;

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
      onClick: () => this.showStory(),
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

  /** 点击「新的游戏」：先播放背景故事漫画，再进入游戏。 */
  private showStory(): void {
    if (this.storyShowing) return;
    this.storyShowing = true;
    audio.unlock();

    const cx = DESIGN_WIDTH / 2;
    const cy = DESIGN_HEIGHT / 2;
    const layer: Phaser.GameObjects.GameObject[] = [];

    const overlay = this.add
      .rectangle(cx, cy, DESIGN_WIDTH, DESIGN_HEIGHT, 0x120a1e, 1)
      .setDepth(200)
      .setAlpha(0)
      .setInteractive();
    layer.push(overlay);

    // 背景故事大图，铺满整个画布（无黑边）
    const img = this.add
      .image(cx, cy, "story-bg")
      .setDepth(201)
      .setDisplaySize(DESIGN_WIDTH, DESIGN_HEIGHT)
      .setAlpha(0);
    const baseScaleX = img.scaleX;
    const baseScaleY = img.scaleY;
    layer.push(img);

    // 屏幕右下角一个低调的黄色箭头（无边框），点击进入游戏
    const arrowX = DESIGN_WIDTH - 40;
    const arrowY = DESIGN_HEIGHT - 40;
    const arrow = this.add
      .text(arrowX, arrowY, "➤", {
        fontFamily: FONT_FAMILY,
        fontSize: "44px",
        color: THEME.textGold,
      })
      .setOrigin(0.5)
      .setDepth(202)
      .setAlpha(0)
      .setShadow(0, 2, "#000000", 6, false, true)
      .setInteractive({ useHandCursor: true });
    arrow.on("pointerover", () => arrow.setScale(1.18));
    arrow.on("pointerout", () => arrow.setScale(1));
    arrow.on("pointerdown", () => finish());
    layer.push(arrow);

    // 淡入
    this.tweens.add({ targets: overlay, alpha: 1, duration: 260, ease: "Quad.easeOut" });
    this.tweens.add({
      targets: [img, arrow],
      alpha: 1,
      duration: 340,
      delay: 140,
      ease: "Quad.easeOut",
    });
    this.tweens.add({
      targets: img,
      scaleX: { from: baseScaleX * 0.985, to: baseScaleX },
      scaleY: { from: baseScaleY * 0.985, to: baseScaleY },
      duration: 480,
      delay: 140,
      ease: "Quad.easeOut",
    });
    // 箭头轻微呼吸，暗示可点击
    this.tweens.add({
      targets: arrow,
      x: arrowX + 6,
      duration: 720,
      delay: 500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    const keydown = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " " || e.key === "Escape") finish();
    };
    window.addEventListener("keydown", keydown);

    const finish = (): void => {
      window.removeEventListener("keydown", keydown);
      this.tweens.add({
        targets: layer,
        alpha: 0,
        duration: 220,
        ease: "Quad.easeIn",
        onComplete: () => {
          for (const obj of layer) obj.destroy();
          this.storyShowing = false;
          this.startGame(false);
        },
      });
    };
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
