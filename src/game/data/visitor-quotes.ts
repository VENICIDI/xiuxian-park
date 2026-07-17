import type { Sect } from "../models/visitor";
import { SECT_DEFINITIONS } from "./visitors";

/**
 * 世界聊天框 / 游客反馈的文案库（纯数据，不引用 Phaser）。
 * 按事件类型提供若干口语化模板，随机组合出修仙主题的游客吐槽与公告。
 *   {n} = 门派称呼（如「剑修道友」） {b} = 建筑名 {amt} = 金额（灵石）
 */

const pick = <T>(arr: readonly T[]): T =>
  arr[Math.floor(Math.random() * arr.length)];

const fill = (tpl: string, vars: Record<string, string | number>): string =>
  tpl.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));

/** 门派称呼：门派名 + 随机身份后缀，制造“众多散修”的世界感。 */
const HONORIFICS = ["道友", "散修", "前辈", "小友", "弟子", "真人", "同道"];

export function sectName(sect: Sect): string {
  return SECT_DEFINITIONS[sect].name + pick(HONORIFICS);
}

export function sectColor(sect: Sect): number {
  return SECT_DEFINITIONS[sect].color;
}

const GREETING = [
  "{n}踏云而来，四处张望寻个好去处。",
  "{n}：听闻此地灵气充沛，特来一游。",
  "{n}掐指一算，今日宜游园。",
  "{n}背着剑匣进园了，气度不凡。",
  "{n}：这园子的阵法布置有点意思。",
  "{n}随人流入场，嘴里念念有词。",
];

const PRAISE = [
  "{n}在「{b}」玩得不亦乐乎，甩出 {amt} 灵石。",
  "{n}：「{b}」果然名不虚传！打赏 {amt} 灵石。",
  "{n}在「{b}」排了半个时辰的队，值了，花 {amt} 灵石。",
  "{n}对「{b}」赞不绝口，随手撒了 {amt} 灵石。",
  "{n}：这「{b}」比我闭关有趣多了，{amt} 灵石拿去！",
  "{n}被「{b}」勾住了魂，续了 {amt} 灵石。",
  "{n}在「{b}」拍照留念，顺手消费 {amt} 灵石。",
];

const COMPLAINT_B = [
  "{n}：「{b}」和我道心不合，扫兴。",
  "{n}在「{b}」前皱起了眉，转身就走。",
  "{n}：「{b}」也太无聊了，白来一趟。",
  "{n}嫌「{b}」灵气太杂，摇头离开。",
  "{n}：早知「{b}」这样，还不如去闭关。",
];

const COMPLAINT = [
  "{n}逛了一圈，似乎不太满意。",
  "{n}：这园子好像少了点什么……",
  "{n}打了个哈欠，兴致缺缺。",
  "{n}嘟囔着灵石不经花。",
];

const THUNDER = [
  "{n}在「{b}」正撞上雷劫，吓得魂飞魄散又直呼过瘾！",
  "轰隆——「{b}」雷光大作，{n}尖叫连连。",
  "{n}：「{b}」这雷劫太刺激了，值回票价！",
  "{n}被「{b}」的天雷劈得外焦里嫩，却笑得合不拢嘴。",
];

const DISABLED = [
  "【公告】「{b}」今日突发状况，暂停开放。",
  "【公告】「{b}」灵阵失稳，临时停业检修。",
  "【公告】「{b}」出了岔子，弟子们正在抢修。",
];

const DAILY_EVENT = ["【园区】{e}", "【天象】{e}", "【公告】{e}"];

const SUMMARY_GOOD = [
  "【日结】第 {day} 天客似云来，进账 {amt} 灵石。",
  "【日结】第 {day} 天生意兴隆，净赚 {amt} 灵石。",
  "【日结】第 {day} 天香火鼎盛，收得 {amt} 灵石。",
];

const SUMMARY_BAD = [
  "【日结】第 {day} 天门可罗雀，仅得 {amt} 灵石。",
  "【日结】第 {day} 天入不敷出，账上 {amt} 灵石。",
  "【日结】第 {day} 天惨淡经营，进账 {amt} 灵石。",
];

export function greetingQuote(sect: Sect): string {
  return fill(pick(GREETING), { n: sectName(sect) });
}

export function praiseQuote(sect: Sect, building: string, amount: number): string {
  return fill(pick(PRAISE), { n: sectName(sect), b: building, amt: amount });
}

export function complaintQuote(sect: Sect, building?: string): string {
  const tpl = building ? pick(COMPLAINT_B) : pick(COMPLAINT);
  return fill(tpl, { n: sectName(sect), b: building ?? "" });
}

export function thunderQuote(sect: Sect, building: string): string {
  return fill(pick(THUNDER), { n: sectName(sect), b: building });
}

export function disabledQuote(building: string): string {
  return fill(pick(DISABLED), { b: building });
}

export function dailyEventQuote(eventName: string): string {
  return fill(pick(DAILY_EVENT), { e: eventName });
}

export function daySummaryQuote(day: number, revenue: number): string {
  const tpl = revenue > 0 ? pick(SUMMARY_GOOD) : pick(SUMMARY_BAD);
  return fill(tpl, { day, amt: revenue });
}
