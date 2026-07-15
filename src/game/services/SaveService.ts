import { GAME_VERSION, SAVE_KEY, SCHEMA_VERSION } from "../config";
import type { GameState } from "../models/game-state";

export type GameSettings = {
  musicVolume: number;
  sfxVolume: number;
  animationSpeed: 1 | 2;
};

export type SaveEnvelope = {
  schemaVersion: number;
  savedAt: string;
  gameVersion: string;
  state: GameState;
  settings: GameSettings;
};

export const DEFAULT_SETTINGS: GameSettings = {
  musicVolume: 0.5,
  sfxVolume: 0.7,
  animationSpeed: 1,
};

export type LoadResult =
  | { ok: true; envelope: SaveEnvelope }
  | { ok: false; reason: "empty" | "corrupt" | "incompatible"; message: string };

/**
 * 版本化本地存档。损坏或版本不兼容时不覆盖，交由上层提示。
 */
export class SaveService {
  static save(state: GameState, settings: GameSettings): void {
    try {
      const envelope: SaveEnvelope = {
        schemaVersion: SCHEMA_VERSION,
        savedAt: new Date().toISOString(),
        gameVersion: GAME_VERSION,
        state,
        settings,
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(envelope));
    } catch (err) {
      console.warn("[SaveService] 保存失败：", err);
    }
  }

  static load(): LoadResult {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(SAVE_KEY);
    } catch (err) {
      return { ok: false, reason: "corrupt", message: `无法访问本地存档：${err}` };
    }
    if (!raw) return { ok: false, reason: "empty", message: "无存档" };

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ok: false, reason: "corrupt", message: "存档已损坏，无法解析。" };
    }

    const env = parsed as Partial<SaveEnvelope>;
    if (
      !env ||
      typeof env.schemaVersion !== "number" ||
      !env.state ||
      typeof env.state !== "object"
    ) {
      return { ok: false, reason: "corrupt", message: "存档结构异常。" };
    }

    if (env.schemaVersion !== SCHEMA_VERSION) {
      return {
        ok: false,
        reason: "incompatible",
        message: `存档版本(${env.schemaVersion})与当前版本(${SCHEMA_VERSION})不兼容。`,
      };
    }

    return {
      ok: true,
      envelope: {
        schemaVersion: env.schemaVersion,
        savedAt: env.savedAt ?? "",
        gameVersion: env.gameVersion ?? "",
        state: env.state as GameState,
        settings: { ...DEFAULT_SETTINGS, ...(env.settings ?? {}) },
      },
    };
  }

  static hasSave(): boolean {
    try {
      return localStorage.getItem(SAVE_KEY) != null;
    } catch {
      return false;
    }
  }

  static clear(): void {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch (err) {
      console.warn("[SaveService] 清空失败：", err);
    }
  }
}
