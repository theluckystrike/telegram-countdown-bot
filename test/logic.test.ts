import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildGuestReply, canCreateCountdown, cardText, chosenEmoji, computeRemaining, decodeChatId, encodeChatId,
  isSourcePayload, parseCountdown, parseTz, remainingChanged, selectCronWindow, SOURCE_PAYLOAD_RE,
} from "../src/logic.ts";

const DAY = 86_400;

test("date+time parsing: with explicit time, tz applied correctly", () => {
  // tz +2: "2026-12-25 18:00" local == 16:00 UTC.
  const now = Date.UTC(2026, 0, 1) / 1000;
  const p = parseCountdown("2026-12-25 18:00 Launch", now, 120);
  assert.ok(p);
  assert.equal(p!.title, "Launch");
  assert.equal(p!.whenTs, Date.UTC(2026, 11, 25, 16, 0) / 1000);
});

test("date parsing without time defaults to local midnight in the chat's tz", () => {
  const now = Date.UTC(2026, 0, 1) / 1000;
  const p = parseCountdown("2026-12-25 Christmas", now, -300); // UTC-5
  assert.ok(p);
  assert.equal(p!.title, "Christmas");
  // local midnight Dec 25 in UTC-5 is 05:00 UTC.
  assert.equal(p!.whenTs, Date.UTC(2026, 11, 25, 5, 0) / 1000);
});

test("a target date already in the past is rejected", () => {
  const now = Date.UTC(2026, 5, 1) / 1000;
  assert.equal(parseCountdown("2026-01-01 New Year", now, 0), null);
  assert.equal(parseCountdown("not a date at all", now, 0), null);
  assert.equal(parseCountdown("2026-12-25", now, 0), null); // no title
});

test("a rolled-over calendar date is rejected, not silently normalized", () => {
  const now = Date.UTC(2026, 0, 1) / 1000;
  // February never has 31 days: Date.UTC would otherwise silently roll this into March 3.
  assert.equal(parseCountdown("2026-02-31 Launch", now, 0), null);
  // Month 13 doesn't exist: Date.UTC would otherwise roll it into January of next year.
  assert.equal(parseCountdown("2026-13-05 Launch", now, 0), null);
  // A real leap-day target is still accepted.
  const leap = parseCountdown("2028-02-29 Launch", now, 0);
  assert.ok(leap);
  assert.equal(leap!.whenTs, Date.UTC(2028, 1, 29) / 1000);
});

test("emoji prefix parsing: custom emoji stripped from the date/title, absent when omitted", () => {
  const now = Date.UTC(2026, 0, 1) / 1000;
  const withEmoji = parseCountdown("🎄 2026-12-25 Christmas", now, 0);
  assert.equal(withEmoji?.emoji, "🎄");
  assert.equal(withEmoji?.title, "Christmas");
  const withoutEmoji = parseCountdown("2026-12-25 Christmas", now, 0);
  assert.equal(withoutEmoji?.emoji, null);
});

test("chosenEmoji: custom emoji only applies on a Pro chat, else the default target", () => {
  assert.equal(chosenEmoji("🎄", true), "🎄");
  assert.equal(chosenEmoji("🎄", false), "🎯");
  assert.equal(chosenEmoji(null, true), "🎯");
});

test("days remaining across UTC math with a tz offset baked into the target timestamp", () => {
  const whenTs = Date.UTC(2026, 11, 25) / 1000; // midnight UTC target
  const now = whenTs - 113 * DAY; // exactly 113 days out
  const r = computeRemaining(now, whenTs, false);
  assert.deepEqual(r, { unit: "d", value: 113, done: false });
});

test("hours remaining once under 2 days, only when hourPrecision (Pro) is set", () => {
  const whenTs = Date.UTC(2026, 11, 25) / 1000;
  const now = whenTs - 26 * 3600; // 26h out
  assert.deepEqual(computeRemaining(now, whenTs, true), { unit: "h", value: 26, done: false });
  // Without Pro precision, the same gap still reports in days.
  assert.deepEqual(computeRemaining(now, whenTs, false), { unit: "d", value: 2, done: false });
});

test("zero (or past) is reported as done, and cardText renders the 'it's time' line", () => {
  const whenTs = 1_000_000;
  assert.deepEqual(computeRemaining(whenTs, whenTs, true), { unit: "d", value: 0, done: true });
  assert.deepEqual(computeRemaining(whenTs + 10, whenTs, true), { unit: "d", value: 0, done: true });
  assert.equal(cardText("🎯", "Christmas", { unit: "d", value: 0, done: true }), "🎉 It's time: Christmas!");
  assert.equal(cardText("🎯", "Christmas", { unit: "d", value: 113, done: false }), "🎯 Christmas — 113 days");
});

