import { Bot, Context, InlineKeyboard } from "grammy";
import { Env as KitEnv, PRO_STARS, ProSpec, displayName, isPrivate, makeFetch, now, preparedShare, sendInvoice, wirePro } from "./kit.ts";
import { Store, CountdownRow } from "./db.ts";
import { GuestReply, queryText, wireGuest, wireInline } from "./guest.ts";
import {
  Remaining, buildGuestReply, canCreateCountdown, cardText, chosenEmoji, computeRemaining, decodeChatId, encodeChatId,
  isSourcePayload, parseCountdown, parseTz, remainingChanged,
} from "./logic.ts";
import { APP_HTML, buildShareText, handleProLink, initDataFailure, validateInitData } from "./webapp.ts";
import type { ProLinkBody } from "./webapp.ts";
import type { ProPlan } from "./webapp-i18n.ts";
import { isQaId } from "./webapp-i18n.ts";
import { BOT, publicLink } from "./botname.ts";
import { resolveLang, t } from "./i18n.ts";
export { Store };

const FREE_ACTIVE = 2;
// Pseudo-sender ids that must never be treated as a real person: GroupAnonymousBot (a
// group's "send as anonymous admin"), Channel_Bot (a message sent on behalf of a linked
// channel), and Telegram's own service account.
const PSEUDO_SENDER_IDS = new Set([1087968824, 136817688, 777000]);
interface Env extends KitEnv { STORE: DurableObjectNamespace<Store>; }
const store = (env: Env) => env.STORE.get(env.STORE.idFromName("main"));

/** True for a real, identifiable human sender: not a channel post, not a pseudo-sender
 *  (see PSEUDO_SENDER_IDS), not a bot, and not a message relayed via another bot's inline
 *  result. Narrows ctx.from to non-null so handlers never need `ctx.from!`. */
function fromReal<C extends Context>(ctx: C): ctx is C & { from: NonNullable<C["from"]> } {
  const f = ctx.from;
  if (!f || f.is_bot || PSEUDO_SENDER_IDS.has(f.id)) return false;
  return !ctx.message?.via_bot;
}

const PRO: ProSpec = {
  title: "CountdownBot Pro (this chat)",
  description: "Unlimited countdowns, custom emoji, hourly precision and a share button for one chat. One-time payment, no subscription.",
  payload: "cd-pro",
  thanks: "✅ Pro unlocked for this chat. Unlimited countdowns, custom emoji, hourly precision + share button.\n\n/more — more free tools",
};
const helpText = (lang: string): string => t(lang, "help", { free: FREE_ACTIVE, stars: PRO_STARS });
/** YYYY-MM-DD (UTC) 90 days from now, used as a always-future example date in the `start` card. */
const exampleDate = (): string => new Date((now() + 90 * 86400) * 1000).toISOString().slice(0, 10);
const startText = (lang: string): string => t(lang, "start", { free: FREE_ACTIVE, stars: PRO_STARS, date: exampleDate() });
const MORE_TEXT = "More free tools by the same maker:\n🔒 @WhisperLockBot — locked messages only one person can open\n⏰ @NudgeRemindBot — reminders that arrive on time\n📮 @AnonInboxProBot — anonymous inbox via your link\n🧾 @SplitTabsBot — split group expenses\n🔥 @HabitStreakProBot — habit streaks with daily check-ins";
const SHARE_PITCH = "Live countdown cards for the date that matters — right in the chat.";
const shareUrl = (bot: string, text: string): string =>
  `https://t.me/share/url?url=${encodeURIComponent(`https://t.me/${bot}`)}&text=${encodeURIComponent(text)}`;

const proKb = (chatId: number, lang: string): InlineKeyboard =>
  new InlineKeyboard().url(t(lang, "btn_unlockProStars", { stars: PRO_STARS }), `https://t.me/${BOT}?start=pro_${encodeChatId(chatId)}`);
/** Pro-chat perk: a share button carrying the card's own text. Undefined (no keyboard) for
 *  a free chat — the card stays plain text with no attached buttons. */
function cardKb(text: string, pro: boolean): InlineKeyboard | undefined {
  return pro ? new InlineKeyboard().url("↗️ Share", shareUrl(BOT, text)) : undefined;
}

async function isGroupAdmin(ctx: Context, chatId: number, userId: number): Promise<boolean> {
  try {
    const m = await ctx.api.getChatMember(chatId, userId);
    return m.status === "creator" || m.status === "administrator";
  } catch { return false; }
}

