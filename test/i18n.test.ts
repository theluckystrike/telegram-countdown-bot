import { test } from "node:test";
import assert from "node:assert/strict";
import { LANGS, resolveLang, t, type Key } from "../src/i18n.ts";

const BTN_KEYS: Key[] = ["btn_addToGroup", "btn_shareBot", "btn_unlockProStars"];
const NEW_KEYS: Key[] = ["noActiveCountdowns", "stopUsage", "stopNotAllowed"];

test("resolveLang falls back to en for unknown/missing codes", () => {
  assert.equal(resolveLang(undefined), "en");
  assert.equal(resolveLang(""), "en");
  assert.equal(resolveLang("xx"), "en");
});

test("every locale has every btn_ key, and no label exceeds 32 chars", () => {
  for (const lang of LANGS) {
    for (const key of BTN_KEYS) {
      const s = t(lang, key, { stars: 150 });
      assert.ok(s.length > 0, `${lang}/${key} is empty`);
      assert.ok(s.length <= 32, `${lang}/${key} exceeds 32 chars: "${s}" (${s.length})`);
    }
  }
});

test("every locale has the localized group-path replies", () => {
  for (const lang of LANGS) {
    for (const key of NEW_KEYS) {
      const s = t(lang, key);
      assert.ok(s.length > 0, `${lang}/${key} is empty`);
    }
  }
});

test("t() falls back to English for an unknown language", () => {
  assert.equal(t("xx", "btn_addToGroup"), t("en", "btn_addToGroup"));
  assert.equal(t("xx", "stopNotAllowed"), t("en", "stopNotAllowed"));
});
