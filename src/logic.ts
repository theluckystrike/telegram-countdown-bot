/** Pure parsing / formatting / business-rule helpers for CountdownBot. No I/O, no imports across dirs. */
import type { GuestReply } from "./guest.ts";

const MIN = 60;
const HOUR = 3600;
const DAY = 86_400;
const TWO_DAYS = 2 * DAY;
const DEFAULT_EMOJI = "🎯";

export interface ParsedCountdown { emoji: string | null; whenTs: number; title: string; }

function clock(s: string): number | null {
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (h > 23 || mi > 59) return null;
  return h * HOUR + mi * MIN;
}

/** Leading single emoji + whitespace, e.g. "🎄 2026-12-25 Christmas" -> {emoji: "🎄", rest: "2026-12-25 Christmas"}. */
function stripEmoji(text: string): { emoji: string | null; rest: string } {
  const m = text.match(/^(\p{Extended_Pictographic}️?)\s+(.*)$/u);
  return m ? { emoji: m[1], rest: m[2] } : { emoji: null, rest: text };
}

/** "2026-12-25 Christmas" or "2026-12-25 18:00 Launch" (optional emoji prefix, tz applies
 *  when no explicit time is given -> local midnight; whenTs computed as a UTC unix second).
 *  Rejects an empty/too-long title, an unparseable date, or a target already in the past. */
export function parseCountdown(text: string, nowSec: number, tzMin: number): ParsedCountdown | null {
  const trimmed = text.trim();
  if (trimmed.length === 0 || trimmed.length > 500) return null;
  const { emoji, rest } = stripEmoji(trimmed);
  const m = rest.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{1,2}:\d{2}))?\s+(.+)$/s);
  if (!m) return null;
  const [, y, mo, d, hm, titleRaw] = m;
  const tod = hm ? clock(hm) : 0;
  if (tod === null) return null;
  const yNum = Number(y), moNum = Number(mo), dNum = Number(d);
  const baseMs = Date.UTC(yNum, moNum - 1, dNum);
  if (Number.isNaN(baseMs)) return null;
  // Date.UTC silently rolls a bad day/month over into the next one (e.g. 2026-02-31 becomes
  // 2026-03-03) — reject anything that doesn't round-trip back to the digits the user typed.
  const dt = new Date(baseMs);
  if (dt.getUTCFullYear() !== yNum || dt.getUTCMonth() !== moNum - 1 || dt.getUTCDate() !== dNum) return null;
  const base = baseMs / 1000;
  const whenTs = base + tod - tzMin * MIN;
  const title = titleRaw.trim().slice(0, 200);
  if (title.length === 0 || whenTs <= nowSec) return null;
  return { emoji, whenTs, title };
}

export function parseTz(s: string): number | null {
  const m = s.trim().match(/^(?:utc)?\s*([+-])?(\d{1,2})(?::?(\d{2}))?$/i);
  if (!m) return null;
  const sign = m[1] === "-" ? -1 : 1;
  const h = Number(m[2]);
  const mi = Number(m[3] ?? "0");
  if (h > 14 || mi > 59) return null;
  return sign * (h * 60 + mi);
}

/** Custom emoji is a Pro perk; free chats always render the default target emoji. */
export function chosenEmoji(parsedEmoji: string | null, pro: boolean): string {
  return pro && parsedEmoji ? parsedEmoji : DEFAULT_EMOJI;
}

export type Unit = "d" | "h";
export interface Remaining { unit: Unit; value: number; done: boolean; }

/** Days (default) or hours (Pro, once under 2 days) remaining until `whenTs`. `done` once
 *  the target has passed. DST-free UTC math throughout: tz only shifted the target when it
 *  was parsed, so no further tz handling is needed here. */
export function computeRemaining(nowSec: number, whenTs: number, hourPrecision: boolean): Remaining {
  const diff = whenTs - nowSec;
  if (diff <= 0) return { unit: "d", value: 0, done: true };
  if (hourPrecision && diff < TWO_DAYS) return { unit: "h", value: Math.max(1, Math.ceil(diff / HOUR)), done: false };
  return { unit: "d", value: Math.max(1, Math.ceil(diff / DAY)), done: false };
}

/** True when a freshly computed remaining differs from what's already on the card/row —
 *  the cron loop uses this to skip an edit call whose text wouldn't actually change. */
export function remainingChanged(prev: Remaining, next: Remaining): boolean {
  return prev.unit !== next.unit || prev.value !== next.value || prev.done !== next.done;
}

/** The card's plain-text body. No parse_mode: title is user-supplied. */
export function cardText(emoji: string, title: string, r: Remaining): string {
  if (r.done) return `🎉 It's time: ${title}!`;
  const unit = r.unit === "d" ? (r.value === 1 ? "day" : "days") : (r.value === 1 ? "hour" : "hours");
  return `${emoji} ${title} — ${r.value} ${unit}`;
}

/** Free chats may hold at most `limit` active (not done, not stopped) countdowns. */
export function canCreateCountdown(activeCount: number, pro: boolean, limit = 2): boolean {
  return pro || activeCount < limit;
}

/** Deep-link encoding for a (possibly negative) chat id: "-" <-> "m" (Telegram start
 *  payloads only allow [A-Za-z0-9_-]). */
export const encodeChatId = (id: number): string => String(id).replace("-", "m");
export function decodeChatId(s: string): number | null {
  if (!/^m?\d+$/.test(s)) return null;
  const n = Number(s.startsWith("m") ? "-" + s.slice(1) : s);
  return Number.isFinite(n) ? n : null;
}

/** First-touch attribution payload on /start (e.g. "site", "share", "x"); never the
 *  reserved "pro" tag or a "pro_<id>" per-chat payload. */
export const SOURCE_PAYLOAD_RE = /^[a-z]{2,12}$/;
export function isSourcePayload(s: string): boolean { return s !== "pro" && SOURCE_PAYLOAD_RE.test(s); }

/** Picks the next `limit` rows for a cron pass, rotating through `rows` (sorted by id) by a
 *  stored `cursor` id instead of always taking the same fixed slice — so a fleet with more
 *  than `limit` active rows still visits every row over successive runs instead of starving
 *  whatever falls past the cutoff. Wraps back to the start once the cursor nears the end. */
export function selectCronWindow<T extends { id: number }>(rows: T[], cursor: number, limit: number): T[] {
  const after = rows.filter((r) => r.id > cursor);
  const before = rows.filter((r) => r.id <= cursor);
  return [...after, ...before].slice(0, limit);
}

/** Pure Guest Mode reply builder. A guest has no saved chat timezone, so the date is read
 * as UTC (tzMin=0) and the card says so; custom emoji and hourly precision are Pro perks
 * that never apply here. Falls back to `pitch` for anything that doesn't parse. */
export function buildGuestReply(q: string, nowSec: number, pitch: GuestReply): GuestReply {
  const parsed = q ? parseCountdown(q, nowSec, 0) : null;
  if (!parsed) return pitch;
  const emoji = chosenEmoji(parsed.emoji, false);
  const r = computeRemaining(nowSec, parsed.whenTs, false);
  const unit = r.unit === "d" ? "days" : "hours";
  return {
    title: `${emoji} ${parsed.title}`,
    description: r.done ? "It's time" : `${r.value} ${unit} to go`,
    text: cardText(emoji, parsed.title, r) + "\n\nRead as UTC.",
  };
}
