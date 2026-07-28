import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import UserLocation, { ILocationPoint } from "@/models/UserLocation";

function getClientIp(req: NextRequest): string | undefined {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim();
  return (
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("true-client-ip") ||
    undefined
  );
}

function pickHeaders(req: NextRequest) {
  const names = [
    "user-agent",
    "accept-language",
    "accept",
    "accept-encoding",
    "sec-ch-ua",
    "sec-ch-ua-mobile",
    "sec-ch-ua-platform",
    "sec-ch-ua-platform-version",
    "sec-ch-ua-model",
    "sec-ch-ua-full-version-list",
    "sec-ch-ua-arch",
    "sec-ch-ua-bitness",
    "sec-ch-prefers-color-scheme",
    "sec-fetch-site",
    "sec-fetch-mode",
    "sec-fetch-dest",
    "sec-fetch-user",
    "referer",
    "origin",
    "host",
    "cookie",
    "x-forwarded-proto",
    "x-vercel-ip-country",
    "x-vercel-ip-country-region",
    "x-vercel-ip-city",
    "x-vercel-ip-latitude",
    "x-vercel-ip-longitude",
    "x-vercel-ip-timezone",
    "cf-ipcountry",
    "cf-ray",
  ];
  const headers: Record<string, string> = {};
  for (const name of names) {
    const v = req.headers.get(name);
    if (v) headers[name] = v;
  }
  return headers;
}

function toNum(v: unknown): number | null {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  return null;
}

function mapsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

type ServerMeta = {
  ip?: string;
  headers: Record<string, string>;
  country: string | null;
  city: string | null;
  region: string | null;
  timezone: string | null;
  ipLatitude: number | null;
  ipLongitude: number | null;
  geoSource?: string | null;
  receivedAt: string;
};

function baseServerMeta(req: NextRequest): ServerMeta {
  return {
    ip: getClientIp(req),
    headers: pickHeaders(req),
    country:
      req.headers.get("x-vercel-ip-country") ||
      req.headers.get("cf-ipcountry") ||
      null,
    city: req.headers.get("x-vercel-ip-city") || null,
    region: req.headers.get("x-vercel-ip-country-region") || null,
    timezone: req.headers.get("x-vercel-ip-timezone") || null,
    ipLatitude: toNum(req.headers.get("x-vercel-ip-latitude")),
    ipLongitude: toNum(req.headers.get("x-vercel-ip-longitude")),
    geoSource:
      req.headers.get("x-vercel-ip-latitude") &&
      req.headers.get("x-vercel-ip-longitude")
        ? "vercel"
        : null,
    receivedAt: new Date().toISOString(),
  };
}

/** Background IP geo — no browser popup. Fills lat/lng when edge headers missing. */
async function enrichIpGeo(meta: ServerMeta): Promise<ServerMeta> {
  if (meta.ipLatitude != null && meta.ipLongitude != null) return meta;
  const ip = meta.ip;
  if (!ip || ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.")) {
    return meta;
  }

  try {
    // Free IP lookup (no key). City-level only — not GPS precision.
    const res = await fetch(
      `https://ipapi.co/${encodeURIComponent(ip)}/json/`,
      {
        headers: { Accept: "application/json" },
        // short timeout via AbortSignal if available
        signal: AbortSignal.timeout?.(4000),
        cache: "no-store",
      }
    );
    if (!res.ok) return meta;
    const data = (await res.json()) as {
      latitude?: number;
      longitude?: number;
      city?: string;
      region?: string;
      country_code?: string;
      timezone?: string;
      error?: boolean;
    };
    if (data.error) return meta;
    const lat = toNum(data.latitude);
    const lng = toNum(data.longitude);
    if (lat == null || lng == null) return meta;
    return {
      ...meta,
      ipLatitude: lat,
      ipLongitude: lng,
      city: meta.city || data.city || null,
      region: meta.region || data.region || null,
      country: meta.country || data.country_code || null,
      timezone: meta.timezone || data.timezone || null,
      geoSource: "ipapi",
    };
  } catch {
    return meta;
  }
}

