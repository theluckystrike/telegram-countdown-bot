/** Telegram Mini App: initData validation (HMAC-SHA256, key "WebAppData") + tiny JSON API + HTML shell. */
import { publicLink, TITLE } from "./botname.ts";
import { appDict } from "./i18n.ts";
import { isQaId, normalizePlan, renderAppI18n } from "./webapp-i18n.ts";
import type { ProPlan } from "./webapp-i18n.ts";

const enc = new TextEncoder();
const hex = (b: ArrayBuffer): string => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");

async function hmac(key: ArrayBuffer | Uint8Array, msg: string): Promise<ArrayBuffer> {
  const k = await crypto.subtle.importKey("raw", key as BufferSource, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", k, enc.encode(msg));
}

export interface InitUser { id: number; first_name: string; username?: string; }

async function hashMatches(hash: string, dcs: string, token: string): Promise<boolean> {
  const secret = await hmac(enc.encode("WebAppData"), token);
  return hex(await hmac(secret, dcs)) === hash;
}

/** Returns the user if initData is authentic (signed by any of `tokens`, e.g. a bot's own
 * BOT_TOKEN plus a shared hub bot token) and younger than maxAgeSec, else null. */
export async function validateInitData(initData: string, tokens: string | string[], maxAgeSec = 86_400): Promise<InitUser | null> {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");
  const dcs = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join("\n");
  const list = Array.isArray(tokens) ? tokens : [tokens];
  let ok = false;
  for (const token of list) { if (await hashMatches(hash, dcs, token)) { ok = true; break; } }
  if (!ok) return null;
  const authDate = Number(params.get("auth_date") ?? 0);
  if (!authDate || Math.floor(Date.now() / 1000) - authDate > maxAgeSec) return null;
  try { return JSON.parse(params.get("user") ?? "null") as InitUser | null; } catch { return null; }
}

/** Pure: one-line pitch + an attributable deep link (?start=<startParam>), for both the
 * "Share to a chat" prepared message and any "Share to story" widget_link text. Kept short
 * enough (fleet convention: <=300 chars) to fit comfortably in a story/chat share sheet.
 * Lives here (not kit.ts) so it stays importable by tests without pulling in kit.ts's
 * "cloudflare:workers" DurableObject dependency. */
export function buildShareText(pitch: string, botUsername: string, startParam: string): string {
  return `${pitch}\n\nhttps://t.me/${botUsername}?start=${startParam}`;
}

export type InitErrorCode = "no_init" | "expired" | "bad_sig";

/** Which of the three initData failure modes this string is (REVIEW-WEBAPP P1-2): opened
 * outside Telegram (no initData at all), a session older than validateInitData's max age,
 * or a signature that does not verify. The client localizes off the code, because when
 * initData is unusable the server cannot trust the language it claims. */
export function initDataErrorCode(initData: string, maxAgeSec = 86_400): InitErrorCode {
  const p = new URLSearchParams(initData);
  if (!p.get("hash")) return "no_init";
  const authDate = Number(p.get("auth_date") ?? 0);
  if (!authDate || Math.floor(Date.now() / 1000) - authDate > maxAgeSec) return "expired";
  return "bad_sig";
}

/** English fallback copy for a non-Mini-App caller (curl, a logged 401). The Mini App
 * itself renders `code` through APP_I18N and never shows these strings. */
export function initDataErrorMessage(initData: string, botLink: string): string {
  const code = initDataErrorCode(initData);
  if (code === "no_init") return `Open this app from the bot: ${botLink} — tap the menu button.`;
  if (code === "expired") return "This session expired. Close and reopen the app.";
  return "This link is not valid. Reopen the app from the bot.";
}

export interface InitFailure { error: string; code: InitErrorCode; }

/** The 401 body every Mini App API route returns: English `error` for humans reading logs,
 * `code` for the client to localize. */
export function initDataFailure(initData: string, botLink: string): InitFailure {
  return { error: initDataErrorMessage(initData, botLink), code: initDataErrorCode(initData) };
}

// countdown's Pro is per-CHAT (groups.pro), not per-user, so ProLinkBody carries the target
// chat too. `handleProLink` itself is copied verbatim (unmodified) from habit/src/webapp.ts —
// its `mint` only ever takes `plan`; the caller (apiProLink in index.ts) closes over chatId.
export interface ProLinkBody { initData?: string; plan?: unknown; chatId?: number; }
export interface ProLinkOpts {
  tokens: string[];
  botLink: string;
  /** False for a bot with no monthly plan: "monthly" then degrades to one-time. */
  allowMonthly: boolean;
  mint: (plan: ProPlan) => Promise<string>;
  /** Funnel parity with the chat flow: the "invoice" step, for real users only. */
  track?: (userId: number, plan: ProPlan) => Promise<void>;
}

/** POST /api/pro-link: validated initData in, a Telegram Stars invoice link out, so the
 * Mini App can call tg.openInvoice instead of deep-linking the user out to the chat.
 * `mint` builds the link with the same title/description/payload as the chat flow, so
 * successful_payment handling is unchanged. QA fixture ids get 200 + {qa:true} and never
 * reach the Bot API — smoke.sh exercises the route without minting a real invoice. */
export async function handleProLink(body: ProLinkBody, o: ProLinkOpts): Promise<Response> {
  const user = await validateInitData(body.initData ?? "", o.tokens);
  if (!user) return Response.json(initDataFailure(body.initData ?? "", o.botLink), { status: 401 });
  const plan = normalizePlan(body.plan, o.allowMonthly);
  if (isQaId(user.id)) return Response.json({ url: null, qa: true });
  try {
    if (o.track) await o.track(user.id, plan);
    return Response.json({ url: await o.mint(plan) });
  } catch {
    return Response.json({ url: null, error: "Invoice unavailable." }, { status: 502 });
  }
}

// Until this bot's own username lands, publicLink() falls back to the hub Direct-Link
// (https://t.me/TinyTelegramToolsBot/countdown) — never a guessed t.me name (REVIEW-WEBAPP P0-9).
const STORY_LINK = publicLink("story");

export const APP_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><title>${TITLE}</title>
<script src="https://telegram.org/js/telegram-web-app.js"></script>
<style>body{margin:0;font:16px/1.4 -apple-system,system-ui,sans-serif;background:var(--tg-theme-bg-color,#fff);color:var(--tg-theme-text-color,#111);padding:16px}
h1{font-size:18px;margin:0 0 12px}.c{padding:14px;border-radius:12px;background:var(--tg-theme-secondary-bg-color,#f3f3f3);margin-bottom:8px}
.c .t{font-weight:600}.c .n{font-size:22px;margin-top:4px;color:var(--tg-theme-button-color,#2ea6ff)}
.empty{color:var(--tg-theme-hint-color,#777)}button{border:0;border-radius:10px;padding:10px 14px;font-size:15px;background:var(--tg-theme-button-color,#2ea6ff);color:var(--tg-theme-button-text-color,#fff)}
.pb{font-size:13px;padding:8px 12px;width:100%;margin-top:6px}</style></head><body>
<h1 data-i18n="app_title"></h1><div id="list" class="empty" data-i18n="app_loading"></div>
<div id="pro"></div><div id="note" class="empty" style="margin-top:8px"></div>
<div id="shareRow" style="margin-top:14px"></div>
<div id="more"></div>
${renderAppI18n(appDict())}
<script>
const tg=window.Telegram.WebApp;tg.ready();tg.expand();
async function api(path,body){const r=await fetch(path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({initData:tg.initData,...body})});return r.json()}
const OTHER_BOTS=[['🔒 WhisperLock','WhisperLockBot'],['⏰ Nudge','NudgeRemindBot'],['📮 AnonInbox','AnonInboxProBot'],['🧾 SplitTabs','SplitTabsBot'],['🔥 HabitStreak','HabitStreakProBot'],['📅 EventRSVP','EventRSVPProBot'],['💌 AnonSay','AnonSayProBot'],['❓ Icebreaker','IcebreakerDailyBot'],['🎁 SecretSanta','SantaDrawProBot']];
function renderMore(){const h='<h2 style="font-size:14px;margin:16px 0 6px;color:var(--tg-theme-hint-color,#777)">'+T('app_moreApps')+'</h2>';document.getElementById('more').innerHTML=h+OTHER_BOTS.map(([label,bot])=>'<button class="mo" data-bot="'+bot+'">'+label+'</button>').join('');for(const b of document.querySelectorAll('.mo'))b.onclick=()=>tg.openTelegramLink('https://t.me/'+b.dataset.bot)}
function sBtn(label,top){const b=document.createElement("button");b.textContent=label;b.style.cssText="border:0;border-radius:10px;padding:10px 14px;font-size:14px;background:var(--tg-theme-secondary-bg-color,#f3f3f3);color:var(--tg-theme-text-color,#111);width:100%;margin-top:"+top;return b}
function renderShare(){const el=document.getElementById("shareRow");if(!el)return;let ok=false;try{ok=typeof tg.shareMessage==="function"&&tg.isVersionAtLeast("8.0")}catch(e){}
 if(ok){const b=sBtn(T('app_shareChat'),"0");b.onclick=async()=>{try{const d=await api("/api/share",{});if(d&&d.id)tg.shareMessage(d.id);else note(T('app_shareFail'))}catch(e){note(T('app_shareFail'))}};el.appendChild(b)}
 let ok2=false;try{ok2=typeof tg.shareToStory==="function"&&tg.isVersionAtLeast("7.8")}catch(e){}
 if(ok2){const s=sBtn(T('app_shareStory'),"8px");s.onclick=()=>{try{api("/api/share-story",{}).catch(()=>{});tg.shareToStory("https://tg.zovo.one/img/banner-countdown.png",{text:T('app_storyText')+"\\n\\n${STORY_LINK}",widget_link:{url:"${STORY_LINK}",name:"${TITLE}"}})}catch(e){}};el.appendChild(s)}}
let items=[];
let proStars=0;
function fmt(secs){if(secs<=0)return T('app_itsTime');const d=Math.max(1,Math.ceil(secs/86400));return T('app_daysLeft',{n:d})}
function tick(){const now=Date.now()/1000;for(const it of items){const el=document.getElementById('n'+it.id);if(el)el.textContent=fmt(it.when_ts-now)}}
// Each item carries its own chat_id + pro flag (one user's countdowns can span several
// chats), so the pro nudge is per-chat, not a single bot-wide block — one button per
// not-yet-pro chat (deduped via shownChats), not one per item.
function countdownRow(it,shownChats){const row=document.createElement('div');row.className='c';
 const t=document.createElement('div');t.className='t';t.textContent=it.emoji+' '+it.title;
 const n=document.createElement('div');n.className='n';n.id='n'+it.id;
 row.appendChild(t);row.appendChild(n);
 if(!it.pro&&!shownChats.has(it.chat_id)&&typeof tg.openInvoice==='function'){shownChats.add(it.chat_id);
  const h=document.createElement('div');h.className='empty';h.style.fontSize='12px';h.style.marginTop='6px';h.textContent=T('app_unlockPro');
  const b=document.createElement('button');b.className='pb';b.textContent=T('app_proOneTime',{n:proStars});
  b.onclick=()=>buyProFor(it.chat_id,b);
  row.appendChild(h);row.appendChild(b)}
 return row}
async function buyProFor(chatId,btn){btn.disabled=true;
 try{const d=await api('/api/pro-link',{plan:'onetime',chatId:chatId});
  if(!d||!d.url){btn.disabled=false;if(!d||!d.qa)note(T('app_payFailed'));return}
  tg.openInvoice(d.url,function(st){btn.disabled=false;
   if(st==='paid'){note(T('app_payDone'));load()}else if(st==='cancelled'){note(T('app_payCancelled'))}else{note(T('app_payFailed'))}})}
 catch(e){btn.disabled=false;note(T('app_payFailed'))}}
async function load(){let d;try{d=await api('/api/countdowns',{})}catch(e){d=null}
 const el=document.getElementById('list');
 if(!d||d.error){el.className='empty';el.textContent=errText(d);return}
 proStars=d.proStars||0;
 items=d.countdowns||[];
 if(!items.length){el.className='empty';el.textContent='';return}
 el.className='';el.innerHTML='';const shownChats=new Set();
 for(const it of items)el.appendChild(countdownRow(it,shownChats));
 tick()}
load();renderMore();renderShare();setInterval(tick,1000);
</script></body></html>`;
