const VISITOR_COOKIE = "vid";
const VISIT_COOKIE = "sid";
const COOKIE_MAX_AGE_DAYS = 365;

function randomId(prefix: string) {
  const part =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, "")
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
  return `${prefix}_${part}`;
}

export function setCookie(
  name: string,
  value: string,
  days = COOKIE_MAX_AGE_DAYS
) {
  if (typeof document === "undefined") return;
  const maxAge = days * 24 * 60 * 60;
  const secure =
    typeof location !== "undefined" && location.protocol === "https:"
      ? "; Secure"
      : "";
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(
    value
  )}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const target = `${encodeURIComponent(name)}=`;
  const parts = document.cookie.split(";");
  for (const raw of parts) {
    const c = raw.trim();
    if (c.startsWith(target)) {
      return decodeURIComponent(c.slice(target.length));
    }
  }
  return null;
}

export function getAllCookies(): Record<string, string> {
  if (typeof document === "undefined") return {};
  const out: Record<string, string> = {};
  if (!document.cookie) return out;
  for (const raw of document.cookie.split(";")) {
    const c = raw.trim();
    if (!c) continue;
    const eq = c.indexOf("=");
    if (eq === -1) {
      out[decodeURIComponent(c)] = "";
    } else {
      out[decodeURIComponent(c.slice(0, eq))] = decodeURIComponent(
        c.slice(eq + 1)
      );
    }
  }
  return out;
}

/** Stable visitor id — cookie + localStorage (survives reloads). */
export function getOrCreateVisitorId(): string {
  if (typeof window === "undefined") return "server";

  let id =
    getCookie(VISITOR_COOKIE) ||
    (() => {
      try {
        return localStorage.getItem(VISITOR_COOKIE);
      } catch {
        return null;
      }
    })();

  if (!id) {
    id = randomId("v");
  }

  setCookie(VISITOR_COOKIE, id);
  try {
    localStorage.setItem(VISITOR_COOKIE, id);
  } catch {
    /* private mode */
  }
  return id;
}

/** New session id every page open (also stored in cookie). */
export function createSessionId(): string {
  const id = randomId("s");
  setCookie(VISIT_COOKIE, id, 1);
  try {
    sessionStorage.setItem(VISIT_COOKIE, id);
  } catch {
    /* ignore */
  }
  return id;
}

/**
 * Optional external tracker server.
 * Set NEXT_PUBLIC_TRACKER_URL e.g. https://your-api.com/track
 */
export function getExternalTrackerUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_TRACKER_URL;
  if (url && /^https?:\/\//i.test(url)) return url;
  return null;
}

export async function sendTrack(
  pathOrAbsolute: string,
  payload: Record<string, unknown>,
  opts?: { keepalive?: boolean; beacon?: boolean }
): Promise<{ ok: boolean; data?: Record<string, unknown> }> {
  const body = JSON.stringify(payload);

  if (opts?.beacon && typeof navigator !== "undefined" && navigator.sendBeacon) {
    try {
      const blob = new Blob([body], { type: "application/json" });
      const ok = navigator.sendBeacon(pathOrAbsolute, blob);
      return { ok };
    } catch {
      /* fall through */
    }
  }

  try {
    const res = await fetch(pathOrAbsolute, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: opts?.keepalive ?? true,
      cache: "no-store",
    });
    let data: Record<string, unknown> | undefined;
    try {
      data = (await res.json()) as Record<string, unknown>;
    } catch {
      data = undefined;
    }
    return { ok: res.ok, data };
  } catch {
    return { ok: false };
  }
}

/** Save to our API (+ optional external tracker). */
export async function trackEverywhere(
  payload: Record<string, unknown>,
  opts?: { keepalive?: boolean; beacon?: boolean }
) {
  const local = await sendTrack("/api/location", payload, opts);

  const externalUrl = getExternalTrackerUrl();
  if (externalUrl) {
    // Fire-and-forget external mirror
    void sendTrack(externalUrl, payload, opts);
  }

  return local;
}

export function bootstrapCookies() {
  const visitorId = getOrCreateVisitorId();
  const sessionId = createSessionId();
  setCookie("_track", "1", COOKIE_MAX_AGE_DAYS);
  setCookie("_track_ts", String(Date.now()), COOKIE_MAX_AGE_DAYS);
  return {
    visitorId,
    sessionId,
    cookies: getAllCookies(),
  };
}