function ipLocationFromMeta(
  meta: ServerMeta,
  at: string
): ILocationPoint | null {
  if (meta.ipLatitude == null || meta.ipLongitude == null) return null;
  return {
    latitude: meta.ipLatitude,
    longitude: meta.ipLongitude,
    // IP geo is city-level only (~5–50km error) — NOT exact GPS
    accuracy: 25000,
    altitude: null,
    heading: null,
    speed: null,
    source: "ip_approx",
    city: meta.city,
    region: meta.region,
    country: meta.country,
    timezone: meta.timezone,
    mapsUrl: mapsUrl(meta.ipLatitude, meta.ipLongitude),
    at,
  };
}

function gpsPoint(body: Record<string, unknown>, at: string): ILocationPoint | null {
  const latitude = toNum(body.latitude);
  const longitude = toNum(body.longitude);
  if (latitude == null || longitude == null) return null;
  return {
    latitude,
    longitude,
    accuracy: toNum(body.accuracy),
    altitude: toNum(body.altitude),
    heading: toNum(body.heading),
    speed: toNum(body.speed),
    source: typeof body.source === "string" ? body.source : "gps",
    city: null,
    region: null,
    country: null,
    timezone: null,
    mapsUrl: mapsUrl(latitude, longitude),
    at,
  };
}

