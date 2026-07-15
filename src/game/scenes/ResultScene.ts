import Phaser from "phaser";
import { DESIGN_WIDTH } from "../config";
import { BALANCE } from "../data/balance";
import type { GameState } from "../models/game-state";
import { FONT_FAMILY, THEME } from "../theme";
import { SaveService } from "../services/SaveService";
import { audio } from "../services/AudioService";
import { Background } from "../rendering/Background";
import { Fx } from "../rendering/Fx";
import { Button } from "../../ui/Button";

export class ResultScene extends Phaser.Scene {
  private state!: GameState;

  constructor() {
    super("Result");
  }

  init(data: { state: GameState }): void {
    this.state = data.state;
  }

  create(): void {
    const cx = DESIGN_WIDTH / 2;
    this.cameras.main.setBackgroundColor(THEME.bg);
    this.cameras.main.fadeIn(320, 20, 16, 32);

    const victory = this.state.statistics.failureReason == null;
    new Background(this, {
      top: victory ? 0x1e1a3e : 0x241220,
      bottom: victory ? 0x33285a : 0x361826,
      motes: victory ? 26 : 8,
    });
    audio.playSfx(victory ? "win" : "lose");

    const title = this.add
      .text(cx, 130, victory ? "飞升成仙！" : "乐园倒闭", {
        fontFamily: FONT_FAMILY,
        fontSize: "64px",
        color: victory ? THEME.textGold : THEME.danger,
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setShadow(0, 4, "#000000", 8, true, true)
      .setScale(0.6)
      .setAlpha(0);
    this.tweens.add({
      targets: title,
      scale: 1,
      alpha: 1,
      duration: 500,
      ease: "Back.easeOut",
    });

    if (victory) this.celebrate();

    this.add
      .text(
        cx,
        200,
        victory
          ? `你成功经营乐园 ${BALANCE.finalDay} 天，位列仙班！`
          : this.state.statistics.failureReason ?? "经营失败。",
        { fontFamily: FONT_FAMILY, fontSize: "20px", color: THEME.textLight },
      )
      .setOrigin(0.5);

    const stats = this.state.statistics;
    const rows: Array<[string, string]> = [
      ["坚持天数", `${stats.daysSurvived} 天`],
      ["累计总收入", `◈ ${stats.totalRevenue}`],
      ["单日最高收入", `◈ ${stats.bestDayRevenue}`],
      ["最高连携（单游客消费）", `${stats.bestCombo} 次`],
      ["剩余灵石", `◈ ${this.state.spiritStones}`],
      ["随机种子", `${this.state.seed}`],
    ];

    const panelW = 480;
    const startY = 270;
    const g = this.add.graphics();
    g.fillStyle(THEME.bgPanel, 1);
    g.fillRoundedRect(cx - panelW / 2, startY - 20, panelW, rows.length * 40 + 30, 14);
    g.lineStyle(2, THEME.accent, 0.4);
    g.strokeRoundedRect(cx - panelW / 2, startY - 20, panelW, rows.length * 40 + 30, 14);

    rows.forEach(([k, v], i) => {
      const y = startY + i * 40;
      this.add.text(cx - panelW / 2 + 28, y, k, {
        fontFamily: FONT_FAMILY,
        fontSize: "18px",
        color: THEME.textDim,
      });
      this.add
        .text(cx + panelW / 2 - 28, y, v, {
          fontFamily: FONT_FAMILY,
          fontSize: "18px",
          color: THEME.textGold,
          fontStyle: "bold",
        })
        .setOrigin(1, 0);
    });

    const btnY = startY + rows.length * 40 + 60;
    new Button(this, cx - 130, btnY, "再来一局", {
      width: 220,
      height: 54,
      fontSize: 22,
      onClick: () => {
        SaveService.clear();
        this.transitionTo("Park", { continueGame: false });
      },
    });
    new Button(this, cx + 130, btnY, "返回主菜单", {
      width: 220,
      height: 54,
      fontSize: 22,
      color: 0x4a5568,
      hoverColor: 0x5a6578,
      onClick: () => {
        SaveService.clear();
        this.transitionTo("MainMenu");
      },
    });
  }

  private celebrate(): void {
    const fx = new Fx(this);
    const cx = DESIGN_WIDTH / 2;
    // 持续飘落的金币与星光
    this.time.addEvent({
      delay: 260,
      repeat: 16,
      callback: () => {
        const x = Phaser.Math.Between(cx - 260, cx + 260);
        fx.coinBurst(x, 90);
        fx.sparkle(Phaser.Math.Between(cx - 300, cx + 300), Phaser.Math.Between(120, 260));
      },
    });
  }

  private transitionTo(key: string, data?: object): void {
    this.cameras.main.fadeOut(280, 20, 16, 32);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(key, data);
    });
  }
}
