import Phaser from "phaser";
import { getBuildingDef } from "../data/buildings";
import type { GameState } from "../models/game-state";
import { DESIGN_WIDTH } from "../config";
import { DEPTH, FONT_FAMILY, THEME } from "../theme";
import {
  createNewGame,
  placeBuilding,
  removeBuilding,
  resolveDay,
} from "../controllers/TurnController";
import {
  canPlaceFootprint,
  footprintIndices,
  occupantAt,
} from "../systems/PlacementSystem";
import { DEFAULT_SETTINGS, SaveService } from "../services/SaveService";
import type { GameSettings } from "../services/SaveService";
import { audio } from "../services/AudioService";
import { BoardView } from "../rendering/BoardView";
import { AnimationPlayer } from "../rendering/AnimationPlayer";
import { Background } from "../rendering/Background";
import { applyHiDpiCamera } from "../hidpi";
import { Fx } from "../rendering/Fx";
import {
  HUD_H,
  HUD_CTRL_RIGHT,
  PLAY_X,
  PLAY_Y,
  PLAY_W,
  PLAY_H,
  cellCenter,
  indexAtWorld,
} from "../rendering/layout";
import { Hud } from "../../ui/Hud";
import { PressureGauge } from "../../ui/PressureGauge";
import { SKIN } from "../../ui/skin";
import { HandBar } from "../../ui/HandBar";
import { HandDetailPanel } from "../../ui/HandDetailPanel";
import { DetailPanel } from "../../ui/DetailPanel";
import { DebugPanel } from "../../ui/DebugPanel";
import { Button } from "../../ui/Button";

export class ParkScene extends Phaser.Scene {
  private state!: GameState;
  private settings: GameSettings = { ...DEFAULT_SETTINGS };

  private board!: BoardView;
  private hud!: Hud;
  private gauge!: PressureGauge;
  private hand!: HandBar;
  private cardDetail!: HandDetailPanel;
  private detail!: DetailPanel;
  private debug!: DebugPanel;
  private anim!: AnimationPlayer;
  private fx!: Fx;

  private selectedBuildingId: string | null = null;
  private placementRotation = 0;
  private hoverIndex = -1;
  private isAnimating = false;
  private coinSfxCounter = 0;

  private startBtn!: Button;
  private speedBtn!: Button;
  private skipBtn!: Button;
  private hintText!: Phaser.GameObjects.Text;

  constructor() {
    super("Park");
  }

  init(data: { continueGame?: boolean }): void {
    if (data?.continueGame) {
      const res = SaveService.load();
      if (res.ok) {
        this.state = res.envelope.state;
        this.settings = res.envelope.settings;
      } else {
        this.state = createNewGame();
      }
    } else {
      this.state = createNewGame();
    }
    audio.setMusicVolume(this.settings.musicVolume);
    audio.setSfxVolume(this.settings.sfxVolume);
  }

  create(): void {
    applyHiDpiCamera(this);
    this.cameras.main.setBackgroundColor(THEME.bg);
    this.cameras.main.fadeIn(280, 166, 220, 242);

    // 游戏场景：背景降亮降饱和，让地图成为视觉主体
    new Background(this, {
      image: "bg-park",
      motes: 10,
      darken: 0.34,
      desaturate: 0.38,
    });
    this.board = new BoardView(this);
    this.fx = new Fx(this);
    this.hud = new Hud(this);
    this.gauge = new PressureGauge(this);
    this.hand = new HandBar(this, (id) => this.selectBuilding(id));
    this.cardDetail = new HandDetailPanel(this);
    this.detail = new DetailPanel(this);
    this.anim = new AnimationPlayer(this);
    this.debug = new DebugPanel(
      this,
      () => this.state,
      () => {
        this.state.spiritStones += 200;
        this.refreshAll();
      },
      () => {
        SaveService.clear();
        this.scene.start("MainMenu");
      },
    );

    this.buildControls();
    this.setupBoardInput();
    this.setupKeys();

    this.refreshAll();

    if (this.state.phase === "gameOver") {
      this.goResult();
    }

    // 页面隐藏时存档
    this.game.events.on(Phaser.Core.Events.HIDDEN, () => this.autosave());
  }

