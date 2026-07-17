import Phaser from "phaser";
import { DESIGN_HEIGHT, DESIGN_WIDTH } from "../game/config";
import { DEPTH, FONT_FAMILY, THEME } from "../game/theme";
import { GUIDE_PAGES } from "../game/data/guide-pages";
import { fantasyPanel, medallion, SKIN } from "./skin";

const PANEL_W = 760;
const PANEL_H = 508;

/**
 * 原神/星铁风格的分页玩法说明弹窗。
 * 每页：图标章 + 标题 + 副标题 + 要点正文；左右箭头翻页，圆点指示器，
 * 支持键盘 ←/→ 翻页与 ESC 关闭。
 */
export class GuidePanel {
  private scene: Phaser.Scene;
  /** 常驻元素（底板 / 箭头 / 关闭 / 提示）。 */
  private frame: Phaser.GameObjects.Group;
  /** 每页刷新的内容元素。 */
  private content: Phaser.GameObjects.Group;
  private index = 0;
  private visible = false;
  private onClose?: () => void;

  private prevArc?: Phaser.GameObjects.Arc;
  private prevLabel?: Phaser.GameObjects.Text;
  private nextArc?: Phaser.GameObjects.Arc;
  private nextLabel?: Phaser.GameObjects.Text;

  private keyHandler?: (e: KeyboardEvent) => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.frame = scene.add.group();
    this.content = scene.add.group();
  }

  isOpen(): boolean {
    return this.visible;
  }

  open(onClose?: () => void): void {
    if (this.visible) return;
    this.visible = true;
    this.index = 0;
    this.onClose = onClose;

    const cx = DESIGN_WIDTH / 2;
    const cy = DESIGN_HEIGHT / 2;
    const left = cx - PANEL_W / 2;
    const top = cy - PANEL_H / 2;

    // 遮罩
    const overlay = this.scene.add
      .rectangle(cx, cy, DESIGN_WIDTH, DESIGN_HEIGHT, 0x000000, 0.66)
      .setDepth(DEPTH.modal)
      .setInteractive();
    overlay.on("pointerdown", () => this.close());
    this.frame.add(overlay);

    // 仙侠玉牌底板
    const panel = this.scene.add.graphics().setDepth(DEPTH.modal + 1);
    fantasyPanel(panel, left, top, PANEL_W, PANEL_H, { radius: 22 });
    this.frame.add(panel);

    // 顶部标签「玩法说明」
    const header = this.scene.add
      .text(cx, top + 30, "◈  玩法说明  ◈", {
        fontFamily: FONT_FAMILY,
        fontSize: "20px",
        color: SKIN.textGold,
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.modal + 3);
    this.frame.add(header);

    // 关闭按钮
    const close = this.scene.add
      .text(left + PANEL_W - 28, top + 24, "✕", {
        fontFamily: FONT_FAMILY,
        fontSize: "24px",
        color: THEME.textDim,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.modal + 3)
      .setInteractive({ useHandCursor: true });
    close.on("pointerover", () => close.setColor("#ffffff"));
    close.on("pointerout", () => close.setColor(THEME.textDim));
    close.on("pointerdown", () => this.close());
    this.frame.add(close);

    // 左右翻页箭头
    const prev = this.makeNav(left + 40, cy, "‹", () => this.go(-1));
    this.prevArc = prev.arc;
    this.prevLabel = prev.label;
    const next = this.makeNav(left + PANEL_W - 40, cy, "›", () => this.go(1));
    this.nextArc = next.arc;
    this.nextLabel = next.label;

    // 底部操作提示
    const hint = this.scene.add
      .text(cx, top + PANEL_H - 22, "← / →  翻页        ESC  关闭", {
        fontFamily: FONT_FAMILY,
        fontSize: "13px",
        color: THEME.textDim,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.modal + 3);
    this.frame.add(hint);

    // 键盘导航
    this.keyHandler = (e: KeyboardEvent) => {
      if (!this.visible) return;
      if (e.key === "ArrowRight") this.go(1);
      else if (e.key === "ArrowLeft") this.go(-1);
      else if (e.key === "Escape") this.close();
    };
    window.addEventListener("keydown", this.keyHandler);

    this.renderPage(0);
  }

  private makeNav(
    x: number,
    y: number,
    glyph: string,
    onClick: () => void,
  ): { arc: Phaser.GameObjects.Arc; label: Phaser.GameObjects.Text } {
    const arc = this.scene.add
      .circle(x, y, 26, SKIN.jade, 1)
      .setStrokeStyle(2, SKIN.gold, 0.6)
      .setDepth(DEPTH.modal + 3)
      .setInteractive({ useHandCursor: true });
    const label = this.scene.add
      .text(x, y - 2, glyph, {
        fontFamily: FONT_FAMILY,
        fontSize: "34px",
        color: SKIN.textGold,
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.modal + 3);
    arc.on("pointerover", () => {
      if (arc.input?.enabled) arc.setFillStyle(SKIN.jadeLight, 1);
    });
    arc.on("pointerout", () => arc.setFillStyle(SKIN.jade, 1));
    arc.on("pointerdown", () => {
      if (arc.input?.enabled) onClick();
    });
    this.frame.add(arc);
    this.frame.add(label);
    return { arc, label };
  }

  private go(delta: number): void {
    const target = this.index + delta;
    if (target < 0 || target >= GUIDE_PAGES.length) return;
    this.index = target;
    this.renderPage(delta);
  }

  private renderPage(direction: number): void {
    this.content.clear(true, true);

    const page = GUIDE_PAGES[this.index];
    const cx = DESIGN_WIDTH / 2;
    const cy = DESIGN_HEIGHT / 2;
    const top = cy - PANEL_H / 2;

    const created: Phaser.GameObjects.GameObject[] = [];

    // 图标章（充当“演示图”）
    const medal = medallion(this.scene, cx, top + 108, 46, page.icon, page.accent);
    medal.setDepth(DEPTH.modal + 2);
    this.content.add(medal);
    created.push(medal);

    // 标题
    const title = this.scene.add
      .text(cx, top + 178, page.title, {
        fontFamily: FONT_FAMILY,
        fontSize: "30px",
        color: hex(page.accent),
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.modal + 2);
    this.content.add(title);
    created.push(title);

    // 副标题
    const subtitle = this.scene.add
      .text(cx, top + 212, page.subtitle, {
        fontFamily: FONT_FAMILY,
        fontSize: "17px",
        color: THEME.textDim,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.modal + 2);
    this.content.add(subtitle);
    created.push(subtitle);

    // 分隔线
    const divider = this.scene.add.graphics().setDepth(DEPTH.modal + 2);
    divider.lineStyle(1, SKIN.gold, 0.35);
    divider.lineBetween(cx - 200, top + 240, cx + 200, top + 240);
    this.content.add(divider);
    created.push(divider);

    // 正文要点
    const body = this.scene.add
      .text(cx - 260, top + 262, page.lines.join("\n"), {
        fontFamily: FONT_FAMILY,
        fontSize: "18px",
        color: THEME.textLight,
        align: "left",
        lineSpacing: 12,
        wordWrap: { width: 520 },
      })
      .setOrigin(0, 0)
      .setDepth(DEPTH.modal + 2);
    this.content.add(body);
    created.push(body);

    // 页码圆点
    const dots = this.scene.add.graphics().setDepth(DEPTH.modal + 2);
    const n = GUIDE_PAGES.length;
    const gap = 22;
    const startX = cx - ((n - 1) * gap) / 2;
    const dy = top + PANEL_H - 52;
    for (let i = 0; i < n; i++) {
      if (i === this.index) {
        dots.fillStyle(SKIN.gold, 1);
        dots.fillCircle(startX + i * gap, dy, 6);
      } else {
        dots.fillStyle(0xffffff, 0.28);
        dots.fillCircle(startX + i * gap, dy, 4);
      }
    }
    this.content.add(dots);
    created.push(dots);

    this.updateNav();

    // 进入动画：淡入 + 轻微横移
    const dx = direction === 0 ? 0 : direction * 36;
    for (const obj of created) {
      const go = obj as unknown as { x: number; alpha: number };
      if (typeof go.x === "number") {
        const baseX = go.x;
        go.x = baseX + dx;
        go.alpha = 0;
        this.scene.tweens.add({
          targets: obj,
          x: baseX,
          alpha: 1,
          duration: 200,
          ease: "Quad.easeOut",
        });
      }
    }
  }

  private updateNav(): void {
    const atStart = this.index === 0;
    const atEnd = this.index === GUIDE_PAGES.length - 1;
    this.setNavEnabled(this.prevArc, this.prevLabel, !atStart);
    this.setNavEnabled(this.nextArc, this.nextLabel, !atEnd);
  }

  private setNavEnabled(
    arc: Phaser.GameObjects.Arc | undefined,
    label: Phaser.GameObjects.Text | undefined,
    enabled: boolean,
  ): void {
    if (!arc || !label) return;
    if (enabled) arc.setInteractive({ useHandCursor: true });
    else arc.disableInteractive();
    arc.setFillStyle(enabled ? SKIN.jade : 0x2a2140, enabled ? 1 : 0.6);
    arc.setStrokeStyle(2, SKIN.gold, enabled ? 0.6 : 0.15);
    label.setColor(enabled ? SKIN.textGold : "#6b6480");
  }

  close(): void {
    if (!this.visible) return;
    this.visible = false;
    if (this.keyHandler) {
      window.removeEventListener("keydown", this.keyHandler);
      this.keyHandler = undefined;
    }
    this.content.clear(true, true);
    this.frame.clear(true, true);
    this.prevArc = this.prevLabel = undefined as never;
    this.nextArc = this.nextLabel = undefined as never;
    this.onClose?.();
    this.onClose = undefined;
  }
}

/** 数值色 → CSS 十六进制字符串。 */
function hex(color: number): string {
  return "#" + color.toString(16).padStart(6, "0");
}
