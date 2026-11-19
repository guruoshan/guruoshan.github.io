import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  buildAndroidIntentUrl,
  buildAppCallbackUrl,
  parseSessionFragment,
  parseTokenHashFragment,
  updatePassword,
  verifyTokenHash,
} from "../assets/paiddue-auth.js";

test("accepts only email and recovery token-hash fragments", () => {
  assert.deepEqual(parseTokenHashFragment("#token_hash=abc&type=recovery"), { tokenHash: "abc", type: "recovery" });
  assert.deepEqual(parseTokenHashFragment("#token_hash=xyz&type=email"), { tokenHash: "xyz", type: "email" });
  assert.equal(parseTokenHashFragment("#token_hash=abc&type=invite"), null);
  assert.equal(parseTokenHashFragment("#type=recovery"), null);
});

test("parses complete callback sessions and rejects incomplete sessions", () => {
  assert.deepEqual(parseSessionFragment("#access_token=a&refresh_token=r&type=recovery"), {
    accessToken: "a", refreshToken: "r", type: "recovery",
  });
  assert.equal(parseSessionFragment("#access_token=a&type=recovery"), null);
});

test("builds only the fixed Paid&Due Android callback URL", () => {
  const url = new URL(buildAppCallbackUrl({
    access_token: "access-value", refresh_token: "refresh-value", expires_in: 3600,
  }, "recovery"));
  assert.equal(url.origin, "https://guruoshan.github.io");
  assert.equal(url.pathname, "/paiddue");
  assert.equal(url.search, "");
  assert.equal(new URLSearchParams(url.hash.slice(1)).get("type"), "recovery");
  assert.throws(() => buildAppCallbackUrl({ access_token: "a" }, "recovery"), /AUTH_SESSION_INVALID/);
});

test("always includes required session fields and defaults missing expires_in to 3600", () => {
  const requiredFields = ["access_token", "refresh_token", "token_type", "type"];
  const missingExpiryUrl = new URL(buildAppCallbackUrl({
    access_token: "fake-access",
    refresh_token: "fake-refresh",
  }, "recovery"));
  const missingExpiry = new URLSearchParams(missingExpiryUrl.hash.slice(1));

  for (const field of requiredFields) assert.ok(missingExpiry.has(field), `missing ${field}`);
  assert.equal(missingExpiry.get("expires_in"), "3600");
  assert.equal(missingExpiry.get("token_type"), "bearer");
  assert.equal(missingExpiry.get("type"), "recovery");

  const validExpiryUrl = new URL(buildAppCallbackUrl({
    access_token: "fake-access",
    refresh_token: "fake-refresh",
    token_type: "bearer",
    expires_in: 1800.5,
  }, "recovery"));
  const validExpiry = new URLSearchParams(validExpiryUrl.hash.slice(1));

  for (const field of requiredFields) assert.ok(validExpiry.has(field), `missing ${field}`);
  assert.equal(validExpiry.get("expires_in"), "1800.5");
});

test("builds an explicit HTTPS Android intent and preserves the browser fallback", () => {
  const callbackUrl = "https://guruoshan.github.io/paiddue#access_token=fake-access&refresh_token=fake-refresh&type=recovery";
  const intentUrl = buildAndroidIntentUrl(callbackUrl);
  assert.ok(intentUrl.startsWith("intent://guruoshan.github.io/paiddue#access_token=fake-access&refresh_token=fake-refresh&type=recovery#Intent;scheme=https;package=com.dailymoneyregister;"));

  const dataPart = intentUrl.slice("intent://".length, intentUrl.indexOf("#Intent;"));
  const appCallback = new URL(`https://${dataPart}`);
  assert.equal(appCallback.pathname, "/paiddue");
  assert.equal(appCallback.hash, new URL(callbackUrl).hash);

  const fallback = intentUrl.match(/;S\\.browser_fallback_url=([^;]+);end$/);
  assert.ok(fallback);
  assert.equal(decodeURIComponent(fallback[1]), callbackUrl);
  assert.throws(() => buildAndroidIntentUrl("https://example.com/paiddue#type=recovery"), /AUTH_CALLBACK_URL_INVALID/);
  assert.throws(() => buildAndroidIntentUrl("https://guruoshan.github.io/paiddue/#type=recovery"), /AUTH_CALLBACK_URL_INVALID/);
});

test("verifies token hashes using POST only when explicitly invoked", async () => {
  let request;
  await verifyTokenHash("one-time-hash", "recovery", async (url, options) => {
    request = { url, options };
    return { ok: true, json: async () => ({ access_token: "a", refresh_token: "r" }) };
  });
  assert.match(request.url, /\\/auth\\/v1\\/verify$/);
  assert.equal(request.options.method, "POST");
  assert.deepEqual(JSON.parse(request.options.body), { token_hash: "one-time-hash", type: "recovery" });
  assert.equal(request.options.credentials, "omit");
});

test("updates password using only the verified access token", async () => {
  let request;
  await updatePassword("access-value", "new-password-123", async (url, options) => {
    request = { url, options };
    return { ok: true };
  });
  assert.match(request.url, /\\/auth\\/v1\\/user$/);
  assert.equal(request.options.method, "PUT");
  assert.equal(request.options.headers.Authorization, "Bearer access-value");
  assert.deepEqual(JSON.parse(request.options.body), { password: "new-password-123" });
  assert.equal(request.options.credentials, "omit");
});

test("the landing page exchanges a token only from a click handler and requires a direct second click for app handoff", async () => {
  const source = await readFile(new URL("../assets/paiddue-continue.js", import.meta.url), "utf8");
  assert.match(source, /button\\.addEventListener\\("click"/);
  assert.match(source, /verifyTokenHash\\(callback\\.tokenHash, callback\\.type\\)/);
  assert.match(source, /let verifiedDestination = null/);
  assert.match(source, /window\\.location\\.assign\\(buildAndroidIntentUrl\\(verifiedDestination\\)\\)/);
  assert.ok(source.indexOf('button.addEventListener("click"') < source.indexOf("verifyTokenHash(callback.tokenHash, callback.type)"));
});
