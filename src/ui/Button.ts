import Phaser from "phaser";
import { FONT_FAMILY, THEME } from "../game/theme";

export type ButtonOptions = {
  width?: number;
  height?: number;
  fontSize?: number;
  color?: number;
  hoverColor?: number;
  textColor?: string;
  onClick?: () => void;
};

/**
 * 通用按钮，含普�?悬停/按下/禁用四态�?
 * 使用 Graphics + Text 绘制占位样式�?
 */
export class Button extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private bw: number;
  private bh: number;
  private baseColor: number;
  private hoverColor: number;
  private enabled = true;
  private onClick?: () => void;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    opts: ButtonOptions = {},
  ) {
    super(scene, x, y);
    this.bw = opts.width ?? 160;
    this.bh = opts.height ?? 48;
    this.baseColor = opts.color ?? THEME.accent;
    this.hoverColor = opts.hoverColor ?? 0xa885e6;
    this.onClick = opts.onClick;

    this.bg = scene.add.graphics();
    this.label = scene.add
      .text(0, 0, text, {
        fontFamily: FONT_FAMILY,
        fontSize: `${opts.fontSize ?? 20}px`,
        color: opts.textColor ?? THEME.textLight,
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add([this.bg, this.label]);
    this.setSize(this.bw, this.bh);
    this.setInteractive(
      new Phaser.Geom.Rectangle(-this.bw / 2, -this.bh / 2, this.bw, this.bh),
      Phaser.Geom.Rectangle.Contains,
    );

    this.on("pointerover", () => this.render(this.hoverColor));
    this.on("pointerout", () => this.render(this.baseColor));
    this.on("pointerdown", () => this.render(0x6b52a3, 2));
    this.on("pointerup", () => {
      this.render(this.hoverColor);
      if (this.enabled && this.onClick) this.onClick();
    });

    this.render(this.baseColor);
    scene.add.existing(this);
  }

  private render(color: number, offsetY = 0): void {
    const c = this.enabled ? color : 0x4a4458;
    this.bg.clear();
    this.bg.fillStyle(0x000000, 0.35);
    this.bg.fillRoundedRect(-this.bw / 2 + 2, -this.bh / 2 + 4, this.bw, this.bh, 10);
    this.bg.fillStyle(c, 1);
    this.bg.fillRoundedRect(-this.bw / 2, -this.bh / 2 + offsetY, this.bw, this.bh, 10);
    this.bg.lineStyle(2, 0xffffff, 0.15);
    this.bg.strokeRoundedRect(-this.bw / 2, -this.bh / 2 + offsetY, this.bw, this.bh, 10);
    this.label.setY(offsetY);
    this.label.setColor(this.enabled ? THEME.textLight : "#8a8499");
  }

  setEnabled(v: boolean): this {
    this.enabled = v;
    if (v) this.setInteractive();
    else this.disableInteractive();
    this.render(this.baseColor);
    return this;
  }

  setText(text: string): this {
    this.label.setText(text);
    return this;
  }

  setOnClick(fn: () => void): this {
    this.onClick = fn;
    return this;
  }
}


