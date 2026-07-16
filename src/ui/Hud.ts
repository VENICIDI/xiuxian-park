import Phaser from "phaser";
import { DESIGN_WIDTH } from "../game/config";
import { BALANCE } from "../game/data/balance";
import { getDailyEvent } from "../game/data/daily-events";
import type { GameState } from "../game/models/game-state";
import { DEPTH, FONT_FAMILY, THEME } from "../game/theme";
import { HUD_H } from "../game/rendering/layout";
import { SKIN, fantasyPanel, medallion } from "./skin";

type Plaque = { x: number; w: number };

const DAY: Plaque = { x: 12, w: 150 };
const STONE: Plaque = { x: 170, w: 178 };
const VISITOR: Plaque = { x: 356, w: 170 };
const EVENT: Plaque = { x: 536, w: DESIGN_WIDTH - 12 - 536 };
const PLAQUE_Y = 8;
const PLAQUE_H = HUD_H - 16;

/** 顶部 HUD（仙侠玉牌风）：天数、灵石、今日游客、当前事件。 */
export class Hud {
  private scene: Phaser.Scene;
  private dayText: Phaser.GameObjects.Text;
  private stoneText: Phaser.GameObjects.Text;
  private visitorText: Phaser.GameObjects.Text;
  private eventTitle: Phaser.GameObjects.Text;
  private eventDesc: Phaser.GameObjects.Text;
  private eventIcon: Phaser.GameObjects.Text;
  private toast: Phaser.GameObjects.Text;
  private banner: Phaser.GameObjects.Text;
  private displayedStones = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // —— 雕花顶栏 ——
    const g = scene.add.graphics().setDepth(DEPTH.hud);
    g.fillGradientStyle(0x2b4a43, 0x2b4a43, 0x14231f, 0x14231f, 1);
    g.fillRect(0, 0, DESIGN_WIDTH, HUD_H);
    g.fillStyle(0xffffff, 0.05);
    g.fillRect(0, 0, DESIGN_WIDTH, 10);
    // 底部金色双线压边
    g.fillStyle(SKIN.goldDim, 0.9);
    g.fillRect(0, HUD_H - 4, DESIGN_WIDTH, 4);
    g.fillStyle(SKIN.gold, 0.85);
    g.fillRect(0, HUD_H - 4, DESIGN_WIDTH, 1.5);
    g.fillStyle(SKIN.edgeDark, 0.6);
    g.fillRect(0, HUD_H, DESIGN_WIDTH, 2);

    // —— 三块资源玉牌 ——
    fantasyPanel(g, DAY.x, PLAQUE_Y, DAY.w, PLAQUE_H, {
      top: SKIN.plaqueTop,
      bottom: SKIN.plaqueBottom,
    });
    fantasyPanel(g, STONE.x, PLAQUE_Y, STONE.w, PLAQUE_H, {
      top: SKIN.plaqueTop,
      bottom: SKIN.plaqueBottom,
    });
    fantasyPanel(g, VISITOR.x, PLAQUE_Y, VISITOR.w, PLAQUE_H, {
      top: SKIN.plaqueTop,
      bottom: SKIN.plaqueBottom,
    });
    fantasyPanel(g, EVENT.x, PLAQUE_Y, EVENT.w, PLAQUE_H, {
      top: SKIN.plaqueTop,
      bottom: SKIN.plaqueBottom,
    });

    const cy = PLAQUE_Y + PLAQUE_H / 2;

    // 图标章
    medallion(scene, DAY.x + 32, cy, 18, "📅", SKIN.jadeLight).setDepth(
      DEPTH.hud + 1,
    );
    const coinMed = medallion(scene, STONE.x + 32, cy, 18, "💰", SKIN.gold).setDepth(
      DEPTH.hud + 1,
    );
    medallion(scene, VISITOR.x + 32, cy, 18, "🙂", THEME.green).setDepth(
      DEPTH.hud + 1,
    );
    const eventMed = medallion(scene, EVENT.x + 30, cy, 18, "✨", SKIN.gold).setDepth(
      DEPTH.hud + 1,
    );
    this.eventIcon = eventMed.getAt(1) as Phaser.GameObjects.Text;

    // 金币玉牌轻微呼吸（货币感）
    scene.tweens.add({
      targets: coinMed,
      scale: 1.06,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // 数值文本
    this.dayText = this.value(DAY.x + 58, cy, THEME.textLight);
    this.stoneText = this.value(STONE.x + 58, cy, SKIN.textGold);
    this.visitorText = this.value(VISITOR.x + 58, cy, "#9ff0a6");
    this.label(DAY.x + 58, "天数");
    this.label(STONE.x + 58, "灵石");
    this.label(VISITOR.x + 58, "今日游客");

    // 事件牌
    this.eventTitle = scene.add
      .text(EVENT.x + 54, PLAQUE_Y + 9, "", {
        fontFamily: FONT_FAMILY,
        fontSize: "15px",
        color: SKIN.textLight,
        fontStyle: "bold",
      })
      .setDepth(DEPTH.hud + 1);
    this.eventDesc = scene.add
      .text(EVENT.x + 54, PLAQUE_Y + 30, "", {
        fontFamily: FONT_FAMILY,
        fontSize: "12px",
        color: SKIN.textDim,
        wordWrap: { width: EVENT.w - 72 },
      })
      .setDepth(DEPTH.hud + 1);

    this.toast = scene.add
      .text(DESIGN_WIDTH / 2, 108, "", {
        fontFamily: FONT_FAMILY,
        fontSize: "20px",
        color: THEME.textLight,
        backgroundColor: "#12241fdd",
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
        stroke: "#12241f",
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.tooltip)
      .setAlpha(0);
  }

  private label(x: number, text: string): void {
    this.scene.add
      .text(x, PLAQUE_Y + 8, text, {
        fontFamily: FONT_FAMILY,
        fontSize: "12px",
        color: SKIN.textDim,
      })
      .setDepth(DEPTH.hud + 1);
  }

  private value(x: number, cy: number, color: string): Phaser.GameObjects.Text {
    return this.scene.add
      .text(x, cy + 3, "", {
        fontFamily: FONT_FAMILY,
        fontSize: "23px",
        color,
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5)
      .setDepth(DEPTH.hud + 1);
  }

  update(state: GameState): void {
    this.dayText.setText(`${state.day} / ${BALANCE.finalDay}`);
    this.setStones(state.spiritStones);
    this.visitorText.setText(`${state.visitorCount}`);
    const ev = getDailyEvent(state.activeEventId);
    this.eventTitle.setText(`${ev.name}${ev.negative ? "（负面）" : ""}`);
    this.eventTitle.setColor(ev.negative ? THEME.danger : SKIN.textGold);
    this.eventDesc.setText(ev.description);
    this.eventIcon.setText(ev.negative ? "⚠️" : "✨");
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
