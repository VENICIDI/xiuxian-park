import type { DailyEventDefinition } from "../models/daily-event";

export const DAILY_EVENTS: DailyEventDefinition[] = [
  {
    id: "none",
    name: "风平浪静",
    description: "今日无事发生，专心经营。",
    negative: false,
    effect: { kind: "none" },
    weight: 30,
  },
  {
    id: "auspicious",
    name: "天降祥瑞",
    description: "灵气充沛，今日全场收益 +25%。",
    negative: false,
    effect: { kind: "globalRevenueMultiplier", value: 0.25 },
    weight: 12,
  },
  {
    id: "sect-gathering",
    name: "宗门团建",
    description: "各派弟子结伴而来，今日全场收益 +15%。",
    negative: false,
    effect: { kind: "globalRevenueMultiplier", value: 0.15 },
    weight: 12,
  },
  {
    id: "demonic-night",
    name: "魔修夜场",
    description: "夜场开放，今日游客数量 +50%。",
    negative: false,
    effect: { kind: "visitorCountMultiplier", value: 0.5 },
    weight: 10,
  },
  {
    id: "early-tribulation",
    name: "雷劫提前",
    description: "雷云压顶，全场刺激值提升（有人爱有人怕）。",
    negative: false,
    effect: { kind: "extraThrill", value: 20 },
    weight: 10,
  },
  {
    id: "immortal-inspection",
    name: "仙盟检查",
    description: "仙盟突击检查，今日收益被罚没 20%。",
    negative: true,
    effect: { kind: "revenuePenalty", value: 0.2 },
    weight: 10,
  },
  {
    id: "furnace-explosion",
    name: "炼丹炸炉",
    description: "有丹炉炸膛，随机 1 座建筑今日停业。",
    negative: true,
    effect: { kind: "disableRandomBuilding", count: 1 },
    weight: 10,
  },
];

export const getDailyEvent = (id: string | null): DailyEventDefinition =>
  DAILY_EVENTS.find((e) => e.id === id) ?? DAILY_EVENTS[0];
