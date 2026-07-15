import Phaser from "phaser";
import { BOARD_SIZE, GRID_HEIGHT, GRID_WIDTH } from "../config";
import { getBuildingDef } from "../data/buildings";
import { RARITY_COLOR, effectiveSize } from "../models/building";
import type { BuildingInstance } from "../models/building";
import type { GameState } from "../models/game-state";
import { DEPTH, FONT_FAMILY, THEME } from "../theme";
import { ENTRANCE_INDEX, EXIT_INDEX, ROUTE, isRoad } from "../systems/route";
import {
  BOARD_X,
  BOARD_Y,
  TILE_DISPLAY,
  cellCenter,
  cellTopLeft,
} from "./layout";

/** 棋盘与建筑的渲染层。 */
export class BoardView {
  private scene: Phaser.Scene;
  private gridGfx: Phaser.GameObjects.Graphics;
  private highlightGfx: Phaser.GameObjects.Graphics;
  private overlayGfx: Phaser.GameObjects.Graphics;
  private buildingLayer: Phaser.GameObjects.Container;
  private sprites = new Map<number, Phaser.GameObjects.Container>();
  private seen = new Set<string>();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.gridGfx = scene.add.graphics().setDepth(DEPTH.board);
    this.overlayGfx = scene.add.graphics().setDepth(DEPTH.board + 1);
    this.highlightGfx = scene.add.graphics().setDepth(DEPTH.highlight);
    this.buildingLayer = scene.add.container(0, 0).setDepth(DEPTH.building);
    this.drawGrid();
  }

  private drawGrid(): void {
    const g = this.gridGfx;
    g.clear();
    // 外框
    g.fillStyle(0x000000, 0.3);
    g.fillRoundedRect(
      BOARD_X - 8,
      BOARD_Y - 8,
      GRID_WIDTH * TILE_DISPLAY + 16,
      GRID_HEIGHT * TILE_DISPLAY + 16,
      12,
    );

    for (let i = 0; i < BOARD_SIZE; i++) {
      const { x, y } = cellTopLeft(i);
      const gx = i % GRID_WIDTH;
      const gy = Math.floor(i / GRID_WIDTH);
      const even = (gx + gy) % 2 === 0;
      if (isRoad(i)) {
        // 道路格：不可放置，用醒目的道路配色
        g.fillStyle(THEME.road, 1);
        g.fillRect(x + 1, y + 1, TILE_DISPLAY - 2, TILE_DISPLAY - 2);
        g.lineStyle(1, 0x6a8bc0, 0.5);
        g.strokeRect(x + 1, y + 1, TILE_DISPLAY - 2, TILE_DISPLAY - 2);
      } else {
        // 可建造空地
        g.fillStyle(even ? THEME.tileEven : THEME.tileOdd, 1);
        g.fillRect(x + 1, y + 1, TILE_DISPLAY - 2, TILE_DISPLAY - 2);
        g.lineStyle(1, THEME.gridLine, 0.5);
        g.strokeRect(x + 1, y + 1, TILE_DISPLAY - 2, TILE_DISPLAY - 2);
      }
    }

    // 路线中心连线（表示游客行走方向）：外发光 + 亮线
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
    strokeRoute(16, 0x5b7fb8, 0.2);
    strokeRoute(8, 0x7fa5df, 0.55);
    strokeRoute(3, 0xcfe0ff, 0.7);

    // 路线方向箭头（沿道路每隔几格）
    g.fillStyle(0xcfe0ff, 0.5);
    for (let i = 0; i < ROUTE.length - 1; i += 2) {
      const a = cellCenter(ROUTE[i]);
      const b = cellCenter(ROUTE[i + 1]);
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      g.fillCircle(mx, my, 3);
    }

    this.drawMarker(ENTRANCE_INDEX, THEME.entrance, "入口");
    this.drawMarker(EXIT_INDEX, THEME.exit, "出口");
  }

  private drawMarker(index: number, color: number, label: string): void {
    const c = cellCenter(index);
    this.gridGfx.fillStyle(color, 0.5);
    this.gridGfx.fillCircle(c.x, c.y, 14);
    this.scene.add
      .text(c.x, c.y, label, {
        fontFamily: FONT_FAMILY,
        fontSize: "12px",
        color: THEME.textLight,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.board + 2);
  }

  /** 全量重建建筑精灵。 */
  refresh(state: GameState): void {
    this.buildingLayer.removeAll(true);
    this.sprites.clear();
    for (let i = 0; i < BOARD_SIZE; i++) {
      const inst = state.board[i];
      if (inst) this.createBuildingSprite(i, inst);
    }
  }

  private createBuildingSprite(index: number, inst: BuildingInstance): void {
    const def = getBuildingDef(inst.definitionId);
    const eff = effectiveSize(def, inst.rotation ?? 0);
    const tl = cellTopLeft(index);
    const rectW = eff.w * TILE_DISPLAY;
    const rectH = eff.h * TILE_DISPLAY;
    const bw = rectW - 12;
    const bh = rectH - 12;
    const cx = tl.x + rectW / 2;
    const cy = tl.y + rectH / 2;
    const disabled = (inst.disabledDays ?? 0) > 0;
    const rarityColor = RARITY_COLOR[def.rarity];
    const container = this.scene.add.container(cx, cy);

    // 落地阴影
    const shadow = this.scene.add.graphics();
    shadow.fillStyle(0x000000, 0.28);
    shadow.fillEllipse(0, bh / 2 + 2, bw * 0.86, 16);
    container.add(shadow);

    // 品质外发光（宝品及以上）
    if (def.rarity === "rare" || def.rarity === "epic" || def.rarity === "legendary") {
      const halo = this.scene.add
        .image(0, 0, "glow")
        .setTint(rarityColor)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(bw / 26, bh / 26)
        .setAlpha(0.32);
      container.add(halo);
      this.scene.tweens.add({
        targets: halo,
        alpha: 0.14,
        duration: 1100,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }

    const body = this.scene.add.graphics();
    // 品质描边
    body.fillStyle(rarityColor, 1);
    body.fillRoundedRect(-bw / 2 - 3, -bh / 2 - 3, bw + 6, bh + 6, 12);
    // 主体：下半深色打底，上半浅色叠加，形成上浅下深的立体感
    body.fillStyle(this.lighten(def.color, -0.2), 1);
    body.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 9);
    body.fillStyle(this.lighten(def.color, 0.12), 1);
    body.fillRoundedRect(-bw / 2, -bh / 2, bw, bh * 0.55, 9);
    // 顶部高光带
    body.fillStyle(0xffffff, 0.18);
    body.fillRoundedRect(-bw / 2 + 3, -bh / 2 + 3, bw - 6, Math.min(bh / 3, 22), 7);
    container.add(body);

    // 图标底座 + 图标
    const badge = this.scene.add.graphics();
    badge.fillStyle(0x1a1226, 0.28);
    badge.fillCircle(0, -bh / 6, 20);
    container.add(badge);
    const glyph = this.categoryGlyph(def.category);
    const glyphText = this.scene.add
      .text(0, -bh / 6, glyph, { fontFamily: FONT_FAMILY, fontSize: "26px" })
      .setOrigin(0.5);
    container.add(glyphText);

    const name = this.scene.add
      .text(0, bh / 2 - 20, def.name, {
        fontFamily: FONT_FAMILY,
        fontSize: "12px",
        color: "#faf6ff",
        fontStyle: "bold",
        align: "center",
        stroke: "#1a1226",
        strokeThickness: 3,
        wordWrap: { width: bw - 6 },
      })
      .setOrigin(0.5);
    container.add(name);

    // 等级星
    const stars = this.scene.add
      .text(-bw / 2 + 6, -bh / 2 + 4, "★".repeat(inst.level), {
        fontFamily: FONT_FAMILY,
        fontSize: "12px",
        color: "#ffd54f",
      })
      .setOrigin(0, 0);
    container.add(stars);

    // 停业遮罩
    if (disabled) {
      container.setAlpha(0.55);
      const tag = this.scene.add
        .text(0, 0, "停业", {
          fontFamily: FONT_FAMILY,
          fontSize: "16px",
          color: "#ff6b81",
          fontStyle: "bold",
          stroke: "#1a1226",
          strokeThickness: 4,
        })
        .setOrigin(0.5);
      container.add(tag);
    }

    this.buildingLayer.add(container);
    this.sprites.set(index, container);

    // idle 微动：游乐设施轻微上下浮动，增益建筑呼吸缩放
    if (!disabled) {
      if (def.category === "ride") {
        this.scene.tweens.add({
          targets: glyphText,
          y: glyphText.y - 3,
          duration: 900 + Math.random() * 400,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      } else if (def.category === "buff") {
        this.scene.tweens.add({
          targets: glyphText,
          scale: 1.15,
          angle: 8,
          duration: 1400,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      }
    }

    // 新建筑弹入
    if (!this.seen.has(inst.instanceId)) {
      this.seen.add(inst.instanceId);
      container.setScale(0.4);
      container.setAlpha(disabled ? 0 : 0.2);
      this.scene.tweens.add({
        targets: container,
        scale: 1,
        alpha: disabled ? 0.55 : 1,
        duration: 320,
        ease: "Back.easeOut",
      });
    }
  }

  /** 颜色明暗调整，amount ∈ [-1,1]。 */
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
        return "✦";
      default:
        return "⚙";
    }
  }

  getSpriteContainer(index: number): Phaser.GameObjects.Container | undefined {
    return this.sprites.get(index);
  }

  /** 放置预览高亮（单格）。 */
  showPlacementPreview(index: number, valid: boolean): void {
    this.showFootprintPreview(index >= 0 ? [index] : null, valid, index);
  }

  /**
   * 多格占地放置预览。cells 为 null 表示越界（在 anchor 处画一个非法格）。
   */
  showFootprintPreview(
    cells: number[] | null,
    valid: boolean,
    anchorForOOB: number,
  ): void {
    this.highlightGfx.clear();
    const color = valid ? THEME.validGreen : THEME.invalidRed;
    const draw = (index: number) => {
      const { x, y } = cellTopLeft(index);
      this.highlightGfx.fillStyle(color, 0.3);
      this.highlightGfx.fillRect(x + 1, y + 1, TILE_DISPLAY - 2, TILE_DISPLAY - 2);
      this.highlightGfx.lineStyle(3, color, 0.9);
      this.highlightGfx.strokeRect(x + 2, y + 2, TILE_DISPLAY - 4, TILE_DISPLAY - 4);
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

  /** 高亮某格四邻（放置/选中时展示影响范围）。 */
  showAdjacency(index: number, neighborIndices: number[]): void {
    this.overlayGfx.clear();
    if (index < 0) return;
    for (const n of neighborIndices) {
      const { x, y } = cellTopLeft(n);
      this.overlayGfx.lineStyle(2, THEME.accent, 0.8);
      this.overlayGfx.strokeRect(x + 4, y + 4, TILE_DISPLAY - 8, TILE_DISPLAY - 8);
    }
  }

  clearOverlay(): void {
    this.overlayGfx.clear();
  }

  /** 选中框。 */
  showSelection(index: number): void {
    this.overlayGfx.clear();
    if (index < 0) return;
    const { x, y } = cellTopLeft(index);
    this.overlayGfx.lineStyle(3, 0xffd54f, 1);
    this.overlayGfx.strokeRect(x + 2, y + 2, TILE_DISPLAY - 4, TILE_DISPLAY - 4);
  }
}
