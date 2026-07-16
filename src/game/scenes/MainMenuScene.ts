import Phaser from "phaser";
import { DESIGN_HEIGHT, DESIGN_WIDTH } from "../config";
import { FONT_FAMILY, THEME } from "../theme";
import { SaveService } from "../services/SaveService";
import { audio } from "../services/AudioService";
import { Background } from "../rendering/Background";
import { Button } from "../../ui/Button";

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super("MainMenu");
  }

  create(): void {
    const cx = DESIGN_WIDTH / 2;

    this.cameras.main.setBackgroundColor(THEME.bg);
    this.cameras.main.fadeIn(320, 20, 16, 32);
    new Background(this, { top: 0x1a1230, bottom: 0x2c1f48, motes: 22 });

    const title = this.add
      .text(cx, 150, "修仙游乐园", {
        fontFamily: FONT_FAMILY,
        fontSize: "72px",
        color: THEME.textLight,
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
      color: 0x4a5568,
      hoverColor: 0x5a6578,
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
    this.cameras.main.fadeOut(280, 20, 16, 32);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start("Park", { continueGame });
    });
  }

  private showHelp(): void {
    const cx = DESIGN_WIDTH / 2;
    const cy = DESIGN_HEIGHT / 2;
    const overlay = this.add
      .rectangle(cx, cy, DESIGN_WIDTH, DESIGN_HEIGHT, 0x000000, 0.7)
      .setInteractive();
    const panel = this.add.graphics();
    panel.fillStyle(THEME.bgPanelLight, 1);
    panel.fillRoundedRect(cx - 340, cy - 200, 680, 400, 16);
    panel.lineStyle(2, THEME.accent, 0.6);
    panel.strokeRoundedRect(cx - 340, cy - 200, 680, 400, 16);

    const text = [
      "【目标】撑过 15 天且灵石不为负，即可飞升通关。",
      "",
      "【流程】规划(摆放/升级) → 开始营业 → 观看结算 → 三选一 → 下一天。",
      "",
      "【地图】蓝色是蜿蜒主路（不可建造），建筑放在路旁空地。主路多次折返，",
      "越早被游客经过的空地越肥（钱包足/体力好），越靠后越瘦——选址即策略。",
      "【占地/旋转】建筑有不同占地尺寸；放置时按鼠标中键（或 R）旋转朝向。",
      "【赚钱】游客沿主路前行，光顾路旁相邻的游乐/商店消费；钱包与体力有限。",
      "不同门派偏好不同：剑修爱御剑、魔修爱刺激、佛修厌恶刺激。",
      "",
      "【联动】聚灵阵(相邻+15%)、雷池(雷系全局+30%)、悟道台(+1停留)、",
      "九转大摆锤(相邻刺激越多越高)、黄泉漂流(越靠路线末端越高)。",
      "",
      "【风险】每天有灵脉维护费；负面事件可用护山大阵免疫。",
    ].join("\n");

    const body = this.add
      .text(cx, cy - 20, text, {
        fontFamily: FONT_FAMILY,
        fontSize: "18px",
        color: THEME.textLight,
        align: "left",
        lineSpacing: 4,
      })
      .setOrigin(0.5);

    const close = new Button(this, cx, cy + 160, "我知道了", {
      width: 180,
      height: 46,
      onClick: () => {
        overlay.destroy();
        panel.destroy();
        body.destroy();
        close.destroy();
      },
    });
  }
}