test("text-changed check: cron only re-edits a card when the displayed value actually moves", () => {
  const a = { unit: "d" as const, value: 113, done: false };
  assert.equal(remainingChanged(a, { unit: "d", value: 113, done: false }), false);
  assert.equal(remainingChanged(a, { unit: "d", value: 112, done: false }), true);
  assert.equal(remainingChanged(a, { unit: "h", value: 113, done: false }), true);
  assert.equal(remainingChanged(a, { unit: "d", value: 113, done: true }), true);
});

test("free cap: a free chat is capped, a Pro chat is never capped", () => {
  assert.equal(canCreateCountdown(0, false, 2), true);
  assert.equal(canCreateCountdown(1, false, 2), true);
  assert.equal(canCreateCountdown(2, false, 2), false);
  assert.equal(canCreateCountdown(50, true, 2), true);
});

test("deep-link chat-id encoding round-trips, including negative group ids", () => {
  assert.equal(encodeChatId(-1001234567890), "m1001234567890");
  assert.equal(decodeChatId("m1001234567890"), -1001234567890);
  assert.equal(decodeChatId("42"), 42);
  assert.equal(decodeChatId("not-an-id"), null);
});

test("source-payload regex: short lowercase tags accepted, reserved/invalid payloads rejected", () => {
  assert.ok(SOURCE_PAYLOAD_RE.test("site"));
  assert.ok(isSourcePayload("share"));
  assert.equal(isSourcePayload("pro"), false); // reserved
  assert.equal(isSourcePayload("pro_m123"), false); // per-chat pro payload, not a source
  assert.equal(isSourcePayload("Site"), false); // must be lowercase
  assert.equal(isSourcePayload(""), false);
});

test("selectCronWindow: rotates through the full active set instead of starving the tail", () => {
  const rows = Array.from({ length: 5 }, (_, i) => ({ id: i + 1 })); // ids 1..5
  // cursor=0, limit=2 -> first pass takes 1,2.
  const first = selectCronWindow(rows, 0, 2);
  assert.deepEqual(first.map((r) => r.id), [1, 2]);
  // cursor=2 (after that pass), limit=2 -> next pass takes 3,4, not stuck back at 1,2.
  const second = selectCronWindow(rows, 2, 2);
  assert.deepEqual(second.map((r) => r.id), [3, 4]);
  // cursor=4, limit=2 -> takes the tail (5) then wraps back to the front (1) instead of
  // returning nothing once the cursor is near the end.
  const third = selectCronWindow(rows, 4, 2);
  assert.deepEqual(third.map((r) => r.id), [5, 1]);
  // cursor past every id (e.g. after a delete) still wraps to the front cleanly.
  const wrapped = selectCronWindow(rows, 99, 2);
  assert.deepEqual(wrapped.map((r) => r.id), [1, 2]);
});

test("/ctz timezone parsing accepts common forms and rejects out-of-range offsets", () => {
  assert.equal(parseTz("+2"), 120);
  assert.equal(parseTz("-5:30"), -330);
  assert.equal(parseTz("utc+9"), 540);
  assert.equal(parseTz("+15"), null);
  assert.equal(parseTz("garbage"), null);
});

test("buildGuestReply: a parseable date returns a value card, no parse_mode", () => {
  const pitch = { title: "pitch", description: "d", text: "p" };
  const nowSec = Date.UTC(2026, 0, 1) / 1000;
  const r = buildGuestReply("2026-12-25 Christmas", nowSec, pitch);
  assert.notEqual(r, pitch);
  assert.match(r.title, /Christmas/);
  assert.match(r.text, /Christmas/);
  assert.match(r.text, /Read as UTC\./);
  assert.ok(!("parse_mode" in r));
  assert.equal("buttons" in r, false, "buttons are appended by wireGuest, not the pure builder");
});
test("buildGuestReply: garbage or a past date falls back to the pitch", () => {
  const pitch = { title: "pitch", description: "d", text: "p" };
  const nowSec = Date.UTC(2026, 0, 1) / 1000;
  assert.equal(buildGuestReply("not a date", nowSec, pitch), pitch);
  assert.equal(buildGuestReply("", nowSec, pitch), pitch);
  assert.equal(buildGuestReply("2020-01-01 old", nowSec, pitch), pitch);
});
