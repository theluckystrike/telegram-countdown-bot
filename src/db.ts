import { BaseStore, FleetStats, now } from "./kit.ts";
import { selectCronWindow } from "./logic.ts";
import type { Unit } from "./logic.ts";

export type Status = "active" | "done" | "stopped";

export interface CountdownRow {
  id: number; chat_id: number; creator_id: number; creator_name: string; tz_min: number;
  emoji: string; title: string; when_ts: number; message_id: number | null;
  last_unit: Unit; last_value: number; status: Status; created: number;
}

const QA_CHAT = -1001234567890;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS groups (chat_id INTEGER PRIMARY KEY, title TEXT NOT NULL DEFAULT '', pro INTEGER NOT NULL DEFAULT 0,
  paid_charge TEXT, tz_min INTEGER NOT NULL DEFAULT 0, created INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS countdowns (id INTEGER PRIMARY KEY AUTOINCREMENT, chat_id INTEGER NOT NULL, creator_id INTEGER NOT NULL,
  creator_name TEXT NOT NULL, tz_min INTEGER NOT NULL DEFAULT 0, emoji TEXT NOT NULL DEFAULT '🎯', title TEXT NOT NULL,
  when_ts INTEGER NOT NULL, message_id INTEGER, last_unit TEXT NOT NULL DEFAULT 'd', last_value INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active', created INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS countdowns_chat ON countdowns(chat_id, status, when_ts);
CREATE INDEX IF NOT EXISTS countdowns_active ON countdowns(status, when_ts);
CREATE TABLE IF NOT EXISTS sources (user_id INTEGER PRIMARY KEY, src TEXT NOT NULL, ts INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS counters (name TEXT PRIMARY KEY, n INTEGER NOT NULL DEFAULT 0);`;

export class Store extends BaseStore {
  constructor(ctx: DurableObjectState, env: Record<string, unknown>) { super(ctx, env, SCHEMA); }

  async touchGroup(chatId: number, title: string): Promise<{ pro: number; tz_min: number }> {
    this.run("INSERT INTO groups (chat_id, title, created) VALUES (?1, ?2, ?3) ON CONFLICT(chat_id) DO UPDATE SET title = ?2", chatId, title, now());
    return this.one<{ pro: number; tz_min: number }>("SELECT pro, tz_min FROM groups WHERE chat_id = ?1", chatId) ?? { pro: 0, tz_min: 0 };
  }
  /** Upsert: a chat may have no `groups` row yet (Pro bought before its first /countdown or
   *  /ctz) — an UPDATE-only statement would silently write 0 rows and lose the sale. */
  async setGroupPro(chatId: number, charge: string): Promise<void> {
    this.run(`INSERT INTO groups (chat_id, pro, paid_charge, created) VALUES (?1, 1, ?2, ?3)
              ON CONFLICT(chat_id) DO UPDATE SET pro = 1, paid_charge = ?2`, chatId, charge, now());
  }
  async setGroupTz(chatId: number, tzMin: number): Promise<void> { this.run("UPDATE groups SET tz_min = ?2 WHERE chat_id = ?1", chatId, tzMin); }
  /** Read-only lookup (unlike touchGroup, never creates a row or overwrites the stored title) —
   *  used by the cron pass, which only needs to know a chat's current Pro flag. */
  async getGroup(chatId: number): Promise<{ pro: number; tz_min: number } | null> {
    return this.one<{ pro: number; tz_min: number }>("SELECT pro, tz_min FROM groups WHERE chat_id = ?1", chatId);
  }

  async countActive(chatId: number): Promise<number> {
    return (this.one<{ n: number }>("SELECT COUNT(*) AS n FROM countdowns WHERE chat_id = ?1 AND status = 'active'", chatId) ?? { n: 0 }).n;
  }
  async createCountdown(chatId: number, creatorId: number, creatorName: string, tzMin: number, emoji: string, title: string, whenTs: number): Promise<number> {
    this.run(`INSERT INTO countdowns (chat_id, creator_id, creator_name, tz_min, emoji, title, when_ts, created) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
      chatId, creatorId, creatorName, tzMin, emoji, title, whenTs, now());
    return this.lastId();
  }
  async setMessageId(id: number, messageId: number): Promise<void> { this.run("UPDATE countdowns SET message_id = ?2 WHERE id = ?1", id, messageId); }
  async getCountdown(id: number): Promise<CountdownRow | null> { return this.one<CountdownRow>("SELECT * FROM countdowns WHERE id = ?1", id); }

  async listActive(chatId: number, limit = 20): Promise<CountdownRow[]> {
    return this.all<CountdownRow>("SELECT * FROM countdowns WHERE chat_id = ?1 AND status = 'active' ORDER BY when_ts LIMIT ?2", chatId, limit);
  }
  async stopCountdown(id: number): Promise<void> { this.run("UPDATE countdowns SET status = 'stopped' WHERE id = ?1", id); }

  /** Active countdowns due for a cron pass, bounded to `limit` per run. Rotates through the
   *  full active set by id via a stored cursor (selectCronWindow) instead of always taking
   *  the same `when_ts`-soonest slice — past `limit` active countdowns fleet-wide, a static
   *  `ORDER BY when_ts LIMIT` would starve the tail forever. */
  async activeForCron(limit = 500): Promise<CountdownRow[]> {
    const cursor = this.counter("cron_cursor");
    const rows = this.all<CountdownRow>("SELECT * FROM countdowns WHERE status = 'active' ORDER BY id LIMIT 5000");
    const window = selectCronWindow(rows, cursor, limit);
    if (window.length) this.run("INSERT INTO counters (name, n) VALUES ('cron_cursor', ?1) ON CONFLICT(name) DO UPDATE SET n = ?1", window[window.length - 1].id);
    return window;
  }
  async markProgress(id: number, unit: Unit, value: number): Promise<void> {
    this.run("UPDATE countdowns SET last_unit = ?2, last_value = ?3 WHERE id = ?1", id, unit, value);
  }
  async markDone(id: number): Promise<void> { this.run("UPDATE countdowns SET status = 'done', last_unit = 'd', last_value = 0 WHERE id = ?1", id); }

  async myActive(userId: number, limit = 50): Promise<CountdownRow[]> {
    return this.all<CountdownRow>("SELECT * FROM countdowns WHERE creator_id = ?1 AND status = 'active' ORDER BY when_ts LIMIT ?2", userId, limit);
  }

  /** Pro flag per chat id, for the Mini App state endpoint (MINIAPP-SPEC.md): one user's
   *  countdowns can span several chats, each independently pro or not. Bounded by the
   *  caller (myActive's own `limit`); a chat with no `groups` row yet is simply not pro. */
  async proMap(chatIds: number[]): Promise<Record<number, boolean>> {
    const out: Record<number, boolean> = {};
    if (!chatIds.length) return out;
    const placeholders = chatIds.map((_, i) => `?${i + 1}`).join(",");
    const rows = this.all<{ chat_id: number; pro: number }>(`SELECT chat_id, pro FROM groups WHERE chat_id IN (${placeholders})`, ...chatIds);
    for (const id of chatIds) out[id] = false;
    for (const r of rows) out[r.chat_id] = r.pro === 1;
    return out;
  }

  async incrCounter(name: string, by = 1): Promise<void> {
    this.run("INSERT INTO counters (name, n) VALUES (?1, ?2) ON CONFLICT(name) DO UPDATE SET n = n + ?2", name, by);
  }
  private counter(name: string): number { return (this.one<{ n: number }>("SELECT n FROM counters WHERE name = ?1", name) ?? { n: 0 }).n; }

  /** First-touch attribution for /start payloads like "site"/"share"/"x" (see logic.ts isSourcePayload). */
  async recordSource(userId: number, src: string): Promise<void> {
    this.run("INSERT OR IGNORE INTO sources (user_id, src, ts) VALUES (?1, ?2, ?3)", userId, src, now());
  }
  private sourceStats(): Record<string, number> {
    const rows = this.all<{ src: string; n: number }>(
      `SELECT src, COUNT(*) AS n FROM sources WHERE ${this.notTestUser("user_id")} GROUP BY src`);
    const out: Record<string, number> = {};
    for (const r of rows) out["src_" + r.src] = r.n;
    return out;
  }

  async stats(): Promise<FleetStats> {
    const g = this.one<{ n: number; p: number | null }>("SELECT COUNT(*) AS n, SUM(pro) AS p FROM groups WHERE chat_id != ?1", QA_CHAT);
    // Only negative chat ids are real groups — a private-chat Pro purchase (buyer's own DM,
    // used for a personal countdown) writes a `groups` row too and must not count as one.
    const realGroups = this.one<{ n: number }>("SELECT COUNT(*) AS n FROM groups WHERE chat_id != ?1 AND chat_id < 0", QA_CHAT);
    const c = this.one<{ n: number }>(
      `SELECT COUNT(*) AS n FROM countdowns WHERE chat_id != ?1 AND ${this.notTestUser("creator_id")}`, QA_CHAT);
    const f = this.one<{ n: number }>("SELECT COUNT(*) AS n FROM countdowns WHERE status = 'done' AND chat_id != ?1", QA_CHAT);
    const qg = this.one<{ n: number }>("SELECT COUNT(*) AS n FROM groups WHERE pro = 1 AND chat_id = ?1", QA_CHAT);
    const u = this.userStats();
    return {
      ...u, qa_pro: u.qa_pro + (qg?.n ?? 0), pro: (g?.p ?? 0) + u.pro, events: c?.n ?? 0,
      groups: realGroups?.n ?? 0, edits: this.counter("edits"), finished: f?.n ?? 0, ...this.sourceStats(),
    };
  }
}
