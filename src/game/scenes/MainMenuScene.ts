import Phaser from "phaser";
import { DESIGN_HEIGHT, DESIGN_WIDTH } from "../config";
import { FONT_FAMILY, THEME } from "../theme";
import { SaveService } from "../services/SaveService";
import { audio } from "../services/AudioService";
import { Button } from "../../ui/Button";

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super("MainMenu");
  }

  create(): void {
    const cx = DESIGN_WIDTH / 2;

    this.cameras.main.setBackgroundColor(THEME.bg);
    this.drawBackdrop();

    this.add
      .text(cx, 150, "修仙游乐园", {
        fontFamily: FONT_FAMILY,
        fontSize: "72px",
        color: THEME.textLight,
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setShadow(0, 4, "#000000", 8, true, true);

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

  private drawBackdrop(): void {
    const g = this.add.graphics();
    g.fillStyle(THEME.bgPanel, 0.5);
    for (let i = 0; i < 40; i++) {
      const x = (i * 137) % DESIGN_WIDTH;
      const y = (i * 89) % DESIGN_HEIGHT;
      g.fillStyle(0x8e6bd6, 0.05 + (i % 3) * 0.02);
      g.fillCircle(x, y, 40 + (i % 4) * 20);
    }
  }

  private startGame(continueGame: boolean): void {
    audio.unlock();
    audio.startMusic();
    this.scene.start("Park", { continueGame });
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
      "【地图】蓝色格子是道路（不可建造），建筑要放在道路旁的空地上。",
      "【占地/旋转】建筑有不同占地尺寸；放置时按鼠标中键（或 R）旋转朝向。",
      "【赚钱】游客沿固定道路前行，会光顾路旁相邻的游乐/商店并消费。",
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