async function onCountdown(ctx: Context, env: Env): Promise<void> {
  const from = ctx.from;
  if (!from) return;
  const chat = ctx.chat!;
  await store(env).touchUser(from.id, from.username, displayName(from));
  const g = await store(env).touchGroup(chat.id, "title" in chat ? chat.title ?? "" : "");
  const lang = resolveLang(from.language_code);
  const parsed = parseCountdown(String(ctx.match ?? ""), now(), g.tz_min);
  if (!parsed) { await ctx.reply(t(lang, "usage")); return; }
  const active = await store(env).countActive(chat.id);
  if (!canCreateCountdown(active, g.pro === 1, FREE_ACTIVE)) {
    await store(env).track(from.id, "pro_prompt");
    await ctx.reply(t(lang, "limitReached", { free: FREE_ACTIVE, stars: PRO_STARS }), { reply_markup: proKb(chat.id, lang) });
    return;
  }
  const emoji = chosenEmoji(parsed.emoji, g.pro === 1);
  await store(env).track(from.id, "action");
  const id = await store(env).createCountdown(chat.id, from.id, displayName(from), g.tz_min, emoji, parsed.title, parsed.whenTs);
  const row = await store(env).getCountdown(id);
  if (!row) return;
  const r = computeRemaining(now(), row.when_ts, g.pro === 1);
  const text = cardText(row.emoji, row.title, r);
  const msg = await ctx.reply(text, { reply_markup: cardKb(text, g.pro === 1) });
  await store(env).setMessageId(id, msg.message_id);
  await store(env).markProgress(id, r.unit, r.value);
}

async function onCountdowns(ctx: Context, env: Env): Promise<void> {
  const chat = ctx.chat!;
  const lang = resolveLang(ctx.from?.language_code);
  const g = await store(env).getGroup(chat.id);
  const list = await store(env).listActive(chat.id);
  if (!list.length) { await ctx.reply(t(lang, "noActiveCountdowns")); return; }
  const lines = list.map((c) => {
    const r = computeRemaining(now(), c.when_ts, (g?.pro ?? 0) === 1);
    return `#${c.id} ${c.emoji} ${c.title} — ${r.value} ${r.unit === "d" ? "days" : "hours"}`;
  });
  await ctx.reply("📋 Active countdowns\n" + lines.join("\n"));
}

async function onStop(ctx: Context, env: Env): Promise<void> {
  const from = ctx.from;
  if (!from) return;
  const chat = ctx.chat!;
  const lang = resolveLang(from.language_code);
  const id = Number(String(ctx.match ?? "").trim().replace("#", ""));
  const row = id > 0 ? await store(env).getCountdown(id) : null;
  if (!row || row.chat_id !== chat.id || row.status !== "active") { await ctx.reply(t(lang, "stopUsage")); return; }
  if (row.creator_id !== from.id) {
    const member = await ctx.api.getChatMember(chat.id, from.id).catch(() => null);
    const isAdmin = member && (member.status === "administrator" || member.status === "creator");
    if (!isAdmin) { await ctx.reply(t(lang, "stopNotAllowed")); return; }
  }
  await store(env).stopCountdown(id);
  await ctx.reply(`🛑 #${id} ${row.title} stopped.`);
  if (row.message_id) {
    try { await ctx.api.editMessageText(row.chat_id, row.message_id, `🛑 Stopped\n${row.emoji} ${row.title}`); } catch { /* best effort */ }
  }
}

/** Hourly cron: recompute remaining time for every active countdown and edit its card only
 *  when the displayed value actually changed. Bounded to 500 rows per run. */
async function tick(env: Env): Promise<number> {
  const bot = new Bot(env.BOT_TOKEN);
  const rows = await store(env).activeForCron(500);
  const nowSec = now();
  const proCache = new Map<number, boolean>();
  let edits = 0;
  for (const row of rows) {
    let pro = proCache.get(row.chat_id);
    if (pro === undefined) {
      const g = await store(env).getGroup(row.chat_id);
      pro = (g?.pro ?? 0) === 1;
      proCache.set(row.chat_id, pro);
    }
    const r = computeRemaining(nowSec, row.when_ts, pro);
    const prev: Remaining = { unit: row.last_unit, value: row.last_value, done: false };
    if (!remainingChanged(prev, r)) continue;
    edits += 1;
    if (row.message_id) {
      const text = cardText(row.emoji, row.title, r);
      try { await bot.api.editMessageText(row.chat_id, row.message_id, text, { reply_markup: cardKb(text, pro) }); }
      catch (err) { console.log("tick edit failed", row.id, String(err).slice(0, 100)); }
    }
    if (r.done) await store(env).markDone(row.id); else await store(env).markProgress(row.id, r.unit, r.value);
  }
  if (edits > 0) await store(env).incrCounter("edits", edits);
  return edits;
}

