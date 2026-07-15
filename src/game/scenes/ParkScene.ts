import Phaser from "phaser";
import { GRID_HEIGHT, GRID_WIDTH } from "../config";
import { getBuildingDef } from "../data/buildings";
import type { GameState } from "../models/game-state";
import { DEPTH, FONT_FAMILY, THEME } from "../theme";
import {
  applyDraft,
  createNewGame,
  placeBuilding,
  removeBuilding,
  resolveDay,
  upgradeBuilding,
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
import {
  BOARD_X,
  BOARD_Y,
  TILE_DISPLAY,
  indexAtWorld,
} from "../rendering/layout";
import { Hud } from "../../ui/Hud";
import { CatalogPanel } from "../../ui/CatalogPanel";
import { DetailPanel } from "../../ui/DetailPanel";
import { DraftModal } from "../../ui/DraftModal";
import { DebugPanel } from "../../ui/DebugPanel";
import { Button } from "../../ui/Button";

export class ParkScene extends Phaser.Scene {
  private state!: GameState;
  private settings: GameSettings = { ...DEFAULT_SETTINGS };

  private board!: BoardView;
  private hud!: Hud;
  private catalog!: CatalogPanel;
  private detail!: DetailPanel;
  private draft!: DraftModal;
  private debug!: DebugPanel;
  private anim!: AnimationPlayer;

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
    this.cameras.main.setBackgroundColor(THEME.bg);

    this.board = new BoardView(this);
    this.hud = new Hud(this);
    this.catalog = new CatalogPanel(this, (id) => this.selectBuilding(id));
    this.detail = new DetailPanel(this);
    this.draft = new DraftModal(this);
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

    this.buildBottomBar();
    this.setupBoardInput();
    this.setupKeys();

    this.refreshAll();

    // 若加载存档时正处于三选一阶段，直接恢复三选一
    if (this.state.phase === "drafting" && this.state.pendingDraft.length > 0) {
      this.openDraft();
    } else if (this.state.phase === "gameOver") {
      this.goResult();
    }

    // 页面隐藏时存档
    this.game.events.on(Phaser.Core.Events.HIDDEN, () => this.autosave());
  }

  // ————————————————— UI 底栏 —————————————————
  private buildBottomBar(): void {
    const barY = 680;
    const g = this.add.graphics().setDepth(DEPTH.hud - 1);
    g.fillStyle(THEME.bgPanel, 1);
    g.fillRect(0, 648, 748, 72);

    this.hintText = this.add
      .text(24, 658, "", {
        fontFamily: FONT_FAMILY,
        fontSize: "14px",
        color: THEME.textDim,
        wordWrap: { width: 420 },
      })
      .setDepth(DEPTH.hud);

    this.startBtn = new Button(this, 620, barY, "开始营业", {
      width: 200,
      height: 52,
      fontSize: 22,
      color: 0x2e8b57,
      hoverColor: 0x39a869,
      onClick: () => this.onStartBusiness(),
    });
    this.startBtn.setDepth(DEPTH.hud);

    this.speedBtn = new Button(this, 470, barY, "速度 1×", {
      width: 120,
      height: 46,
      fontSize: 18,
      onClick: () => this.toggleSpeed(),
    });
    this.speedBtn.setDepth(DEPTH.hud).setVisible(false);

    this.skipBtn = new Button(this, 620, barY, "跳过", {
      width: 120,
      height: 46,
      fontSize: 18,
      color: 0x8b3a4a,
      hoverColor: 0xa8485c,
      onClick: () => this.anim.skip(),
    });
    this.skipBtn.setDepth(DEPTH.hud).setVisible(false);
  }

  // ————————————————— 输入 —————————————————
  private setupBoardInput(): void {
    const zone = this.add
      .zone(
        BOARD_X,
        BOARD_Y,
        GRID_WIDTH * TILE_DISPLAY,
        GRID_HEIGHT * TILE_DISPLAY,
      )
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
        this.detail.open(
          this.state,
          idx,
          () => this.doUpgrade(idx),
          () => this.doRemove(idx),
        );
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
    this.catalog.setSelected(id, this.state);
    const def = getBuildingDef(id);
    this.hintText.setText(
      `放置中：${def.name} ${def.size.w}×${def.size.h}（◈${def.baseCost}）— 点击放置，中键/R 旋转，右键/ESC 取消`,
    );
    this.updatePlacementPreview();
  }

  private cancelSelection(): void {
    this.selectedBuildingId = null;
    this.placementRotation = 0;
    this.catalog.setSelected(null, this.state);
    this.board.clearHighlight();
    this.board.clearOverlay();
    this.hintText.setText("点击右侧图鉴选择建筑，摆放好后点击「开始营业」。");
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
      this.board.refresh(this.state);
      this.board.clearHighlight();
      this.board.clearOverlay();
      this.hud.update(this.state);
      this.catalog.refresh(this.state);
      this.catalog.setSelected(this.selectedBuildingId, this.state);
      this.autosave();
      // 灵石不足以再放置则自动取消
      const def = getBuildingDef(this.selectedBuildingId);
      if (this.state.spiritStones < def.baseCost) this.cancelSelection();
      else this.updatePlacementPreview();
    } else {
      audio.playSfx("invalid");
      this.hud.showToast(res.message ?? "无法放置", true);
    }
  }

  private doUpgrade(idx: number): void {
    const res = upgradeBuilding(this.state, idx);
    if (res.ok) {
      audio.playSfx("upgrade");
      this.detail.close();
      this.refreshAll();
      this.autosave();
    } else {
      this.hud.showToast(res.message ?? "无法升级", true);
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

    this.refreshAll();
    this.autosave(); // 结算后存档
    audio.playSfx("income");

    if (this.state.phase === "gameOver") {
      this.goResult();
    } else {
      this.openDraft();
    }
  }

  private openDraft(): void {
    this.startBtn.setVisible(false);
    this.draft.open(this.state.pendingDraft, (chosenId) => {
      audio.playSfx("ui");
      this.draft.close();
      this.state = applyDraft(this.state, chosenId);
      this.autosave(); // 三选一后存档
      if (this.state.phase === "gameOver") {
        this.goResult();
        return;
      }
      this.startBtn.setVisible(true);
      this.refreshAll();
      this.hud.showToast(`第 ${this.state.day} 天开始！`);
    });
  }

  private goResult(): void {
    this.autosave();
    this.scene.start("Result", { state: this.state });
  }

  // ————————————————— 特效 —————————————————
  private spawnCoin(x: number, y: number, amount: number, thunder: boolean): void {
    const color = thunder ? "#b39ddb" : THEME.textGold;
    const t = this.add
      .text(x, y, `+${amount}`, {
        fontFamily: FONT_FAMILY,
        fontSize: "18px",
        color,
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.fx);
    this.tweens.add({
      targets: t,
      y: y - 36,
      alpha: 0,
      duration: 700,
      ease: "Cubic.easeOut",
      onComplete: () => t.destroy(),
    });

    if (thunder) {
      const flash = this.add
        .image(x, y, "glow")
        .setTint(0xb39ddb)
        .setScale(3)
        .setDepth(DEPTH.fx - 1);
      this.tweens.add({
        targets: flash,
        alpha: 0,
        scale: 5,
        duration: 300,
        onComplete: () => flash.destroy(),
      });
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
    this.catalog.refresh(this.state);
    this.debug.refresh();
    if (this.state.phase === "planning") {
      this.startBtn.setVisible(true);
      if (!this.selectedBuildingId) {
        this.hintText.setText(
          "点击右侧图鉴选择建筑，摆放好后点击「开始营业」。",
        );
      }
    }
  }

  private autosave(): void {
    SaveService.save(this.state, this.settings);
  }
}
