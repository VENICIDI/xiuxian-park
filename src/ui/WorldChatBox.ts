import Phaser from "phaser";
import { DESIGN_HEIGHT, DESIGN_WIDTH } from "../game/config";
import { DEPTH, FONT_FAMILY } from "../game/theme";
import { SKIN, fantasyPanel } from "./skin";

/**
 * 右下角「世界聊天框」：滚动记录游客反馈与园区公告（类似经营/MMO 游戏的世界频道）。
 * 位于手牌坞右侧的空白区，新消息从底部涌入、旧消息上移淡出。
 */

const PAD = 12;
// 缩小并靠右下角摆放；同时让出放大后棋盘伸向前方的右角，避免面板遮挡可玩地块。
const PANEL_X = 872;
const PANEL_W = DESIGN_WIDTH - PANEL_X - 14; // 至屏幕右缘留 14
const PANEL_BOTTOM = DESIGN_HEIGHT - 6;
const PANEL_TOP = 592;
const PANEL_H = PANEL_BOTTOM - PANEL_TOP;

const TITLE_H = 25;
const LINE_H = 18;
const CONTENT_LEFT = PANEL_X + PAD;
const CONTENT_TOP = PANEL_TOP + TITLE_H;
const DOT_R = 3;
const TEXT_X = CONTENT_LEFT + DOT_R * 2 + 5;
const MAX_LINES = Math.floor((PANEL_H - TITLE_H - PAD) / LINE_H); // ≈ 4 行

type ChatEntry = Phaser.GameObjects.Container;

export class WorldChatBox {
  private scene: Phaser.Scene;
  private entries: ChatEntry[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    const g = scene.add.graphics().setDepth(DEPTH.panel);
    fantasyPanel(g, PANEL_X, PANEL_TOP, PANEL_W, PANEL_H);

    // 标题栏分隔线
    g.lineStyle(1, SKIN.gold, 0.28);
    g.beginPath();
    g.moveTo(PANEL_X + PAD, PANEL_TOP + TITLE_H - 4);
    g.lineTo(PANEL_X + PANEL_W - PAD, PANEL_TOP + TITLE_H - 4);
    g.strokePath();

    scene.add
      .text(CONTENT_LEFT, PANEL_TOP + 6, "🏮 事件日志", {
        fontFamily: FONT_FAMILY,
        fontSize: "13px",
        color: SKIN.textGold,
        fontStyle: "bold",
      })
      .setOrigin(0, 0)
      .setDepth(DEPTH.panel + 1);
  }

  /** 推入一条消息。dotColor 为左侧门派色圆点；系统公告传入金色。 */
  push(text: string, dotColor: number): void {
    const container = this.scene.add
      .container(0, PANEL_BOTTOM)
      .setDepth(DEPTH.panel + 1);

    const dot = this.scene.add.graphics();
    dot.fillStyle(dotColor, 1);
    dot.fillCircle(CONTENT_LEFT + DOT_R, LINE_H / 2, DOT_R);
    container.add(dot);

    const label = this.scene.add
      .text(TEXT_X, LINE_H / 2, text, {
        fontFamily: FONT_FAMILY,
        fontSize: "12px",
        color: SKIN.textLight,
        wordWrap: { width: PANEL_W - PAD * 2 - DOT_R * 2 - 5 },
      })
      .setOrigin(0, 0.5);
    container.add(label);

    this.entries.push(container);
    while (this.entries.length > MAX_LINES) {
      this.entries.shift()?.destroy();
    }
    this.relayout(container);
  }

  /** 重新堆叠：最旧在顶、最新在底；新消息从下方淡入，其余平滑上移。 */
  private relayout(fresh: ChatEntry): void {
    const n = this.entries.length;
    this.entries.forEach((entry, i) => {
      const targetY = CONTENT_TOP + i * LINE_H;
      if (entry === fresh) {
        entry.y = targetY + 8;
        entry.setAlpha(0);
        this.scene.tweens.add({
          targets: entry,
          y: targetY,
          alpha: 1,
          duration: 200,
          ease: "Quad.easeOut",
        });
      } else {
        this.scene.tweens.add({
          targets: entry,
          y: targetY,
          duration: 160,
          ease: "Quad.easeOut",
        });
      }
    });
    // 首屏未填满时，n 行从顶部开始排列即可（上方已在 forEach 处理）
    void n;
  }

  clear(): void {
    for (const e of this.entries) e.destroy();
    this.entries = [];
  }
}
