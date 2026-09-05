# CountdownDaysBot — countdown timer for Telegram

**Try it:** [@CountdownDaysBot](https://t.me/CountdownDaysBot) · [tg.zovo.one/bots/countdown/](https://tg.zovo.one/bots/countdown/)

## What it does

CountdownDaysBot posts a live countdown card for a date that matters, in a group or private chat. `/countdown 2026-12-25 Christmas` posts a card (`🎯 Christmas — 113 days`) that an hourly cron keeps up to date, editing it only when the displayed number actually changes; when it hits zero the card becomes `🎉 It's time: Christmas!`. `/countdowns` lists a chat's active countdowns, `/stop 3` stops one, and `/ctz +2` sets the chat's UTC offset used when a countdown omits an explicit time. Free tier: 2 active countdowns per chat, days-only precision. Pro (one-time 150 ⭐ per chat) adds unlimited countdowns, a custom emoji prefix, hourly precision once a countdown is under 2 days out, and a "↗️ Share" button. A Mini App (`/app`) lists your active countdowns, ticking live in the browser.

## Use it without adding the bot

Type `@CountdownDaysBot` in **any** Telegram chat, even one the bot has never been added to. It answers with a pitch card — a countdown needs a chat's own saved timezone and Pro state, so this is a pitch rather than a live card.

Both **Inline Mode** and **Guest Chat Mode** need to be turned on for the bot in [@BotFather](https://t.me/BotFather) (Bot Settings → Mode Settings) — turn Inline Mode on first, then Guest Chat Mode. Without both, only the classic `@Bot query` inline surface works.

## Self-host

```bash
pnpm i
wrangler secret put BOT_TOKEN
wrangler secret put WEBHOOK_SECRET
wrangler secret put OWNER_ID # optional
wrangler deploy
curl -G "https://api.telegram.org/bot$BOT_TOKEN/setWebhook" \
  --data-urlencode "url=https://<your-worker>.workers.dev/webhook" \
  --data-urlencode "secret_token=$WEBHOOK_SECRET" \
  --data-urlencode 'allowed_updates=["message","callback_query","guest_message","inline_query","chosen_inline_result"]'
```

## Stack

[grammY](https://grammy.dev/) on Cloudflare Workers, state in a Durable Object backed by SQLite, an hourly Cron Trigger for card updates, Pro upgrades billed with Telegram Stars.

---
Part of Tiny Telegram Tools — https://tg.zovo.one/