async function onStart(ctx: Context & { from: NonNullable<Context["from"]> }, env: Env): Promise<void> {
  const from = ctx.from;
  await store(env).touchUser(from.id, from.username, displayName(from));
  await store(env).track(from.id, "start");
  const lang = resolveLang(from.language_code);
  const payload = String(ctx.match ?? "");
  const match = payload.match(/^pro_(m?\d+)$/);
  const chatId = match ? decodeChatId(match[1]) : null;
  if (chatId !== null && isPrivate(ctx)) {
    const member = await ctx.api.getChatMember(chatId, from.id).catch(() => null);
    if (!member || member.status === "left" || member.status === "kicked") {
      await ctx.reply(t(lang, "needMember"));
      return;
    }
    const spec: ProSpec = { ...PRO, description: t(lang, "proDescription") };
    await sendInvoice(ctx, spec, "cd-pro:" + chatId, (s) => store(env).track(from.id, s));
    return;
  }
  if (isSourcePayload(payload)) await store(env).recordSource(from.id, payload);
  const kb = new InlineKeyboard().url(t(lang, "btn_addToGroup"), `https://t.me/${BOT}?startgroup=true`);
  if (isPrivate(ctx)) kb.row().url(t(lang, "btn_shareBot"), shareUrl(BOT, SHARE_PITCH));
  await ctx.reply(startText(lang), { parse_mode: "Markdown", reply_markup: kb });
}

/** Group-safe /pro: never sendInvoice in a group (Telegram rejects XTR invoices there) and
 *  never runs for a pseudo-sender (anonymous admin, channel post, via_bot relay) — see
 *  buildBot(), where this is registered on the raw bot ahead of wirePro so kit's own
 *  unfiltered /pro (which would invoice unconditionally and can throw on ctx.from for a
 *  channel post) never gets a chance to run. */
async function onPro(ctx: Context, env: Env): Promise<void> {
  if (!fromReal(ctx)) return;
  const from = ctx.from;
  const lang = resolveLang(from.language_code);
  if (isPrivate(ctx)) {
    const spec: ProSpec = { ...PRO, description: t(lang, "proDescription") };
    await sendInvoice(ctx, spec, "cd-pro:" + ctx.chat!.id, (s) => store(env).track(from.id, s));
    return;
  }
  await ctx.reply(t(lang, "proGroupInfo", { stars: PRO_STARS }), { reply_markup: proKb(ctx.chat!.id, lang) });
}

/** Handles `cd-pro:<chatId>` (a group's Pro purchase, made from the buyer's private chat via
 *  the onStart deep link) and the plain per-user payload (a private chat's own Pro purchase). */
function onPaid(env: Env): (ctx: Context, payload: string, charge: string) => Promise<void> {
  return async (ctx, payload, charge) => {
    const from = ctx.from;
    if (!from) return;
    const match = payload.match(/^cd-pro:(-?\d+)$/);
    if (match) await store(env).setGroupPro(Number(match[1]), charge); else await store(env).setPro(from.id, charge);
    // kit.ts always sends its own (English) spec.thanks after onPaid resolves; for a
    // non-English payer we send a localized thank-you first so they get at least one
    // message in their language.
    const lang = resolveLang(from.language_code);
    if (lang !== "en") await ctx.reply(t(lang, "thankYou"));
  };
}

/** Static copy for a guest chat, with the Markdown the i18n table carries stripped: guest
 * results are posted as plain text (the query is user-supplied and may contain _ or *). */
const plain = (s: string): string => s.replaceAll("*", "").replaceAll("`", "");

/** Guest Mode: someone @-mentioned us in a chat we were never added to. The parse-and-format
 * math (parses -> value card, garbage -> pitch) lives in the pure, unit-tested
 * `buildGuestReply` in logic.ts; this just gathers the query text and the caller's language. */
async function onGuest(ctx: Context, env: Env): Promise<GuestReply> {
  const lang = resolveLang(ctx.from?.language_code);
  const q = queryText(ctx, BOT);
  const pitch: GuestReply = { title: "⏳ Countdown — one date, one card", description: "Try: @" + BOT + " 2026-12-25 Christmas", text: plain(startText(lang)) };
  return buildGuestReply(q, now(), pitch);
}

