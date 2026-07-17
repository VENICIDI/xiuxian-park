import Phaser from "phaser";
import { DESIGN_HEIGHT, DESIGN_WIDTH } from "../config";
import { FONT_FAMILY, THEME } from "../theme";
import { applyHiDpiCamera } from "../hidpi";
import { removeBackground } from "../rendering/chromaKey";
import bgParkUrl from "../../assets/bg-park.png";
import bSwordCoasterUrl from "../../assets/building-sword-coaster.png";
import bXianParkUrl from "../../assets/building-xian-park.png";
import visitorUrl from "../../assets/visitor.png";

/**
 * 需要运行时抠背景的建筑贴图 key（源图为品红/白底、无 alpha 时的兜底）。
 * 正式流程用 `scripts/remove-bg.cjs` 离线抠成透明 PNG，直接加载成品即可，此处留空。
 */
const BUILDING_KEYS_NEED_CHROMAKEY: string[] = [];

/**
 * 预加载场景。MVP 使用程序化占位美术，因此这里主要生成基础纹理
 * （游客圆点、光斑等），并展示加载提示。正式图集接入后置。
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super("Preload");
  }

  preload(): void {
    applyHiDpiCamera(this);
    const cx = DESIGN_WIDTH / 2;
    const cy = DESIGN_HEIGHT / 2;

    this.add
      .text(cx, cy - 40, "修仙游乐园", {
        fontFamily: FONT_FAMILY,
        fontSize: "48px",
        color: THEME.textGold,
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const barW = 420;
    const barBg = this.add.graphics();
    barBg.fillStyle(THEME.bgPanelLight, 1);
    barBg.fillRoundedRect(cx - barW / 2, cy + 20, barW, 24, 12);
    barBg.lineStyle(2, THEME.stroke, THEME.strokeAlpha);
    barBg.strokeRoundedRect(cx - barW / 2, cy + 20, barW, 24, 12);
    const bar = this.add.graphics();

    this.load.on("progress", (p: number) => {
      bar.clear();
      bar.fillStyle(THEME.green, 1);
      bar.fillRoundedRect(cx - barW / 2 + 3, cy + 23, (barW - 6) * p, 18, 8);
    });

    // 场景背景大图（明亮仙境游乐园），驱动加载进度
    this.load.image("bg-park", bgParkUrl);
    // 建筑正式美术（透明底 PNG）；纹理 key 与建筑定义的 sprite 字段对应
    this.load.image("b-sword-coaster", bSwordCoasterUrl);
    // 仙侠游乐园 3D 模型烘焙的等距贴图（2×2 大型建筑，测试用）
    this.load.image("b-xian-park", bXianParkUrl);
    // 游客正式美术（离线抠透明底 PNG），覆盖程序化占位小人
    this.load.image("visitor", visitorUrl);
  }

  create(): void {
    this.generateTextures();
    // 白底建筑贴图去背，生成透明纹理（正式透明 PNG 资产接入后可移除对应 key）
    for (const key of BUILDING_KEYS_NEED_CHROMAKEY) {
      if (this.textures.exists(key)) removeBackground(this, key);
    }
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
