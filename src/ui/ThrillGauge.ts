import Phaser from "phaser";
import { DESIGN_WIDTH } from "../game/config";
import { BALANCE } from "../game/data/balance";
import type { GameState } from "../game/models/game-state";
import { DEPTH, FONT_FAMILY, THEME } from "../game/theme";
import { HUD_H } from "../game/rendering/layout";
import { SKIN, fantasyPanel } from "./skin";

// 右上「刺激度」横向刻度条 + 指针：指针随消费右移蓄力；
// 满 100 触发「收益翻倍」狂欢，狂欢期间指针在 frenzyMs 内从满端线性回落到 0。
const PW = 238;
const PH = 88;
const PX = DESIGN_WIDTH - 20 - PW; // 贴右缘
const PY = HUD_H + 16;

const BAR_X = PX + 16;
const BAR_W = PW - 32;
const BAR_Y = PY + 34;
const BAR_H = 16;
const SEG = 12;
const SEG_GAP = 2;

const MAX = BALANCE.thrillMeter.max;
const PER_STONE = BALANCE.thrillMeter.perStone;
const FRENZY_MS = BALANCE.thrillMeter.frenzyMs;

const IDLE_MARKER = 0xc3b0ff; // 蓄力指针（亮紫）
const FRENZY_MARKER = 0xffe08a; // 狂欢指针（亮金）

/** 沿 紫→金 取渐变色（f: 0 空 → 1 满/临界翻倍）。 */
function thrillRamp(f: number): number {
  const c = Phaser.Display.Color;
  return c.Interpolate.ColorWithColor(
    c.ValueToColor(THEME.purple),
    c.ValueToColor(THEME.gold),
    100,
    Phaser.Math.Clamp(f, 0, 1) * 100,
  ).color;
}

/**
 * 右上「刺激度」横向刻度条：
 * - 平时：指针随营业消费平滑右移蓄力（紫→金渐变刻度）。
 * - 满 100：进入「收益翻倍」狂欢，指针在 frenzyMs 内从满端线性回落到 0。
 * - 回落到 0：恢复常态，重新蓄力。
 */
export class ThrillGauge {
  private scene: Phaser.Scene;
  private bar: Phaser.GameObjects.Graphics; // 静态刻度
  private needle: Phaser.GameObjects.Graphics; // 动态指针
  private glow: Phaser.GameObjects.Image;
  private valueText: Phaser.GameObjects.Text;
  private statusText: Phaser.GameObjects.Text;
  /** 逻辑刺激度（目标值），0..MAX。 */
  private value = 0;
  /** 实际绘制值（向 value 缓动，制造上涨动画）。 */
  private rendered = 0;
  private markerX = BAR_X;
  private live = false;
  private frenzyUntil = 0;
  private shownFrenzy = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    const bg = scene.add.graphics().setDepth(DEPTH.panel);
    fantasyPanel(bg, PX, PY, PW, PH);

    // 标题
    scene.add
      .text(PX + 15, PY + 11, "刺激度", {
        fontFamily: FONT_FAMILY,
        fontSize: "13px",
        color: SKIN.textGold,
        fontStyle: "bold",
      })
      .setDepth(DEPTH.panel + 1);

    // 右上：状态提示（平时蓄力，狂欢翻倍）
    this.statusText = scene.add
      .text(PX + PW - 15, PY + 14, "蓄满触发翻倍", {
        fontFamily: FONT_FAMILY,
        fontSize: "9px",
        color: "#c3b0ff",
      })
      .setOrigin(1, 0.5)
      .setDepth(DEPTH.panel + 1);

    // 条后发光（狂欢时点亮）
    this.glow = scene.add
      .image(BAR_X + BAR_W / 2, BAR_Y + BAR_H / 2, "glow")
      .setTint(THEME.gold)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(4.2, 1.4)
      .setAlpha(0)
      .setDepth(DEPTH.panel);

    // 静态刻度条（紫→金分段）
    this.bar = scene.add.graphics().setDepth(DEPTH.panel + 1);
    this.paintBar();

    this.needle = scene.add.graphics().setDepth(DEPTH.panel + 2);