function buildBot(env: Env): Bot {
  const bot = new Bot(env.BOT_TOKEN);
  // Registered first, on the RAW bot, before the `m` composer below even exists: grammY's
  // .command() matches a channel_post as well as a message (ctx.message ?? ctx.channelPost),
  // and a composer branch installed by .filter() runs at the position where .filter() was
  // called — so placing this after `m` would let m's own message:text fallback (for a real
  // sender) or kit's unfiltered bot.command("pro") (for a channel post / anonymous admin,
  // which never reaches `m`'s fromReal filter) intercept /pro first. Being first here means
  // this always wins, and kit's own bot.command("pro") (wired below) never runs.
  bot.command("pro", (ctx) => onPro(ctx, env));
  // Message updates only (never channel_post), and only real, identifiable senders
  // (no pseudo-senders, no bots, no via_bot relays) — see fromReal().
  const m = bot.on("message").filter(fromReal);
  m.command("start", (ctx) => onStart(ctx, env));
  m.command("help", (ctx) => ctx.reply(helpText(resolveLang(ctx.from.language_code)), { parse_mode: "Markdown" }));
  m.command("more", (ctx) => ctx.reply(MORE_TEXT));
  m.command("countdown", (ctx) => onCountdown(ctx, env));
  m.command("countdowns", (ctx) => onCountdowns(ctx, env));
  m.command("stop", (ctx) => onStop(ctx, env));
  m.command("ctz", async (ctx) => {
    const from = ctx.from;
    const lang = resolveLang(from.language_code);
    if (!isPrivate(ctx) && !(await isGroupAdmin(ctx, ctx.chat!.id, from.id))) { await ctx.reply(t(lang, "tzAdminOnly")); return; }
    const tz = parseTz(String(ctx.match ?? ""));
    if (tz === null) { await ctx.reply(t(lang, "tzUsage")); return; }
    const chat = ctx.chat!;
    await store(env).touchGroup(chat.id, "title" in chat ? chat.title ?? "" : "");
    await store(env).setGroupTz(chat.id, tz);
    await ctx.reply(t(lang, "tzSaved"));
  });
  // wirePro's own bot.command("pro") is shadowed by the one registered at the top of this
  // function (see the comment there) — it's kept here only for its pre_checkout_query and
  // message:successful_payment handlers.
  wirePro(bot, PRO, onPaid(env), (uid, s) => store(env).track(uid, s), true);
  wireGuest(bot, {
    botUsername: BOT,
    reply: (ctx) => onGuest(ctx, env),
    // `guest` is NOT written to `sources` here (REVIEW-GUEST F3): a summoner is not an
    // installer. src_guest is earned later, through the ?start=guest deep link in the
    // buttons below. recordGuest self-limits; `flood` downgrades us to the cheap pitch.
    record: async (uid, chatType, chatId) => {
      const r = await store(env).recordGuest(uid, chatType, chatId);
      if (r.recorded) await store(env).track(uid, "guest");
      return !r.flood;
    },
  });
  // Classic inline mode: the SAME reply builder, answered as an inline result. A user types
  // "@Bot query" in any chat on any client and posts the card with `via @Bot` attribution —
  // no admin, no membership, no Guest Chat Mode toggle. The destination chat is unknown, so
  // the card carries private-style buttons only. Counted under `inline_queries`; `sources` is
  // never written here (an inline user is not an installer, same rule as the guest path).
  wireInline(bot, {
    botUsername: BOT,
    reply: (ctx) => onGuest(ctx, env),
    record: async (uid) => !(await store(env).recordInline(uid)).flood,
    chosen: (uid) => store(env).recordInlineChosen(uid),
  });
  m.on("message:new_chat_members", (ctx) => {
    if (!ctx.message.new_chat_members.some((mem) => mem.id === ctx.me.id)) return;
    return ctx.reply(startText(resolveLang(ctx.from?.language_code)), { parse_mode: "Markdown" });
  });
  // Help fallback registered last, and private-chat only, so it never shadows a command or
  // payment handler and never fires for a group's ordinary chatter.
  m.on("message:text", async (ctx) => {
    if (!isPrivate(ctx)) return;
    await ctx.reply(helpText(resolveLang(ctx.from?.language_code)), { parse_mode: "Markdown" });
  });
  return bot;
}

/** POST /api/countdowns: one user's active countdowns, across every chat they created one
 * in. Each item carries its own `chat_id` + `pro` flag (Pro is per-chat, not per-user —
 * see groups.pro in db.ts) plus the fleet-wide `proStars` price, so the client can offer
 * "Unlock Pro" per not-yet-pro chat instead of one bot-wide block. */
