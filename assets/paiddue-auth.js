const SUPABASE_URL = "https://ttvdpgxqvvtjnxxfkoui.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_6IHSTMfMOmK2ecB58U7tjA_CWJwDyZt";
const SITE_ORIGIN = "https://guruoshan.github.io";
const CALLBACK_PATH = "/paiddue";
const ALLOWED_EMAIL_TYPES = new Set(["email", "recovery"]);

function readFragment(hash) {
  const value = typeof hash === "string" ? hash : "";
  return new URLSearchParams(value.startsWith("#") ? value.slice(1) : value);
}

export function parseTokenHashFragment(hash) {
  const params = readFragment(hash);
  const tokenHash = params.get("token_hash") || "";
  const type = params.get("type") || "";
  if (!tokenHash || !ALLOWED_EMAIL_TYPES.has(type)) return null;
  return { tokenHash, type };
}

export function parseSessionFragment(hash) {
  const params = readFragment(hash);
  const accessToken = params.get("access_token") || "";
  const refreshToken = params.get("refresh_token") || "";
  const type = params.get("type") || "";
  if (!accessToken || !refreshToken || !["email", "signup", "recovery"].includes(type)) return null;
  return { accessToken, refreshToken, type };
}

export function buildAppCallbackUrl(session, type) {
  if (!session || typeof session.access_token !== "string" || !session.access_token ||
      typeof session.refresh_token !== "string" || !session.refresh_token ||
      !ALLOWED_EMAIL_TYPES.has(type)) {
    throw new Error("AUTH_SESSION_INVALID");
  }
  const callback = new URL(CALLBACK_PATH, SITE_ORIGIN);
  const fragment = new URLSearchParams({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    token_type: session.token_type || "bearer",
    type,
  });
  const expiresIn = Number.isFinite(session.expires_in) && session.expires_in > 0
    ? session.expires_in
    : 3600;
  fragment.set("expires_in", String(expiresIn));
  callback.hash = fragment.toString();
  return callback.toString();
}

export function buildAndroidIntentUrl(callbackUrl) {
  const callback = new URL(callbackUrl);
  if (callback.origin !== SITE_ORIGIN || callback.pathname !== CALLBACK_PATH ||
      callback.search || callback.username || callback.password || callback.port || !callback.hash) {
    throw new Error("AUTH_CALLBACK_URL_INVALID");
  }

  const browserFallback = encodeURIComponent(callback.toString());
  return `intent://${callback.host}${callback.pathname}${callback.hash}#Intent;scheme=https;package=com.dailymoneyregister;S.browser_fallback_url=${browserFallback};end`;
}

export async function verifyTokenHash(tokenHash, type, fetcher = fetch) {
  if (typeof tokenHash !== "string" || !tokenHash || !ALLOWED_EMAIL_TYPES.has(type)) {
    throw new Error("AUTH_LINK_INVALID");
  }
  const response = await fetcher(SUPABASE_URL + "/auth/v1/verify", {
    method: "POST",
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token_hash: tokenHash, type }),
    cache: "no-store",
    credentials: "omit",
    referrerPolicy: "no-referrer",
  });
  if (!response.ok) throw new Error("AUTH_LINK_INVALID");
  const session = await response.json();
  if (!session || typeof session.access_token !== "string" || !session.access_token ||
      typeof session.refresh_token !== "string" || !session.refresh_token) {
    throw new Error("AUTH_SESSION_INVALID");
  }
  return session;
}

export async function updatePassword(accessToken, password, fetcher = fetch) {
  if (typeof accessToken !== "string" || !accessToken ||
      typeof password !== "string" || password.length < 8) {
    throw new Error("PASSWORD_UPDATE_INVALID");
  }
  const response = await fetcher(SUPABASE_URL + "/auth/v1/user", {
    method: "PUT",
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: "Bearer " + accessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password }),
    cache: "no-store",
    credentials: "omit",
    referrerPolicy: "no-referrer",
  });
  if (!response.ok) throw new Error("PASSWORD_UPDATE_FAILED");
  return true;
}

export function clearUrlFragment() {
  if (typeof window !== "undefined" && window.history && window.location) {
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }
}