    // 底部左：刺激度数值
    this.valueText = scene.add
      .text(PX + 15, PY + PH - 16, "0", {
        fontFamily: FONT_FAMILY,
        fontSize: "19px",
        color: THEME.accentText,
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5)
      .setDepth(DEPTH.panel + 2);

    // 底部右：满刻度标注
    scene.add
      .text(PX + PW - 15, PY + PH - 15, "满 100", {
        fontFamily: FONT_FAMILY,
        fontSize: "11px",
        color: SKIN.textDim,
      })
      .setOrigin(1, 0.5)
      .setDepth(DEPTH.panel + 1);

    this.paint();

    scene.events.on(Phaser.Scenes.Events.UPDATE, this.onUpdate, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.events.off(Phaser.Scenes.Events.UPDATE, this.onUpdate, this);
    });
  }

  /** 绘制底轨 + 紫→金渐变刻度段（静态）。 */
  private paintBar(): void {
    const g = this.bar;
    g.clear();
    g.fillStyle(0x1c1630, 1);
    g.fillRoundedRect(BAR_X - 2, BAR_Y - 2, BAR_W + 4, BAR_H + 4, 5);

    const segW = (BAR_W - (SEG - 1) * SEG_GAP) / SEG;
    for (let i = 0; i < SEG; i++) {
      const f = i / (SEG - 1);
      const x = BAR_X + i * (segW + SEG_GAP);
      g.fillStyle(thrillRamp(f), 0.92);
      g.fillRoundedRect(x, BAR_Y, segW, BAR_H, 2);
    }
    g.fillStyle(0xffffff, 0.12);
    g.fillRect(BAR_X, BAR_Y + 1, BAR_W, 2);
  }

  /** 在刺激度位置绘制指针（下三角 + 竖线）。 */
  private paintNeedle(color: number): void {
    const g = this.needle;
    g.clear();
    const x = this.markerX;
    g.lineStyle(2, 0x120a0a, 0.9);
    g.lineBetween(x, BAR_Y - 6, x, BAR_Y + BAR_H + 3);
    g.lineStyle(1.5, 0xffffff, 0.95);
    g.lineBetween(x, BAR_Y - 5, x, BAR_Y + BAR_H + 2);
    g.fillStyle(color, 1);
    g.beginPath();
    g.moveTo(x - 6, BAR_Y - 12);
    g.lineTo(x + 6, BAR_Y - 12);
    g.lineTo(x, BAR_Y - 4);
    g.closePath();
    g.fillPath();
    g.lineStyle(1, 0x120a0a, 0.9);
    g.strokePath();
  }

  private paint(): void {
    const frenzy = this.isFrenzyActive();
    const frac = Phaser.Math.Clamp(this.rendered / MAX, 0, 1);
    this.markerX = BAR_X + BAR_W * frac;
    this.paintNeedle(frenzy ? FRENZY_MARKER : IDLE_MARKER);
    this.valueText
      .setColor(frenzy ? THEME.textGold : THEME.accentText)
      .setText(`${Math.round(this.rendered)}`);
  }

  private onUpdate(): void {
    const frenzy = this.isFrenzyActive();
    if (frenzy) {
      const remainFrac = Phaser.Math.Clamp(
        (this.frenzyUntil - this.scene.time.now) / FRENZY_MS,
        0,
        1,
      );
      this.value = MAX * remainFrac;
      this.rendered = this.value;
    } else {
      this.rendered += (this.value - this.rendered) * 0.18;
      if (Math.abs(this.value - this.rendered) < 0.5) this.rendered = this.value;
    }
    this.handleFrenzyToggle(frenzy);
    this.paint();
  }

  private handleFrenzyToggle(active: boolean): void {
    if (active === this.shownFrenzy) return;
    this.shownFrenzy = active;
    this.scene.tweens.killTweensOf(this.statusText);
    this.scene.tweens.killTweensOf(this.glow);
    if (active) {
      this.statusText.setText("收益翻倍").setColor(THEME.textGold);
      this.statusText.setScale(0.9);
      this.scene.tweens.add({
        targets: this.statusText,
        scale: 1.12,
        duration: 420,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
      this.scene.tweens.add({ targets: this.glow, alpha: 0.6, duration: 220 });
    } else {
      this.statusText.setText("蓄满触发翻倍").setColor("#c3b0ff").setScale(1);
      this.scene.tweens.add({ targets: this.glow, alpha: 0, duration: 300 });
    }
  }

  /** 当前是否处于收益翻倍狂欢中。 */
  isFrenzyActive(): boolean {
    return this.scene.time.now < this.frenzyUntil;
  }

  /** 当前刺激度值（用于结算后写回状态）。 */
  getValue(): number {
    return Phaser.Math.Clamp(this.value, 0, MAX);
  }

  /** 规划阶段静态展示当前刺激度。 */
  update(state: GameState): void {
    this.live = false;
    this.value = Phaser.Math.Clamp(state.thrill ?? 0, 0, MAX);
    this.rendered = this.value;
    this.paint();
  }

  /** 营业开始：进入实时积累模式。 */
  beginLive(startThrill: number): void {
    this.live = true;
    this.value = Phaser.Math.Clamp(startThrill, 0, MAX);
    this.rendered = this.value;
    this.paint();
  }

  /**
   * 游客消费：按收益比例积累刺激度；满 MAX 触发狂欢（狂欢期间积累暂停）。
   * 返回本次是否触发了新的狂欢。
   */
  addThrill(amount: number): boolean {
    if (!this.live || this.isFrenzyActive()) return false;
    this.value += amount * PER_STONE;
    if (this.value >= MAX) {
      this.value = MAX;
      this.rendered = MAX;
      this.frenzyUntil = this.scene.time.now + FRENZY_MS;
      return true;
    }
    return false;
  }

  /** 营业结束：退出实时模式（狂欢余量由 onUpdate 自然收尾）。 */
  endLive(): void {
    this.live = false;
  }
}
