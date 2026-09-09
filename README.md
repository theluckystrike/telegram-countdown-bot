# CountdownDaysBot — countdown timer for Telegram

**Try it:** [@CountdownDaysBot](https://t.me/CountdownDaysBot?start=github) · [tg.zovo.one/bots/countdown/](https://tg.zovo.one/bots/countdown/)

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

## Related projects

Part of the same small family of single-purpose Telegram bots — each one does one thing, open source (MIT), built with grammY on Cloudflare Workers:

| Bot | What it does |
|---|---|
| [AnonSayProBot](https://github.com/theluckystrike/telegram-anonymous-group-post-bot) | Post to a group anonymously |
| [AnonInboxProBot](https://github.com/theluckystrike/telegram-anonymous-inbox-bot) | A personal link for anonymous messages |
| [BirthdayReminderProBot](https://github.com/theluckystrike/telegram-birthday-reminder-bot) | Tracks a group's birthdays, posts on the day |
| [BudgetLogBot](https://github.com/theluckystrike/telegram-expense-tracker-bot) | Private-chat expense tracker, auto-categorized |
| [GroupPulseProBot](https://github.com/theluckystrike/telegram-group-activity-stats-bot) | Group activity stats, no message content stored |
| [HabitStreakProBot](https://github.com/theluckystrike/telegram-habit-tracker-bot) | Daily habit tracking with streaks |
| [IcebreakerDailyBot](https://github.com/theluckystrike/telegram-icebreaker-question-bot) | Daily conversation-starter question for a group |
| [WhisperLockBot](https://github.com/theluckystrike/telegram-locked-message-bot) | Drop a locked message into any chat, reveal on tap |
| [PartyPackProBot](https://github.com/theluckystrike/telegram-party-games-bot) | Truth, Dare, Would You Rather prompts |
| [FocusTimerProBot](https://github.com/theluckystrike/telegram-pomodoro-bot) | Pomodoro focus timers, solo or shared |
| [NudgeRemindBot](https://github.com/theluckystrike/telegram-reminder-bot) | Reminders inside Telegram, no separate app |
| [EventRSVPProBot](https://github.com/theluckystrike/telegram-rsvp-event-bot) | Event cards with live Going / Maybe / Can't counts |
| [SantaDrawProBot](https://github.com/theluckystrike/telegram-secret-santa-bot) | Secret Santa draw and exchange for a group |
| [SplitTabsBot](https://github.com/theluckystrike/telegram-split-bill-bot) | Running expense ledger for group bills |
| [AsyncStandupBot](https://github.com/theluckystrike/telegram-standup-bot) | Async daily standup for a team, no meeting |
| [TimeSheetProBot](https://github.com/theluckystrike/telegram-time-tracking-bot) | Freelance time tracking by client |
| [WhenIsItBot](https://github.com/theluckystrike/telegram-time-zone-bot) | Converts a time across a group's timezones |
| [TriviaDailyProBot](https://github.com/theluckystrike/telegram-trivia-bot) | Daily trivia quiz with leaderboard and streaks |
| [WordADayLearnBot](https://github.com/theluckystrike/telegram-vocabulary-bot) | Daily vocabulary with spaced repetition |

---
Part of Tiny Telegram Tools — https://tg.zovo.one/
