import Phaser from "phaser";
import { DESIGN_HEIGHT, DESIGN_WIDTH } from "../config";
import { FONT_FAMILY, THEME } from "../theme";

/**
 * 预加载场景。MVP 使用程序化占位美术，因此这里主要生成基础纹理
 * （游客圆点、光斑等），并展示加载提示。正式图集接入后置。
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super("Preload");
  }

  preload(): void {
    const cx = DESIGN_WIDTH / 2;
    const cy = DESIGN_HEIGHT / 2;

    this.add
      .text(cx, cy - 40, "修仙游乐园", {
        fontFamily: FONT_FAMILY,
        fontSize: "48px",
        color: THEME.textLight,
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const barW = 420;
    const barBg = this.add.graphics();
    barBg.fillStyle(0x000000, 0.4);
    barBg.fillRoundedRect(cx - barW / 2, cy + 20, barW, 24, 8);
    const bar = this.add.graphics();

    this.load.on("progress", (p: number) => {
      bar.clear();
      bar.fillStyle(THEME.accent, 1);
      bar.fillRoundedRect(cx - barW / 2 + 3, cy + 23, (barW - 6) * p, 18, 6);
    });

    // 目前无外部资源，放一个极小的占位加载以驱动进度事件
    this.load.image(
      "__placeholder",
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    );
  }

  create(): void {
    this.generateTextures();
    this.scene.start("MainMenu");
  }

  private generateTextures(): void {
    // 游客圆点纹理（白色，运行时着色）
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(16, 16, 14);
    g.lineStyle(3, 0x000000, 0.25);
    g.strokeCircle(16, 16, 14);
    g.generateTexture("visitor-dot", 32, 32);
    g.clear();

    // 柔和光斑（用于特效/粒子）
    const glow = this.add.graphics();
    for (let r = 16; r > 0; r--) {
      glow.fillStyle(0xffffff, 0.06);
      glow.fillCircle(16, 16, r);
    }
    glow.generateTexture("glow", 32, 32);
    glow.destroy();
    g.destroy();
  }
}
