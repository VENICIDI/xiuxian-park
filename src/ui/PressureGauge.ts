import Phaser from "phaser";
import { BALANCE } from "../game/data/balance";
import { killLineForDay } from "../game/controllers/TurnController";
import type { GameState } from "../game/models/game-state";
import { DEPTH, FONT_FAMILY, THEME } from "../game/theme";
import { HUD_H } from "../game/rendering/layout";
import { SKIN, fantasyPanel } from "./skin";

// 左侧竖版面板 + 圆弧仪表盘（紧凑小尺寸）
const PW = 104;
const PH = 132;
const PX = 20;
const PY = HUD_H + 16;
const GX = PX + PW / 2; // 仪表盘圆心 x
const GY = PY + 60; // 仪表盘圆心 y
const R = 34; // 圆弧半径
const TRACK_W = 9;
const FILL_W = 8;
const START_DEG = 135; // 起点（左下），顺时针扫 270°，底部留缺口
const SWEEP_DEG = 270;

/** 根据压力值取仪表盘颜色（绿 → 金 → 橙 → 红）。 */
function pressureColor(p: number): number {
  if (p < 40) return THEME.green;
  if (p < 70) return THEME.gold;
  if (p < 90) return 0xff8c42;
  return THEME.red;
}

/**
 * 左侧「股东压力」圆弧仪表盘：显示当前压力 / 斩杀线机制的失败进度。
 * 压力越高圆弧越满、越红，满 100% 即被董事会罢免。
 */
export class PressureGauge {
  private scene: Phaser.Scene;
  private arc: Phaser.GameObjects.Graphics;
  private valueText: Phaser.GameObjects.Text;
  private killLineText: Phaser.GameObjects.Text;
  private displayed = -1;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // 竖版玉牌底板
    const bg = scene.add.graphics().setDepth(DEPTH.panel);
    fantasyPanel(bg, PX, PY, PW, PH);

    // 标题
    scene.add
      .text(GX, PY + 11, "股东压力", {
        fontFamily: FONT_FAMILY,
        fontSize: "12px",
        color: SKIN.textGold,
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.panel + 1);

    this.arc = scene.add.graphics().setDepth(DEPTH.panel + 1);

    // 圆心大数字（百分比）
    this.valueText = scene.add
      .text(GX, GY - 2, "0", {
        fontFamily: FONT_FAMILY,
        fontSize: "22px",
        color: THEME.textLight,
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.panel + 2);

    scene.add
      .text(GX, GY + 15, "距罢免", {
        fontFamily: FONT_FAMILY,
        fontSize: "9px",
        color: SKIN.textDim,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.panel + 2);

    // 底部斩杀线目标
    this.killLineText = scene.add
      .text(GX, PY + PH - 15, "", {
        fontFamily: FONT_FAMILY,
        fontSize: "12px",
        color: SKIN.textLight,
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.panel + 1);

    scene.add
      .text(GX, PY + PH - 30, "今日斩杀线", {
        fontFamily: FONT_FAMILY,
        fontSize: "9px",
        color: SKIN.textDim,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.panel + 1);
  }

  private strokeArc(r: number, fromDeg: number, toDeg: number): void {
    this.arc.beginPath();
    this.arc.arc(
      GX,
      GY,
      r,
      Phaser.Math.DegToRad(fromDeg),
      Phaser.Math.DegToRad(toDeg),
      false,
    );
    this.arc.strokePath();
  }

  update(state: GameState): void {
    const max = BALANCE.shareholderPressure.max;
    const p = Phaser.Math.Clamp(Math.round(state.shareholderPressure), 0, max);
    const frac = p / max;
    const color = pressureColor(p);

    this.arc.clear();
    // 轨道
    this.arc.lineStyle(TRACK_W, 0x1c332c, 1);
    this.strokeArc(R, START_DEG, START_DEG + SWEEP_DEG);
    // 已充能弧
    if (frac > 0) {
      this.arc.lineStyle(FILL_W, color, 1);
      this.strokeArc(R, START_DEG, START_DEG + SWEEP_DEG * frac);
      // 端点圆头
      const endRad = Phaser.Math.DegToRad(START_DEG + SWEEP_DEG * frac);
      this.arc.fillStyle(color, 1);
      this.arc.fillCircle(GX + Math.cos(endRad) * R, GY + Math.sin(endRad) * R, FILL_W / 2);
      const startRad = Phaser.Math.DegToRad(START_DEG);
      this.arc.fillCircle(
        GX + Math.cos(startRad) * R,
        GY + Math.sin(startRad) * R,
        FILL_W / 2,
      );
    }

    this.valueText.setColor(color === THEME.gold ? THEME.textGold : `#${color.toString(16).padStart(6, "0")}`);
    this.killLineText.setText(`◈ ${killLineForDay(state.day)}`);

    // 数字滚动
    if (this.displayed < 0) {
      this.displayed = p;
      this.valueText.setText(`${p}`);
      return;
    }
    if (this.displayed === p) {
      this.valueText.setText(`${p}`);
      return;
    }
    const counter = { v: this.displayed };
    this.displayed = p;
    this.scene.tweens.add({
      targets: counter,
      v: p,
      duration: 500,
      ease: "Cubic.easeOut",
      onUpdate: () => this.valueText.setText(`${Math.round(counter.v)}`),
      onComplete: () => this.valueText.setText(`${p}`),
    });
    // 危险区脉冲
    if (p >= 80) {
      this.scene.tweens.add({
        targets: this.valueText,
        scale: 1.18,
        duration: 160,
        yoyo: true,
        ease: "Quad.easeOut",
      });
    }
  }
}