async function api(req: Request, env: Env): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as { initData?: string };
  const user = await validateInitData(body.initData ?? "", [env.BOT_TOKEN, env.HUB_BOT_TOKEN].filter((t): t is string => !!t));
  if (!user) return Response.json(initDataFailure(body.initData ?? "", publicLink()), { status: 401 });
  await store(env).touchUser(user.id, user.username, user.username ? "@" + user.username : user.first_name);
  const rows = await store(env).myActive(user.id);
  const chatIds = [...new Set(rows.map((c: CountdownRow) => c.chat_id))];
  const proMap = await store(env).proMap(chatIds);
  const countdowns = rows.map((c: CountdownRow) => ({ id: c.id, emoji: c.emoji, title: c.title, when_ts: c.when_ts, chat_id: c.chat_id, pro: proMap[c.chat_id] ?? false }));
  return Response.json({ countdowns, proStars: PRO_STARS });
}

/** POST /api/share: registers a Bot API "prepared" inline message (savePreparedInlineMessage)
 * so the Mini App can hand its id to tg.shareMessage(id) for a native chat/group/channel share. */
async function apiShare(req: Request, env: Env): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as { initData?: string };
  const user = await validateInitData(body.initData ?? "", [env.BOT_TOKEN, env.HUB_BOT_TOKEN].filter((t): t is string => !!t));
  if (!user) return Response.json(initDataFailure(body.initData ?? "", publicLink()), { status: 401 });
  try {
    const share = await preparedShare(env, user.id, buildShareText(SHARE_PITCH, BOT, "shared"), `https://t.me/${BOT}`);
    await store(env).recordShare(user.id, "chat");
    return Response.json(share);
  } catch { return Response.json({ error: "Share unavailable." }, { status: 502 }); }
}

/** POST /api/share-story: records a "share to story" click. Telegram gives no server
 * callback for tg.shareToStory, so the client fires this right before calling it. */
async function apiShareStory(req: Request, env: Env): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as { initData?: string };
  const user = await validateInitData(body.initData ?? "", [env.BOT_TOKEN, env.HUB_BOT_TOKEN].filter((t): t is string => !!t));
  if (!user) return Response.json(initDataFailure(body.initData ?? "", publicLink()), { status: 401 });
  await store(env).recordShare(user.id, "story");
  return Response.json({ ok: true });
}

/** Mints the identical Stars invoice link countdown's existing chat-flow group purchase
 * mints (see onStart's "cd-pro:" + chatId branch and onPro's private-chat branch), so
 * successful_payment / setGroupPro keep recognizing the payload unchanged. */
function mintForChat(api: Bot["api"], plan: ProPlan, chatId: number): Promise<string> {
  return api.createInvoiceLink(PRO.title, PRO.description, "cd-pro:" + chatId, "", "XTR", [{ label: PRO.title, amount: PRO_STARS }]);
}

/** POST /api/pro-link: the Mini App's own Stars checkout (tg.openInvoice). Pro is per-chat
 * here, so the request body is extended with `chatId` (see ProLinkBody in webapp.ts) and a
 * missing/invalid chatId is a plain 400 — this route must never mint a bot-wide invoice. */
async function apiProLink(req: Request, env: Env): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as ProLinkBody;
  const tokens = [env.BOT_TOKEN, env.HUB_BOT_TOKEN].filter((t): t is string => !!t);
  const chatId = body.chatId;
  if (typeof chatId !== "number" || !Number.isFinite(chatId)) {
    // Unsigned → 401 and QA fixtures → {qa:true} must win over the 400, so validate first.
    const user = await validateInitData(body.initData ?? "", tokens);
    if (user && !isQaId(user.id)) return Response.json({ error: "chat required" }, { status: 400 });
  }
  return handleProLink(body, {
    tokens,
    botLink: publicLink(),
    allowMonthly: false,
    mint: (plan) => (typeof chatId === "number" ? mintForChat(new Bot(env.BOT_TOKEN).api, plan, chatId) : Promise.reject(new Error("chat required"))),
    track: (userId) => store(env).track(userId, "invoice"),
  });
}

const botFetch = makeFetch<Env>(buildBot, (env) => store(env).stats());
export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const path = new URL(req.url).pathname;
    if (path === "/app") return new Response(APP_HTML, { headers: { "content-type": "text/html; charset=utf-8" } });
    if (path === "/api/share" && req.method === "POST") return apiShare(req, env);
    if (path === "/api/share-story" && req.method === "POST") return apiShareStory(req, env);
    if (path === "/api/pro-link" && req.method === "POST") return apiProLink(req, env);
    if (path === "/api/countdowns" && req.method === "POST") return api(req, env);
    return botFetch(req, env);
  },
  async scheduled(_ev: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> { ctx.waitUntil(tick(env)); },
};
