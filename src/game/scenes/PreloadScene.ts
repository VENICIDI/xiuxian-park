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
    const g = this.add.graphics();

    // 游客圆点（保留兼容）
    g.fillStyle(0xffffff, 1);
    g.fillCircle(16, 16, 14);
    g.generateTexture("visitor-dot", 32, 32);
    g.clear();

    // 游客小人（白色便于着色）：头 + 斗篷身体
    // 画布 28×36，锚点用中心
    g.fillStyle(0xffffff, 1);
    // 身体（斗篷，梯形）
    g.beginPath();
    g.moveTo(14, 12);
    g.lineTo(22, 33);
    g.lineTo(6, 33);
    g.closePath();
    g.fillPath();
    // 头
    g.fillCircle(14, 9, 6);
    // 顶部高光
    g.fillStyle(0xffffff, 0.5);
    g.fillCircle(12, 7, 2.2);
    g.generateTexture("person", 28, 36);
    g.clear();

    // 阴影（椭圆）
    g.fillStyle(0x000000, 1);
    g.fillEllipse(16, 8, 26, 12);
    g.generateTexture("shadow", 32, 16);
    g.clear();

    // 金币
    g.fillStyle(0xffca28, 1);
    g.fillCircle(9, 9, 8);
    g.fillStyle(0xffe082, 1);
    g.fillCircle(9, 9, 5);
    g.fillStyle(0xff8f00, 1);
    g.fillRect(7.5, 5, 3, 8);
    g.generateTexture("coin", 18, 18);
    g.clear();

    // 星花（四角星）
    g.fillStyle(0xffffff, 1);
    g.beginPath();
    g.moveTo(8, 0);
    g.lineTo(10, 6);
    g.lineTo(16, 8);
    g.lineTo(10, 10);
    g.lineTo(8, 16);
    g.lineTo(6, 10);
    g.lineTo(0, 8);
    g.lineTo(6, 6);
    g.closePath();
    g.fillPath();
    g.generateTexture("spark", 16, 16);
    g.clear();

    // 光环（环形）
    g.lineStyle(3, 0xffffff, 1);
    g.strokeCircle(20, 20, 17);
    g.generateTexture("ring", 40, 40);
    g.clear();

    // 柔和烟雾/光斑
    const glow = this.add.graphics();
    for (let r = 16; r > 0; r--) {
      glow.fillStyle(0xffffff, 0.05);
      glow.fillCircle(16, 16, r);
    }
    glow.generateTexture("glow", 32, 32);
    glow.generateTexture("smoke", 32, 32);
    glow.destroy();
    g.destroy();
  }
}