  // ————————————————— 顶栏操作按钮 —————————————————
  private buildControls(): void {
    // 顶部导航栏右侧：开始营业（金色主按钮，营业时切换为 速度 + 跳过）
    const cy = Math.round(HUD_H / 2); // 顶栏垂直居中 = 36
    const startW = 176;
    const startX = HUD_CTRL_RIGHT - startW / 2; // 右对齐顶栏右缘
    const skipW = 96;
    const skipX = HUD_CTRL_RIGHT - skipW / 2;
    const speedW = 92;
    const speedX = skipX - skipW / 2 - 8 - speedW / 2; // 跳过左侧

    this.startBtn = new Button(this, startX, cy, "开始营业", {
      width: startW,
      height: 44,
      fontSize: 19,
      variant: "primary",
      color: SKIN.gold,
      hoverColor: 0xffe08a,
      textColor: "#3a2a08",
      onClick: () => this.onStartBusiness(),
    });
    this.startBtn.setDepth(DEPTH.hud + 3);

    // 主按钮灵气发光底（随按钮显隐，planning 阶段呼吸吸引点击）
    const glow = this.add
      .image(0, 0, "glow")
      .setTint(SKIN.gold)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(7, 2.6)
      .setAlpha(0.3);
    this.startBtn.addAt(glow, 0);
    this.tweens.add({
      targets: glow,
      alpha: 0.1,
      duration: 1050,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.speedBtn = new Button(this, speedX, cy, "速度 1×", {
      width: speedW,
      height: 40,
      fontSize: 15,
      variant: "secondary",
      color: SKIN.jade,
      hoverColor: SKIN.jadeLight,
      textColor: SKIN.textLight,
      onClick: () => this.toggleSpeed(),
    });
    this.speedBtn.setDepth(DEPTH.hud + 3).setVisible(false);

    this.skipBtn = new Button(this, skipX, cy, "跳过", {
      width: skipW,
      height: 40,
      fontSize: 15,
      variant: "danger",
      onClick: () => this.anim.skip(),
    });
    this.skipBtn.setDepth(DEPTH.hud + 3).setVisible(false);

    // 放置提示：浮于顶栏下方居中
    this.hintText = this.add
      .text(DESIGN_WIDTH / 2, HUD_H + 8, "", {
        fontFamily: FONT_FAMILY,
        fontSize: "14px",
        color: SKIN.textDim,
        align: "center",
        stroke: "#0c1613",
        strokeThickness: 3,
      })
      .setOrigin(0.5, 0)
      .setDepth(DEPTH.hud + 1);
  }

  // ————————————————— 输入 —————————————————
  private setupBoardInput(): void {
    const zone = this.add
      .zone(PLAY_X, PLAY_Y, PLAY_W, PLAY_H)
      .setOrigin(0, 0)
      .setInteractive();

    zone.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (this.isAnimating || this.state.phase !== "planning") return;
      this.hoverIndex = indexAtWorld(p.worldX, p.worldY);
      this.updatePlacementPreview();
    });

    zone.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (this.isAnimating || this.state.phase !== "planning") return;
      if (p.middleButtonDown()) {
        this.rotatePlacement();
        return;
      }
      if (p.rightButtonDown()) return; // 右键取消由全局处理
      const idx = indexAtWorld(p.worldX, p.worldY);
      if (idx < 0) return;
      if (this.selectedBuildingId) {
        this.tryPlace(idx);
      } else if (occupantAt(this.state, idx)) {
        this.detail.open(this.state, idx, () => this.doRemove(idx));
      }
    });
  }

  private setupKeys(): void {
    this.input.keyboard?.on("keydown-ESC", () => this.cancelSelection());
    this.input.keyboard?.on("keydown-R", () => this.rotatePlacement());
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (p.rightButtonDown()) this.cancelSelection();
    });
    // 阻止浏览器中键（滚动/自动滚动）默认行为
    const canvas = this.game.canvas;
    canvas.addEventListener("mousedown", (e) => {
      if (e.button === 1) e.preventDefault();
    });
    canvas.addEventListener("auxclick", (e) => {
      if (e.button === 1) e.preventDefault();
    });
  }

  // ————————————————— 放置 —————————————————
  private selectBuilding(id: string): void {
    this.selectedBuildingId = id;
    this.placementRotation = 0;
    this.hand.setSelected(id, this.state);
    const def = getBuildingDef(id);
    this.cardDetail.open(def);
    this.hintText.setText(
      `放置中：${def.name} ${def.size.w}×${def.size.h}（免费）— 点击放置，中键/R 旋转，右键/ESC 取消`,
    );
    this.updatePlacementPreview();
  }

  private cancelSelection(): void {
    this.selectedBuildingId = null;
    this.placementRotation = 0;
    this.hand.setSelected(null, this.state);
    this.cardDetail.close();
    this.board.clearHighlight();
    this.board.clearOverlay();
    this.hintText.setText("点击下方建筑卡选择建筑，摆放好后点击右上角「开始营业」。");
  }

  private rotatePlacement(): void {
    if (!this.selectedBuildingId) return;
    this.placementRotation = (this.placementRotation + 1) % 4;
    audio.playSfx("ui");
    this.updatePlacementPreview();
  }

  private updatePlacementPreview(): void {
    if (!this.selectedBuildingId || this.hoverIndex < 0) {
      this.board.clearHighlight();
      return;
    }
    const def = getBuildingDef(this.selectedBuildingId);
    const cells = footprintIndices(this.hoverIndex, def, this.placementRotation);
    const check = canPlaceFootprint(
      this.state,
      this.hoverIndex,
      def,
      this.placementRotation,
    );
    this.board.showFootprintPreview(cells, check.ok, this.hoverIndex);
  }

  private tryPlace(idx: number): void {
    if (!this.selectedBuildingId) return;
    const res = placeBuilding(
      this.state,
      this.selectedBuildingId,
      idx,
      this.placementRotation,
    );
    if (res.ok) {
      audio.playSfx("place");
      // 放置尘土与星光
      const def0 = getBuildingDef(this.selectedBuildingId);
      const cells = footprintIndices(idx, def0, this.placementRotation) ?? [idx];
      let sx = 0;
      let sy = 0;
      for (const c of cells) {
        const cc = cellCenter(c);
        sx += cc.x;
        sy += cc.y;
      }
      const px = sx / cells.length;
      const py = sy / cells.length;
      // 放置反馈（规范十五）：POP 由 BoardView 弹入 + 灵气扩散
      this.fx.dustPuff(px, py + 20);
      this.fx.qiSpread(px, py);
      this.fx.shake(90, 0.003);
      this.board.refresh(this.state);
      this.board.clearHighlight();
      this.board.clearOverlay();
      this.hud.update(this.state);
      this.hand.refresh(this.state);
      this.hand.setSelected(this.selectedBuildingId, this.state);
      this.autosave();
      // 建造免费：放置后保持选中，可继续连续放置
      this.updatePlacementPreview();
    } else {
      audio.playSfx("invalid");
      this.hud.showToast(res.message ?? "无法放置", true);
    }
  }

  private doRemove(idx: number): void {
    const res = removeBuilding(this.state, idx);
    if (res.ok) {
      audio.playSfx("ui");
      this.detail.close();
      this.refreshAll();
      this.hud.showToast(res.message ?? "已拆除");
      this.autosave();
    }
  }

  // ————————————————— 结算流程 —————————————————
  private onStartBusiness(): void {
    if (this.isAnimating || this.state.phase !== "planning") return;
    this.cancelSelection();

    const result = resolveDay(this.state);

    this.isAnimating = true;
    this.startBtn.setVisible(false);
    this.speedBtn.setVisible(true).setText(`速度 ${this.settings.animationSpeed}×`);
    this.skipBtn.setVisible(true);
    this.hintText.setText("营业中……游客正在游玩与消费。");

    this.anim.play({
      state: this.state,
      events: result.events,
      speed: this.settings.animationSpeed,
      onCoin: (x, y, amount, thunder) => this.spawnCoin(x, y, amount, thunder),
      onComplete: () => this.applyResolved(result.nextState),
    });
  }

  private applyResolved(nextState: GameState): void {
    this.isAnimating = false;
    this.speedBtn.setVisible(false);
    this.skipBtn.setVisible(false);
    this.state = nextState;

    this.refreshAll(); // 已推进到下一天：刷新棋盘/HUD/底部 3 张新建筑卡
    this.autosave(); // 结算后存档
    audio.playSfx("income");

    if (this.state.phase === "gameOver") {
      this.goResult();
    } else {
      this.hud.showBanner(`第 ${this.state.day} 天`, THEME.textGold);
    }
  }

  private goResult(): void {
    this.autosave();
    this.cameras.main.fadeOut(300, 166, 220, 242);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start("Result", { state: this.state });
    });
  }

  // ————————————————— 特效 —————————————————
  private spawnCoin(x: number, y: number, amount: number, thunder: boolean): void {
    // 赚钱数字：黄色向上飘（规范十四/十六：地图持续"活着"）
    if (thunder) {
      this.fx.floatText(x, y - 8, `+${amount}`, "#b79dff", 22);
    } else {
      this.fx.gain(x, y, amount, 18);
    }
    this.fx.coinBurst(x, y);
    // 偶尔冒出满意表情，强化营业反馈循环
    if (Phaser.Math.Between(0, 3) === 0) {
      this.fx.floatText(x + Phaser.Math.Between(-14, 14), y - 22, "😊", "#7fd37b", 16);
    }

    if (thunder) {
      this.fx.thunderBolt(x, y);
      audio.playSfx("thunder");
    }

    this.coinSfxCounter++;
    if (this.coinSfxCounter % 4 === 0) audio.playSfx("income");
  }

  // ————————————————— 通用刷新/存档 —————————————————
  private toggleSpeed(): void {
    this.settings.animationSpeed = this.settings.animationSpeed === 1 ? 2 : 1;
    this.speedBtn.setText(`速度 ${this.settings.animationSpeed}×`);
  }

  private refreshAll(): void {
    this.board.refresh(this.state);
    this.hud.update(this.state);
    this.gauge.update(this.state);
    this.hand.refresh(this.state);
    this.debug.refresh();
    if (this.state.phase === "planning") {
      this.startBtn.setVisible(true);
      if (!this.selectedBuildingId) {
        this.hintText.setText(
          "点击下方建筑卡选择建筑，摆放好后点击右上角「开始营业」。",
        );
      }
    }
  }

  private autosave(): void {
    SaveService.save(this.state, this.settings);
  }
}
