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

    // 路线中心连线（表示游客行走方向）
    g.lineStyle(8, 0x5b7fb8, 0.55);
    g.beginPath();
    ROUTE.forEach((cellIndex, i) => {
      const c = cellCenter(cellIndex);
      if (i === 0) g.moveTo(c.x, c.y);
      else g.lineTo(c.x, c.y);
    });
    g.strokePath();

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
    const container = this.scene.add.container(cx, cy);

    const body = this.scene.add.graphics();
    body.fillStyle(RARITY_COLOR[def.rarity], 1);
    body.fillRoundedRect(-bw / 2 - 2, -bh / 2 - 2, bw + 4, bh + 4, 10);
    body.fillStyle(def.color, 1);
    body.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 8);
    body.fillStyle(0xffffff, 0.12);
    body.fillRoundedRect(-bw / 2, -bh / 2, bw, Math.min(bh / 3, 24), 8);
    container.add(body);

    const glyph = this.categoryGlyph(def.category);
    const glyphText = this.scene.add
      .text(0, -12, glyph, { fontFamily: FONT_FAMILY, fontSize: "26px" })
      .setOrigin(0.5);
    container.add(glyphText);

    const name = this.scene.add
      .text(0, 18, def.name, {
        fontFamily: FONT_FAMILY,
        fontSize: "12px",
        color: "#1a1226",
        fontStyle: "bold",
        align: "center",
        wordWrap: { width: bw - 6 },
      })
      .setOrigin(0.5);
    container.add(name);

    // 等级点
    for (let l = 0; l < inst.level; l++) {
      const pip = this.scene.add.graphics();
      pip.fillStyle(0xffd54f, 1);
      pip.fillCircle(-bw / 2 + 8 + l * 10, bh / 2 - 8, 3.5);
      container.add(pip);
    }

    this.buildingLayer.add(container);
    this.sprites.set(index, container);
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
