import Phaser from "phaser";
import { DESIGN_WIDTH } from "../game/config";
import { BALANCE } from "../game/data/balance";
import { getDailyEvent } from "../game/data/daily-events";
import type { GameState } from "../game/models/game-state";
import { DEPTH, FONT_FAMILY, RADIUS, THEME } from "../game/theme";
import { HUD_H } from "../game/rendering/layout";

const BAR_H = HUD_H;

/** 顶部 HUD（规范十三/十九 Layer7）：天数、灵石、今日游客、当前事件。 */
export class Hud {
  private scene: Phaser.Scene;
  private dayText: Phaser.GameObjects.Text;
  private stoneText: Phaser.GameObjects.Text;
  private visitorText: Phaser.GameObjects.Text;
  private eventTitle: Phaser.GameObjects.Text;
  private eventDesc: Phaser.GameObjects.Text;
  private toast: Phaser.GameObjects.Text;
  private banner: Phaser.GameObjects.Text;
  private displayedStones = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const g = scene.add.graphics().setDepth(DEPTH.hud);
    g.fillStyle(THEME.bgPanel, 1);
    g.fillRect(0, 0, DESIGN_WIDTH, BAR_H);
    g.fillStyle(THEME.purple, 0.9);
    g.fillRect(0, BAR_H - 3, DESIGN_WIDTH, 3);

    // 状态胶囊
    this.chip(g, 20, 132, THEME.blue);
    this.chip(g, 168, 176, THEME.gold);
    this.chip(g, 360, 176, THEME.green);

    this.dayText = this.stat(scene, 20, "📅 天数", THEME.textLight);
    this.stoneText = this.stat(scene, 168, "💰 灵石", THEME.textGold);
    this.visitorText = this.stat(scene, 360, "🙂 今日游客", THEME.success);

    this.eventTitle = scene.add
      .text(576, 12, "", {
        fontFamily: FONT_FAMILY,
        fontSize: "16px",
        color: THEME.accentText,
        fontStyle: "bold",
      })
      .setDepth(DEPTH.hud + 1);
    this.eventDesc = scene.add
      .text(576, 36, "", {
        fontFamily: FONT_FAMILY,
        fontSize: "13px",
        color: THEME.textDim,
        wordWrap: { width: DESIGN_WIDTH - 600 },
      })
      .setDepth(DEPTH.hud + 1);

    this.toast = scene.add
      .text(DESIGN_WIDTH / 2, 108, "", {
        fontFamily: FONT_FAMILY,
        fontSize: "20px",
        color: THEME.textLight,
        backgroundColor: "#241b3add",
        padding: { x: 16, y: 10 },
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.tooltip)
      .setAlpha(0);

    this.banner = scene.add
      .text(DESIGN_WIDTH / 2, 280, "", {
        fontFamily: FONT_FAMILY,
        fontSize: "48px",
        color: THEME.textGold,
        fontStyle: "bold",
        stroke: "#241b3a",
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.tooltip)
      .setAlpha(0);
  }

  private chip(
    g: Phaser.GameObjects.Graphics,
    x: number,
    w: number,
    accent: number,
  ): void {
    g.fillStyle(THEME.bgPanelLight, 1);
    g.fillRoundedRect(x - 6, 8, w, BAR_H - 16, RADIUS);
    g.lineStyle(2, accent, 0.5);
    g.strokeRoundedRect(x - 6, 8, w, BAR_H - 16, RADIUS);
  }

  private stat(
    scene: Phaser.Scene,
    x: number,
    label: string,
    color: string,
  ): Phaser.GameObjects.Text {
    scene.add
      .text(x + 6, 12, label, {
        fontFamily: FONT_FAMILY,
        fontSize: "13px",
        color: THEME.textDim,
      })
      .setDepth(DEPTH.hud + 1);
    return scene.add
      .text(x + 6, 32, "", {
        fontFamily: FONT_FAMILY,
        fontSize: "24px",
        color,
        fontStyle: "bold",
      })
      .setDepth(DEPTH.hud + 1);
  }

  update(state: GameState): void {
    this.dayText.setText(`${state.day} / ${BALANCE.finalDay}`);
    this.setStones(state.spiritStones);
    this.visitorText.setText(`${state.visitorCount}`);
    const ev = getDailyEvent(state.activeEventId);
    this.eventTitle.setText(`今日事件：${ev.name}${ev.negative ? "（负面）" : ""}`);
    this.eventTitle.setColor(ev.negative ? THEME.danger : THEME.accentText);
    this.eventDesc.setText(ev.description);
  }

  /** 灵石数字滚动到目标值。 */
  private setStones(target: number): void {
    const from = this.displayedStones;
    if (from === target) {
      this.stoneText.setText(`${target}`);
      return;
    }
    const counter = { v: from };
    this.scene.tweens.add({
      targets: counter,
      v: target,
      duration: 500,
      ease: "Cubic.easeOut",
      onUpdate: () => this.stoneText.setText(`${Math.round(counter.v)}`),
      onComplete: () => {
        this.displayedStones = target;
        this.stoneText.setText(`${target}`);
      },
    });
    this.displayedStones = target;
    this.scene.tweens.add({
      targets: this.stoneText,
      scale: target > from ? 1.18 : 0.9,
      duration: 140,
      yoyo: true,
      ease: "Quad.easeOut",
    });
  }

  /** 大字横幅（新一天/关键提示）。 */
  showBanner(msg: string, color: string = THEME.textGold): void {
    this.banner.setText(msg).setColor(color).setAlpha(0).setScale(0.7);
    this.scene.tweens.killTweensOf(this.banner);
    this.scene.tweens.add({
      targets: this.banner,
      alpha: 1,
      scale: 1,
      duration: 340,
      ease: "Back.easeOut",
    });
    this.scene.tweens.add({
      targets: this.banner,
      alpha: 0,
      delay: 1200,
      duration: 500,
    });
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
