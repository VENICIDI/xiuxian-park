import { beforeEach, describe, expect, it, vi } from "vitest";
import { SaveService, DEFAULT_SETTINGS } from "../src/game/services/SaveService";
import { applyDraft, resolveDay } from "../src/game/controllers/TurnController";
import { newGame } from "./helpers";

// 简易 localStorage mock
class MemStorage {
  private map = new Map<string, string>();
  getItem(k: string) {
    return this.map.has(k) ? this.map.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
}

beforeEach(() => {
  vi.stubGlobal("localStorage", new MemStorage());
});

describe("存档", () => {
  it("无存档时返回 empty", () => {
    expect(SaveService.load()).toMatchObject({ ok: false, reason: "empty" });
  });

  it("保存后可正确读取并还原状态", () => {
    const s = newGame(2024);
    SaveService.save(s, DEFAULT_SETTINGS);
    const res = SaveService.load();
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.envelope.state.seed).toBe(s.seed);
      expect(res.envelope.state.day).toBe(s.day);
      expect(res.envelope.state.board.length).toBe(48);
    }
  });

  it("损坏的存档不会崩溃且报告 corrupt", () => {
    localStorage.setItem("xian-park:save:v1", "{not valid json");
    expect(SaveService.load()).toMatchObject({ ok: false, reason: "corrupt" });
  });

  it("读取的存档可继续推进天数", () => {
    let s = newGame(2024);
    const resolved = resolveDay(s);
    s = resolved.nextState;
    if (s.phase === "drafting") {
      s = applyDraft(s, s.pendingDraft[0]);
    }
    SaveService.save(s, DEFAULT_SETTINGS);
    const res = SaveService.load();
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.envelope.state.day).toBeGreaterThanOrEqual(1);
  });
});