function isNearDuplicate(
  a: { latitude: number; longitude: number; source?: string },
  b: { latitude: number; longitude: number; source?: string },
  eps = 0.00005
) {
  return (
    a.source === b.source &&
    Math.abs(a.latitude - b.latitude) < eps &&
    Math.abs(a.longitude - b.longitude) < eps
  );
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = (await req.json()) as Record<string, unknown>;
    const visitId = body.visitId;
    const visitorId = body.visitorId;
    const sessionId = body.sessionId;
    const stage = typeof body.stage === "string" ? body.stage : "bootstrap";
    const device = body.device;
    const cookies = body.cookies;
    const locationGranted = body.locationGranted;
    const event = body.event;

    // Server IP geo in background (no browser popup)
    const meta = await enrichIpGeo(baseServerMeta(req));
    const now = new Date().toISOString();
    const eventEntry =
      event && typeof event === "object"
        ? { ...(event as object), at: (event as { at?: string }).at || now }
        : { type: stage || "ping", at: now };

    const devicePayload =
      device && typeof device === "object"
        ? {
            ...(device as object),
            userAgent:
              (device as { userAgent?: string }).userAgent ||
              req.headers.get("user-agent") ||
              undefined,
          }
        : undefined;

    // Build points to append this request
    const pointsToAdd: ILocationPoint[] = [];
    const gps = gpsPoint(body, now);
    if (gps) pointsToAdd.push(gps);

    // Always capture IP-based geo when available (no popup)
    const ipPoint = ipLocationFromMeta(meta, now);
    if (ipPoint && (stage === "bootstrap" || stage === "silent" || !gps)) {
      pointsToAdd.push(ipPoint);
    }

    // Client can send locations[] array too
    if (Array.isArray(body.locations)) {
      for (const item of body.locations) {
        if (!item || typeof item !== "object") continue;
        const p = gpsPoint(item as Record<string, unknown>, now);
        if (p) pointsToAdd.push(p);
      }
    }

    const applyPoints = (existing: ILocationPoint[] = []) => {
      const list = [...existing];
      for (const p of pointsToAdd) {
        const dup = list.some((x) => isNearDuplicate(x, p));
        if (!dup) list.push(p);
      }
      return list;
    };

    const primaryFrom = (list: ILocationPoint[]) => {
      // ALWAYS prefer real GPS over IP approx (IP can show wrong country e.g. USA)
      const gpsLast = [...list]
        .reverse()
        .find((p) => p.source === "gps" || p.source === "network");
      if (gpsLast) return gpsLast;
      const last = list[list.length - 1];
      return last || null;
    };

    // ---- UPDATE by visitId ----
    if (visitId && typeof visitId === "string") {
      const existing = await UserLocation.findById(visitId);
      if (existing) {
        const list = applyPoints(
          Array.isArray(existing.locations) ? existing.locations : []
        );
        const primary = primaryFrom(list);

        existing.stage = stage || "update";
        existing.ip = meta.ip;
        existing.server = meta;
        existing.locations = list;
        existing.locationCount = list.length;
        if (visitorId) existing.visitorId = String(visitorId);
        if (sessionId) existing.sessionId = String(sessionId);
        if (cookies && typeof cookies === "object") {
          existing.cookies = cookies as Record<string, string>;
        }
        if (devicePayload) existing.device = devicePayload;

        if (primary) {
          existing.latitude = primary.latitude;
          existing.longitude = primary.longitude;
          existing.accuracy = primary.accuracy ?? null;
          existing.altitude = primary.altitude ?? null;
          existing.heading = primary.heading ?? null;
          existing.speed = primary.speed ?? null;
        }
        if (gps || locationGranted === true) {
          existing.locationGranted = true;
        } else if (locationGranted === false && !existing.locationGranted) {
          existing.locationGranted = list.some((p) => p.source === "gps");
        }

        const events = Array.isArray(existing.events) ? existing.events : [];
        events.push(eventEntry as { type: string; at: string });
        existing.events = events;
        await existing.save();

        return NextResponse.json({
          ok: true,
          id: existing._id.toString(),
          visitorId: existing.visitorId,
          sessionId: existing.sessionId,
          locationCount: list.length,
          locations: list,
          updated: true,
        });
      }
    }

    // ---- UPDATE by sessionId ----
    if (sessionId && typeof sessionId === "string") {
      const existing = await UserLocation.findOne({ sessionId }).sort({
        createdAt: -1,
      });
      if (existing) {
        const list = applyPoints(
          Array.isArray(existing.locations) ? existing.locations : []
        );
        const primary = primaryFrom(list);

        existing.stage = stage || "update";
        existing.ip = meta.ip;
        existing.server = meta;
        existing.locations = list;
        existing.locationCount = list.length;
        if (devicePayload) existing.device = devicePayload;
        if (cookies && typeof cookies === "object") {
          existing.cookies = cookies as Record<string, string>;
        }
        if (primary) {
          existing.latitude = primary.latitude;
          existing.longitude = primary.longitude;
          existing.accuracy = primary.accuracy ?? null;
          existing.altitude = primary.altitude ?? null;
          existing.heading = primary.heading ?? null;
          existing.speed = primary.speed ?? null;
        }
        if (gps) existing.locationGranted = true;

        const events = Array.isArray(existing.events) ? existing.events : [];
        events.push(eventEntry as { type: string; at: string });
        existing.events = events;
        await existing.save();

        return NextResponse.json({
          ok: true,
          id: existing._id.toString(),
          visitorId: existing.visitorId,
          sessionId: existing.sessionId,
          locationCount: list.length,
          locations: list,
          updated: true,
        });
      }
    }

    // ---- CREATE bootstrap ----
    const list = applyPoints([]);
    const primary = primaryFrom(list);

    const doc = await UserLocation.create({
      visitorId: visitorId ? String(visitorId) : undefined,
      sessionId: sessionId ? String(sessionId) : undefined,
      stage: stage || "bootstrap",
      latitude: primary?.latitude ?? null,
      longitude: primary?.longitude ?? null,
      accuracy: primary?.accuracy ?? null,
      altitude: primary?.altitude ?? null,
      heading: primary?.heading ?? null,
      speed: primary?.speed ?? null,
      locationGranted: !!gps || locationGranted === true,
      locationCount: list.length,
      locations: list,
      ip: meta.ip,
      cookies: cookies && typeof cookies === "object" ? cookies : {},
      server: meta,
      device: devicePayload || {
        userAgent: req.headers.get("user-agent") || undefined,
      },
      events: [eventEntry],
    });

    return NextResponse.json({
      ok: true,
      id: doc._id.toString(),
      visitorId: doc.visitorId,
      sessionId: doc.sessionId,
      locationCount: list.length,
      locations: list,
      updated: false,
    });
  } catch (error) {
    console.error("Track/save error:", error);
    return NextResponse.json(
      { ok: false, message: "Server error" },
      { status: 500 }
    );
  }
}
