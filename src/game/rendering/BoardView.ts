import Phaser from "phaser";
import { BOARD_SIZE, GRID_HEIGHT, GRID_WIDTH } from "../config";
import { getBuildingDef } from "../data/buildings";
import { RARITY_COLOR, effectiveSize } from "../models/building";
import type { BuildingDefinition, BuildingInstance } from "../models/building";
import type { GameState } from "../models/game-state";
import { DEPTH, FONT_FAMILY, THEME } from "../theme";
import { ENTRANCE_INDEX, EXIT_INDEX, ROUTE, isRoad } from "../systems/route";
import {
  HALF_H,
  HALF_W,
  cellCenter,
  cellDiamond,
  footprintDiamond,
  isoCorner,
  type Pt,
} from "./layout";

/** 45° 等距棋盘与 3D 建筑的渲染层（草地 + 立体建筑）。 */
export class BoardView {
  private scene: Phaser.Scene;
  private gridGfx: Phaser.GameObjects.Graphics;
  private highlightGfx: Phaser.GameObjects.Graphics;
  private overlayGfx: Phaser.GameObjects.Graphics;
  private sprites = new Map<number, Phaser.GameObjects.Container>();
  private buildingContainers: Phaser.GameObjects.Container[] = [];
  private seen = new Set<string>();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.gridGfx = scene.add.graphics().setDepth(DEPTH.board);
    // 高亮/预览需盖在建筑（等距深度最高约 24）之上、HUD（40）之下
    this.overlayGfx = scene.add.graphics().setDepth(27);
    this.highlightGfx = scene.add.graphics().setDepth(28);
    this.drawGrid();
  }

  // ————————————————— 地面 —————————————————
  private drawGrid(): void {
    const g = this.gridGfx;
    g.clear();

    // 整块园区底板（带厚度的浮空石台）——制造强烈立体感
    this.drawBaseSlab(g);

    for (let i = 0; i < BOARD_SIZE; i++) {
      const gx = i % GRID_WIDTH;
      const gy = Math.floor(i / GRID_WIDTH);
      const even = (gx + gy) % 2 === 0;
      const d = cellDiamond(i);
      if (isRoad(i)) {
        this.fillDiamond(g, d, THEME.road, 1);
        this.bevelDiamond(g, d, 0.1, 0.14);
        this.strokeDiamond(g, d, THEME.roadEdge, 0.6, 1);
      } else {
        this.fillDiamond(g, d, this.grassColor(i, even), 1);
        // 立体感：上边缘提亮、下边缘压暗（避免地块过于平面）
        this.bevelDiamond(g, d, 0.16, 0.2);
      }
    }

    // 底板顶面外缘描一圈（半透明白，规范：不用纯白）
    const outer = {
      top: isoCorner(0, 0),
      right: isoCorner(GRID_WIDTH, 0),
      bottom: isoCorner(GRID_WIDTH, GRID_HEIGHT),
      left: isoCorner(0, GRID_HEIGHT),
    };
    this.strokeDiamond(g, outer, THEME.stroke, THEME.strokeAlpha, 2);

    // 路线连线（浅色石板路的连贯高光）
    const strokeRoute = (width: number, color: number, alpha: number) => {
      g.lineStyle(width, color, alpha);
      g.beginPath();
      ROUTE.forEach((cellIndex, i) => {
        const c = cellCenter(cellIndex);
        if (i === 0) g.moveTo(c.x, c.y);
        else g.lineTo(c.x, c.y);
      });
      g.strokePath();
    };
    // 连贯石板飘带：落地软阴影 → 石板边 → 石板面 → 中线高光
    strokeRoute(30, 0x1c2a14, 0.14);
    strokeRoute(24, THEME.roadEdge, 0.85);
    strokeRoute(16, THEME.road, 1);
    strokeRoute(4, 0xfff6df, 0.55);

    this.drawMarker(ENTRANCE_INDEX, THEME.green, "入口");
    this.drawMarker(EXIT_INDEX, THEME.red, "出口");
  }

  /** 园区底板：在地面菱形下方拉出两片侧壁，形成厚土台。 */
  private drawBaseSlab(g: Phaser.GameObjects.Graphics): void {
    const D = 54; // 底板厚度
    const right = isoCorner(GRID_WIDTH, 0);
    const bottom = isoCorner(GRID_WIDTH, GRID_HEIGHT);
    const left = isoCorner(0, GRID_HEIGHT);
    const down = (p: Pt): Pt => ({ x: p.x, y: p.y + D });

    // 左前侧壁（西南面，较暗——泥土色）
    g.fillStyle(0x4a3a2a, 1);
    this.poly(g, [left, bottom, down(bottom), down(left)]);
    // 右前侧壁（东南面，稍亮）
    g.fillStyle(0x5c4a34, 1);
    this.poly(g, [bottom, right, down(right), down(bottom)]);
    // 底缘描边
    g.lineStyle(2, 0x2f2418, 0.9);
    g.beginPath();
    g.moveTo(down(left).x, down(left).y);
    g.lineTo(down(bottom).x, down(bottom).y);
    g.lineTo(down(right).x, down(right).y);
    g.strokePath();
    // 侧壁竖棱
    g.lineStyle(1.5, 0x2f2418, 0.7);
    g.beginPath();
    g.moveTo(bottom.x, bottom.y);
    g.lineTo(down(bottom).x, down(bottom).y);
    g.strokePath();
  }

  /** 确定性地为每格挑选草色：以棋盘格底色为主，约 25% 换成亮/深变体。 */
  private grassColor(index: number, even: boolean): number {
    const h = Math.imul(index + 1, 2654435761) >>> 0;
    const r = h % 100;
    if (r < 13) return THEME.grassC;
    if (r < 25) return THEME.grassD;
    return even ? THEME.grassA : THEME.grassB;
  }

  /** 地块斜面立体感：沿上两条边描亮、下两条边描暗。 */
  private bevelDiamond(
    g: Phaser.GameObjects.Graphics,
    d: { top: Pt; right: Pt; bottom: Pt; left: Pt },
    hiAlpha: number,
    loAlpha: number,
  ): void {
    // 上边缘（左→上→右）提亮
    g.lineStyle(2, THEME.grassHi, hiAlpha);
    g.beginPath();
    g.moveTo(d.left.x, d.left.y);
    g.lineTo(d.top.x, d.top.y);
    g.lineTo(d.right.x, d.right.y);
    g.strokePath();
    // 下边缘（左→下→右）压暗
    g.lineStyle(2, THEME.grassLo, loAlpha);
    g.beginPath();
    g.moveTo(d.left.x, d.left.y);
    g.lineTo(d.bottom.x, d.bottom.y);
    g.lineTo(d.right.x, d.right.y);
    g.strokePath();
  }

  private diamondPath(
    g: Phaser.GameObjects.Graphics,
    d: { top: Pt; right: Pt; bottom: Pt; left: Pt },
  ): void {
    g.beginPath();
    g.moveTo(d.top.x, d.top.y);
    g.lineTo(d.right.x, d.right.y);
    g.lineTo(d.bottom.x, d.bottom.y);
    g.lineTo(d.left.x, d.left.y);
    g.closePath();
  }

  private fillDiamond(
    g: Phaser.GameObjects.Graphics,
    d: { top: Pt; right: Pt; bottom: Pt; left: Pt },
    color: number,
    alpha: number,
  ): void {
    g.fillStyle(color, alpha);
    this.diamondPath(g, d);
    g.fillPath();
  }

  private strokeDiamond(
    g: Phaser.GameObjects.Graphics,
    d: { top: Pt; right: Pt; bottom: Pt; left: Pt },
    color: number,
    alpha: number,
    width: number,
  ): void {
    g.lineStyle(width, color, alpha);
    this.diamondPath(g, d);
    g.strokePath();
  }

  private drawMarker(index: number, color: number, label: string): void {
    const c = cellCenter(index);
    const d = cellDiamond(index);
    this.fillDiamond(this.gridGfx, d, color, 0.4);
    this.strokeDiamond(this.gridGfx, d, color, 0.9, 2);
    this.scene.add
      .text(c.x, c.y - 6, label, {
        fontFamily: FONT_FAMILY,
        fontSize: "12px",
        color: THEME.textLight,
        fontStyle: "bold",
        stroke: "#241b3a",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(2);
  }

  // ————————————————— 建筑 —————————————————
  refresh(state: GameState): void {
    for (const c of this.buildingContainers) c.destroy();
    this.buildingContainers = [];
    this.sprites.clear();
    // 后→前顺序创建（深度亦按秩设置，双保险）
    for (let i = 0; i < BOARD_SIZE; i++) {
      const inst = state.board[i];
      if (inst) this.createBuildingSprite(i, inst);
    }
  }

  private buildingHeight(def: BuildingDefinition): number {
    switch (def.category) {
      case "ride":
        return 96;
      case "shop":
        return 74;
      case "buff":
        return 58;
      default:
        return 70;
    }
  }

  private createBuildingSprite(index: number, inst: BuildingInstance): void {
    const def = getBuildingDef(inst.definitionId);
    const eff = effectiveSize(def, inst.rotation ?? 0);
    const gx = index % GRID_WIDTH;
    const gy = Math.floor(index / GRID_WIDTH);
    const fp = footprintDiamond(gx, gy, eff.w, eff.h);
    const center = fp.center;
    const disabled = (inst.disabledDays ?? 0) > 0;
    const H = this.buildingHeight(def) + (inst.level - 1) * 8;

    const rel = (p: Pt): Pt => ({ x: p.x - center.x, y: p.y - center.y });
    const back = rel(fp.back);
    const right = rel(fp.right);
    const front = rel(fp.front);
    const left = rel(fp.left);
    const up = (p: Pt): Pt => ({ x: p.x, y: p.y - H });
    const rBack = up(back);
    const rRight = up(right);
    const rFront = up(front);
    const rLeft = up(left);

    const container = this.scene.add.container(center.x, center.y);

    // 接地阴影
    const shadow = this.scene.add.graphics();
    shadow.fillStyle(0x000000, 0.25);
    this.poly(shadow, [back, right, front, left]);
    container.add(shadow);

    const rarityColor = RARITY_COLOR[def.rarity];
    const useArt = !!def.sprite && this.scene.textures.exists(def.sprite);
    const groundW = (eff.w + eff.h) * HALF_W;
    // idle 微动的目标：真图用整张贴图，占位用屋顶 emoji
    let bob: Phaser.GameObjects.Image | Phaser.GameObjects.Text | undefined;

    if (useArt) {
      // 贴图已在离线阶段裁剪到不透明内容边界（无透明留白），因此 setOrigin(0.5, 1) 恰为
      // “内容底边中心”，无需再对透明留白做补偿（要求 6：留白已消除）。
      // 底边中心锚点直接放在容器原点 (0,0) —— 即占地菱形的地面中心 center —— 不加任何竖直偏移，
      // 于是建筑底部正好坐在地面上，无悬空间隙（要求 1/2/3/5/7）。
      const ART_WIDTH_SCALE = 1.0;
      const ART_ANGLE = 20; // 顺时针轻微旋转（绕底边中心，不改变接地点）；需完全平放设为 0
      const flipped = ((inst.rotation ?? 0) & 1) === 1;

      // 接地投影：与底边中心重合，落在地面锚点正下方，强化“踩地”接触感
      const contact = this.scene.add
        .image(0, 0, "shadow")
        .setTint(0x000000)
        .setAlpha(0.45);
      contact.setDisplaySize(groundW * 0.9, groundW * 0.9 * 0.4);
      container.add(contact);

      const img = this.scene.add
        .image(0, 0, def.sprite as string)
        .setOrigin(0.5, 1); // 底边中心为锚点（要求 2/3）
      img.setScale((groundW * ART_WIDTH_SCALE) / img.width);
      // 等距下 1×2（竖）= 2×1（横）的水平镜像：奇数朝向翻转贴图以贴合另一条对角线
      if (flipped) img.setFlipX(true);
      img.setAngle(flipped ? -ART_ANGLE : ART_ANGLE);
      if (disabled) img.setTint(0x888888);
      container.add(img);
      bob = img;
    } else {
      const roofColor = this.lighten(def.color, 0.22);
      const leftColor = this.lighten(def.color, -0.44);
      const rightColor = this.lighten(def.color, -0.22);
      const edgeColor = this.lighten(def.color, -0.55);

      const box = this.scene.add.graphics();
      // 左侧墙面（西南面，最暗）
      box.fillStyle(leftColor, 1);
      this.poly(box, [left, front, rFront, rLeft]);
      // 右侧墙面（东南面，中等）
      box.fillStyle(rightColor, 1);
      this.poly(box, [front, right, rRight, rFront]);
      // 屋顶（最亮）
      box.fillStyle(roofColor, 1);
      this.poly(box, [rBack, rRight, rFront, rLeft]);
      // 竖直棱边（左/前/右），强化体块
      box.lineStyle(1.5, edgeColor, 0.7);
      box.beginPath();
      box.moveTo(left.x, left.y);
      box.lineTo(rLeft.x, rLeft.y);
      box.moveTo(front.x, front.y);
      box.lineTo(rFront.x, rFront.y);
      box.moveTo(right.x, right.y);
      box.lineTo(rRight.x, rRight.y);
      box.strokePath();
      // 底边棱线
      box.beginPath();
      box.moveTo(left.x, left.y);
      box.lineTo(front.x, front.y);
      box.lineTo(right.x, right.y);
      box.strokePath();
      // 屋顶品质描边（规范：品质决定描边色）
      box.lineStyle(2.5, rarityColor, 0.95);
      this.strokePoly(box, [rBack, rRight, rFront, rLeft]);
      container.add(box);
    }

    // 品质发光（稀有及以上）
    if (def.rarity === "rare" || def.rarity === "epic" || def.rarity === "legendary") {
      const halo = this.scene.add
        .image(0, -H, "glow")
        .setTint(rarityColor)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(2.2)
        .setAlpha(0.3);
      container.add(halo);
      this.scene.tweens.add({
        targets: halo,
        alpha: 0.12,
        duration: 1100,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }

    // 图标（屋顶中心上方）——仅程序化占位时显示，真图不叠加 emoji
    if (!useArt) {
      const glyph = this.categoryGlyph(def.category);
      const glyphText = this.scene.add
        .text(0, -H - 4, glyph, { fontFamily: FONT_FAMILY, fontSize: "24px" })
        .setOrigin(0.5);
      container.add(glyphText);
      bob = glyphText;
    }

    // 名称（真图放到地砖前沿下方，避免遮挡建筑主体）
    const nameY = useArt ? HALF_H + 8 : -H + 15;
    const name = this.scene.add
      .text(0, nameY, def.name, {
        fontFamily: FONT_FAMILY,
        fontSize: "11px",
        color: "#ffffff",
        fontStyle: "bold",
        align: "center",
        stroke: "#241b3a",
        strokeThickness: 3,
        wordWrap: { width: eff.w * 80 },
      })
      .setOrigin(0.5);
    container.add(name);

    // 等级星
    const stars = this.scene.add
      .text(rLeft.x + 6, rLeft.y - 2, "★".repeat(inst.level), {
        fontFamily: FONT_FAMILY,
        fontSize: "11px",
        color: "#ffd45c",
        stroke: "#241b3a",
        strokeThickness: 2,
      })
      .setOrigin(0, 1);
    container.add(stars);

    if (disabled) {
      container.setAlpha(0.55);
      const tag = this.scene.add
        .text(0, -H, "停业", {
          fontFamily: FONT_FAMILY,
          fontSize: "15px",
          color: THEME.danger,
          fontStyle: "bold",
          stroke: "#241b3a",
          strokeThickness: 4,
        })
        .setOrigin(0.5);
      container.add(tag);
    }

    // 深度按精灵底边中心的世界 Y 排序（要求 8）：Y 越大＝越靠近相机 → 深度越高 → 正确遮挡后方物体。
    // 系数很小以将全部建筑压在 board(0) 与 highlight(15) 之间，同时保留逐行前后顺序。
    container.setDepth(DEPTH.building + center.y * 0.002);

    this.buildingContainers.push(container);
    this.sprites.set(index, container);

    // idle 微动
    if (!disabled && bob) {
      if (def.category === "ride") {
        this.scene.tweens.add({
          targets: bob,
          y: bob.y - 3,
          duration: 900 + Math.random() * 400,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      } else if (def.category === "buff") {
        this.scene.tweens.add({
          targets: bob,
          scale: bob.scale * 1.06,
          angle: 3,
          duration: 1400,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      }
    }

    // 新建筑弹入 POP（规范十五：0.8 → 1.05 → 1）
    if (!this.seen.has(inst.instanceId)) {
      this.seen.add(inst.instanceId);
      container.setScale(0.8);
      container.setAlpha(disabled ? 0 : 0.3);
      this.scene.tweens.add({
        targets: container,
        scale: 1.05,
        alpha: disabled ? 0.55 : 1,
        duration: 180,
        ease: "Quad.easeOut",
        onComplete: () => {
          this.scene.tweens.add({
            targets: container,
            scale: 1,
            duration: 120,
            ease: "Quad.easeInOut",
          });
        },
      });
    }
  }

  private poly(g: Phaser.GameObjects.Graphics, pts: Pt[]): void {
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.closePath();
    g.fillPath();
  }

  private strokePoly(g: Phaser.GameObjects.Graphics, pts: Pt[]): void {
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.closePath();
    g.strokePath();
  }

  private lighten(color: number, amount: number): number {
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;
    const adj = (v: number) =>
      Math.max(0, Math.min(255, Math.round(v + amount * 255)));
    return (adj(r) << 16) | (adj(g) << 8) | adj(b);
  }

  private categoryGlyph(cat: string): string {
    switch (cat) {
      case "ride":
        return "🎢";
      case "shop":
        return "🛍";
      case "buff":
        return "✨";
      default:
        return "⚙";
    }
  }

  getSpriteContainer(index: number): Phaser.GameObjects.Container | undefined {
    return this.sprites.get(index);
  }

  // ————————————————— 预览 / 高亮 —————————————————
  showPlacementPreview(index: number, valid: boolean): void {
    this.showFootprintPreview(index >= 0 ? [index] : null, valid, index);
  }

  showFootprintPreview(
    cells: number[] | null,
    valid: boolean,
    anchorForOOB: number,
  ): void {
    this.highlightGfx.clear();
    const g = this.highlightGfx;
    // 可放置=灵气青（区别于草地绿）；不可放置=红。均叠深色分隔描边拉开与草地的对比。
    const fill = valid ? THEME.placeValid : THEME.invalidRed;
    const edge = valid ? THEME.placeValidEdge : THEME.invalidRedEdge;
    const shade = valid ? THEME.placeValidShade : THEME.invalidRedShade;
    const draw = (index: number) => {
      const d = cellDiamond(index);
      this.fillDiamond(g, d, fill, 0.36);
      this.strokeDiamond(g, d, shade, 0.6, 4);
      this.strokeDiamond(g, d, edge, 1, 2.5);
    };
    if (!cells) {
      if (anchorForOOB >= 0) draw(anchorForOOB);
      return;
    }
    for (const c of cells) draw(c);
  }

  clearHighlight(): void {
    this.highlightGfx.clear();
  }

  showAdjacency(index: number, neighborIndices: number[]): void {
    this.overlayGfx.clear();
    if (index < 0) return;
    for (const n of neighborIndices) {
      const d = cellDiamond(n);
      this.strokeDiamond(this.overlayGfx, d, THEME.accent, 0.8, 2);
    }
  }

  clearOverlay(): void {
    this.overlayGfx.clear();
  }

  showSelection(index: number): void {
    this.overlayGfx.clear();
    if (index < 0) return;
    const d = cellDiamond(index);
    this.strokeDiamond(this.overlayGfx, d, THEME.gold, 1, 3);
  }
}
