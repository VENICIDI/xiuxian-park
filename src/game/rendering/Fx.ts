import Phaser from "phaser";
import { DEPTH, FONT_FAMILY, PALETTE } from "../theme";

/**
 * 集中管理表现层"juice"特效：金币迸射、尘土、星花、雷电、飘字、镜头震动。
 * 纯视觉，不参与规则；随机走 Phaser 自带随机，不影响经济结算。
 */
export class Fx {
  private scene: Phaser.Scene;
  private coin: Phaser.GameObjects.Particles.ParticleEmitter;
  private dust: Phaser.GameObjects.Particles.ParticleEmitter;
  private spark: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    this.coin = scene.add
      .particles(0, 0, "coin", {
        speed: { min: 120, max: 280 },
        angle: { min: -115, max: -65 },
        gravityY: 620,
        lifespan: 750,
        scale: { start: 1, end: 0.35 },
        alpha: { start: 1, end: 0.5 },
        rotate: { min: -180, max: 180 },
        frequency: -1,
      })
      .setDepth(DEPTH.fx);

    this.dust = scene.add
      .particles(0, 0, "smoke", {
        tint: 0xcaba95,
        speed: { min: 20, max: 80 },
        lifespan: 480,
        scale: { start: 0.6, end: 1.7 },
        alpha: { start: 0.55, end: 0 },
        frequency: -1,
      })
      .setDepth(DEPTH.fx);

    this.spark = scene.add
      .particles(0, 0, "spark", {
        tint: [PALETTE.green, PALETTE.gold, PALETTE.blue],
        speed: { min: 40, max: 140 },
        lifespan: 650,
        scale: { start: 1, end: 0 },
        alpha: { start: 1, end: 0 },
        rotate: { min: -180, max: 180 },
        blendMode: Phaser.BlendModes.ADD,
        frequency: -1,
      })
      .setDepth(DEPTH.fx);
  }

  coinBurst(x: number, y: number): void {
    this.coin.emitParticleAt(x, y, Phaser.Math.Between(3, 6));
  }

  dustPuff(x: number, y: number): void {
    this.dust.emitParticleAt(x, y, 7);
  }

  sparkle(x: number, y: number): void {
    this.spark.emitParticleAt(x, y, Phaser.Math.Between(4, 7));
  }

  /** 雷电：从上方劈到目标点，白光闪一下并震屏。 */
  thunderBolt(x: number, y: number): void {
    const g = this.scene.add.graphics().setDepth(DEPTH.fx + 1);
    g.lineStyle(3, 0xe1bee7, 1);
    let px = x;
    let py = y - 220;
    g.beginPath();
    g.moveTo(px, Math.max(0, py));
    const steps = 6;
    for (let i = 1; i <= steps; i++) {
      px = x + Phaser.Math.Between(-16, 16);
      py = Math.max(0, y - 220) + ((y - Math.max(0, y - 220)) * i) / steps;
      g.lineTo(px, py);
    }
    g.strokePath();
    g.lineStyle(7, 0xba68c8, 0.4);
    g.strokePath();

    const flash = this.scene.add
      .image(x, y, "glow")
      .setTint(0xce93d8)
      .setScale(4)
      .setDepth(DEPTH.fx)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.scene.tweens.add({
      targets: [g, flash],
      alpha: 0,
      duration: 260,
      onComplete: () => {
        g.destroy();
        flash.destroy();
      },
    });
    this.shake(120, 0.006);
  }

  /** 飘字（收益/提示）。 */
  floatText(
    x: number,
    y: number,
    text: string,
    color: string,
    size = 20,
  ): void {
    const t = this.scene.add
      .text(x, y, text, {
        fontFamily: FONT_FAMILY,
        fontSize: `${size}px`,
        color,
        fontStyle: "bold",
        stroke: "#1a1226",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.fx + 2);
    this.scene.tweens.add({
      targets: t,
      y: y - 42,
      alpha: 0,
      duration: 780,
      ease: "Cubic.easeOut",
      onComplete: () => t.destroy(),
    });
  }

  /** 赚钱数字：黄色向上飘（规范十四）。 */
  gain(x: number, y: number, amount: number, size = 20): void {
    this.floatText(x, y - 8, `+${amount}`, "#ffd45c", size);
  }

  /** Buff 数字：绿色向上飘（规范十四）。 */
  buffText(x: number, y: number, text: string): void {
    this.floatText(x, y - 8, text, "#7fd37b", 18);
  }

  /** 失败/扣钱数字：红色向上飘（规范十四）。 */
  loss(x: number, y: number, amount: number): void {
    this.floatText(x, y - 8, `-${amount}`, "#ff6767", 20);
  }

  /** 灵气扩散（规范十五：放置后灵气外扩）。 */
  qiSpread(x: number, y: number): void {
    const ring = this.scene.add
      .image(x, y, "ring")
      .setTint(PALETTE.green)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.3)
      .setAlpha(0.9)
      .setDepth(DEPTH.fx + 1);
    this.scene.tweens.add({
      targets: ring,
      scale: 3.6,
      alpha: 0,
      duration: 480,
      ease: "Cubic.easeOut",
      onComplete: () => ring.destroy(),
    });
    this.sparkle(x, y);
  }

  shake(duration = 140, intensity = 0.004): void {
    this.scene.cameras.main.shake(duration, intensity);
  }
}
