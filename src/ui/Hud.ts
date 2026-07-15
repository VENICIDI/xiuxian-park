import Phaser from "phaser";
import { DESIGN_WIDTH } from "../game/config";
import { BALANCE } from "../game/data/balance";
import { getDailyEvent } from "../game/data/daily-events";
import type { GameState } from "../game/models/game-state";
import { DEPTH, FONT_FAMILY, THEME } from "../game/theme";

/** 顶部 HUD：天数、灵石、游客数、当前事件。 */
export class Hud {
  private scene: Phaser.Scene;
  private dayText: Phaser.GameObjects.Text;
  private stoneText: Phaser.GameObjects.Text;
  private visitorText: Phaser.GameObjects.Text;
  private eventTitle: Phaser.GameObjects.Text;
  private eventDesc: Phaser.GameObjects.Text;
  private toast: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const g = scene.add.graphics().setDepth(DEPTH.hud);
    g.fillStyle(THEME.bgPanel, 1);
    g.fillRect(0, 0, DESIGN_WIDTH, 80);
    g.lineStyle(2, THEME.accent, 0.4);
    g.lineBetween(0, 80, DESIGN_WIDTH, 80);

    const mk = (x: number, label: string, color: string = THEME.textGold) => {
      scene.add
        .text(x, 16, label, {
          fontFamily: FONT_FAMILY,
          fontSize: "13px",
          color: THEME.textDim,
        })
        .setDepth(DEPTH.hud);
      return scene.add
        .text(x, 34, "", {
          fontFamily: FONT_FAMILY,
          fontSize: "26px",
          color,
          fontStyle: "bold",
        })
        .setDepth(DEPTH.hud);
    };

    this.dayText = mk(24, "天数", THEME.textLight);
    this.stoneText = mk(180, "灵石", THEME.textGold);
    this.visitorText = mk(360, "今日游客", "#7ce0a3");

    this.eventTitle = scene.add
      .text(560, 16, "", {
        fontFamily: FONT_FAMILY,
        fontSize: "16px",
        color: THEME.accentText,
        fontStyle: "bold",
      })
      .setDepth(DEPTH.hud);
    this.eventDesc = scene.add
      .text(560, 40, "", {
        fontFamily: FONT_FAMILY,
        fontSize: "14px",
        color: THEME.textDim,
        wordWrap: { width: DESIGN_WIDTH - 580 },
      })
      .setDepth(DEPTH.hud);

    this.toast = scene.add
      .text(DESIGN_WIDTH / 2, 100, "", {
        fontFamily: FONT_FAMILY,
        fontSize: "20px",
        color: THEME.textLight,
        backgroundColor: "#000000aa",
        padding: { x: 14, y: 8 },
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.tooltip)
      .setAlpha(0);
  }

  update(state: GameState): void {
    this.dayText.setText(`${state.day} / ${BALANCE.finalDay}`);
    this.stoneText.setText(`◈ ${state.spiritStones}`);
    this.visitorText.setText(`♟ ${state.visitorCount}`);
    const ev = getDailyEvent(state.activeEventId);
    this.eventTitle.setText(`今日事件：${ev.name}${ev.negative ? "（负面）" : ""}`);
    this.eventTitle.setColor(ev.negative ? THEME.danger : THEME.accentText);
    this.eventDesc.setText(ev.description);
  }

  showToast(msg: string, isError = false): void {
    this.toast.setText(msg).setColor(isError ? THEME.danger : THEME.success);
    this.toast.setAlpha(1);
    this.scene.tweens.killTweensOf(this.toast);
    this.scene.tweens.add({
      targets: this.toast,
      alpha: 0,
      delay: 1100,
      duration: 500,
    });
  }
}
