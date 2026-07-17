import Phaser from "phaser";
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

/** 根据安全余量比例取颜色（余量高→绿，接近斩杀线→红）。 */
function safetyColor(frac: number): number {
  if (frac >= 0.6) return THEME.green;
  if (frac >= 0.3) return THEME.gold;
  if (frac >= 0.12) return 0xff8c42;
  return THEME.red;
}

/**
 * 左侧「生存线」圆弧仪表盘：显示当前灵石相对当天斩杀线的安全余量。
 * 弧越满、越绿越安全；灵石逼近斩杀线时弧归零、变红；灵石 ≤ 斩杀线即失败。
 */
export class PressureGauge {
  private scene: Phaser.Scene;
  private arc: Phaser.GameObjects.Graphics;
  private valueText: Phaser.GameObjects.Text;
  private killLineText: Phaser.GameObjects.Text;
  private displayed = -1;
  /** 营业动画期间的实时灵石累计值；为 null 时表示非实时模式。 */
  private liveStones: number | null = null;
  private liveKillLine = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // 竖版玉牌底板
    const bg = scene.add.graphics().setDepth(DEPTH.panel);
    fantasyPanel(bg, PX, PY, PW, PH);

    // 标题
    scene.add
      .text(GX, PY + 11, "董事会压力", {
        fontFamily: FONT_FAMILY,
        fontSize: "12px",
        color: SKIN.textGold,
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.panel + 1);

    this.arc = scene.add.graphics().setDepth(DEPTH.panel + 1);

    // 圆心大数字（当前灵石）
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
      .text(GX, GY + 15, "当前灵石", {
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

  /** 绘制圆弧 + 颜色 + 斩杀线文本，返回安全余量比例。不负责设置中心数字。 */
  private paint(stones: number, killLine: number): number {
    // 安全余量：灵石=斩杀线 → 0（空/红/死）；灵石≥2×斩杀线 → 1（满/绿）
    const denom = Math.max(1, killLine);
    const frac = Phaser.Math.Clamp((stones - killLine) / denom, 0, 1);
    const color = safetyColor(frac);

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
    this.killLineText.setText(`◈ ${killLine}`);
    return frac;
  }

  update(state: GameState): void {
    this.liveStones = null; // 退出实时模式
    const killLine = killLineForDay(state.day);
    const stones = Math.round(state.spiritStones);
    const frac = this.paint(stones, killLine);

    // 数字滚动
    if (this.displayed < 0 || this.displayed === stones) {
      this.displayed = stones;
      this.valueText.setText(`${stones}`);
    } else {
      const counter = { v: this.displayed };
      this.displayed = stones;
      this.scene.tweens.add({
        targets: counter,
        v: stones,
        duration: 500,
        ease: "Cubic.easeOut",
        onUpdate: () => this.valueText.setText(`${Math.round(counter.v)}`),
        onComplete: () => this.valueText.setText(`${stones}`),
      });
    }
    // 危险区脉冲（安全余量很低时）
    if (frac <= 0.15) {
      this.scene.tweens.add({
        targets: this.valueText,
        scale: 1.18,
        duration: 160,
        yoyo: true,
        ease: "Quad.easeOut",
      });
    }
  }

  /** 营业开始：进入实时收益模式，以当天起始灵石与斩杀线为基准。 */
  beginLiveEarnings(baseStones: number, day: number): void {
    this.liveKillLine = killLineForDay(day);
    this.liveStones = Math.round(baseStones);
    this.displayed = this.liveStones;
    this.paint(this.liveStones, this.liveKillLine);
    this.valueText.setText(`${this.liveStones}`);
  }

  /** 游客经过建筑消费：把该笔收益实时累加到仪表盘。 */
  addLiveEarnings(amount: number): void {
    if (this.liveStones == null) return;
    this.liveStones += amount;
    this.displayed = this.liveStones;
    this.paint(this.liveStones, this.liveKillLine);
    this.valueText.setText(`${Math.round(this.liveStones)}`);
    // 轻微跳动反馈（先清除上一次，避免叠加）
    this.scene.tweens.killTweensOf(this.valueText);
    this.valueText.setScale(1);
    this.scene.tweens.add({
      targets: this.valueText,
      scale: 1.14,
      duration: 90,
      yoyo: true,
      ease: "Quad.easeOut",
    });
  }

  /** 营业结束：退出实时模式（后续 update 会以真实结算值收敛）。 */
  endLiveEarnings(): void {
    this.liveStones = null;
  }
}
