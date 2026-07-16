import Phaser from "phaser";
import { DESIGN_HEIGHT, DESIGN_WIDTH } from "../config";
import { PALETTE } from "../theme";

export type BackgroundOptions = {
  top?: number;
  bottom?: number;
  mountains?: boolean;
  motes?: number;
};

/** 氛围背景（软紫 + 玉绿基调）：渐变天空 + 远山剪影 + 漂浮灵气光点。纯装饰。 */
export class Background {
  constructor(scene: Phaser.Scene, opts: BackgroundOptions = {}) {
    const top = opts.top ?? 0x2a2044;
    const bottom = opts.bottom ?? PALETTE.bgAlt;
    const motes = opts.motes ?? 16;

    const sky = scene.add.graphics().setDepth(-20);
    sky.fillGradientStyle(top, top, bottom, bottom, 1);
    sky.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

    // 缥缈灵雾带
    for (let i = 0; i < 3; i++) {
      const band = scene.add
        .image(
          Phaser.Math.Between(200, DESIGN_WIDTH - 200),
          120 + i * 90,
          "glow",
        )
        .setTint(PALETTE.purple)
        .setAlpha(0.06)
        .setScale(22, 5)
        .setDepth(-18);
      scene.tweens.add({
        targets: band,
        x: band.x + Phaser.Math.Between(-120, 120),
        duration: Phaser.Math.Between(9000, 16000),
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }

    if (opts.mountains !== false) this.drawMountains(scene);

    // 漂浮灵气光点
    for (let i = 0; i < motes; i++) {
      const x = Phaser.Math.Between(0, DESIGN_WIDTH);
      const y = Phaser.Math.Between(60, DESIGN_HEIGHT);
      const mote = scene.add
        .image(x, y, "spark")
        .setTint(Phaser.Math.RND.pick([PALETTE.purple, PALETTE.green, PALETTE.gold, PALETTE.blue]))
        .setAlpha(Phaser.Math.FloatBetween(0.15, 0.5))
        .setScale(Phaser.Math.FloatBetween(0.3, 0.8))
        .setDepth(-16)
        .setBlendMode(Phaser.BlendModes.ADD);
      scene.tweens.add({
        targets: mote,
        y: y - Phaser.Math.Between(40, 120),
        duration: Phaser.Math.Between(4000, 9000),
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
        delay: Phaser.Math.Between(0, 3000),
      });
      scene.tweens.add({
        targets: mote,
        alpha: 0.05,
        duration: Phaser.Math.Between(2000, 4000),
        yoyo: true,
        repeat: -1,
      });
    }
  }

  private drawMountains(scene: Phaser.Scene): void {
    const far = scene.add.graphics().setDepth(-17);
    far.fillStyle(0x2a2143, 0.7);
    this.ridge(far, DESIGN_HEIGHT - 70, 150, 6);
    const near = scene.add.graphics().setDepth(-17);
    near.fillStyle(0x1f1836, 0.9);
    this.ridge(near, DESIGN_HEIGHT - 20, 220, 5);
  }

  private ridge(
    g: Phaser.GameObjects.Graphics,
    baseY: number,
    height: number,
    peaks: number,
  ): void {
    const step = DESIGN_WIDTH / peaks;
    g.beginPath();
    g.moveTo(0, baseY);
    for (let i = 0; i <= peaks; i++) {
      const x = i * step;
      const peakY = baseY - height * (0.5 + Phaser.Math.FloatBetween(0, 0.5));
      g.lineTo(x - step / 2, peakY);
      g.lineTo(x, baseY);
    }
    g.lineTo(DESIGN_WIDTH, baseY + 200);
    g.lineTo(0, baseY + 200);
    g.closePath();
    g.fillPath();
  }
}
