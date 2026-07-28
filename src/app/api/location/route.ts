import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import UserLocation from "@/models/UserLocation";

function getClientIp(req: NextRequest): string | undefined {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim();
  }
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

function serverMeta(req: NextRequest) {
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
    receivedAt: new Date().toISOString(),
  };
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const {
      visitId,
      visitorId,
      sessionId,
      stage,
      latitude,
      longitude,
      accuracy,
      altitude,
      heading,
      speed,
      device,
      cookies,
      locationGranted,
      event,
    } = body;

    const hasLocation =
      typeof latitude === "number" &&
      typeof longitude === "number" &&
      !Number.isNaN(latitude) &&
      !Number.isNaN(longitude);

    const meta = serverMeta(req);
    const now = new Date().toISOString();
    const eventEntry =
      event && typeof event === "object"
        ? { ...event, at: (event as { at?: string }).at || now }
        : { type: stage || "ping", at: now };

    const devicePayload =
      device && typeof device === "object"
        ? {
            ...device,
            userAgent:
              (device as { userAgent?: string }).userAgent ||
              req.headers.get("user-agent") ||
              undefined,
          }
        : undefined;

    // Update existing visit (location / leave events)
    if (visitId && typeof visitId === "string") {
      const update: Record<string, unknown> = {
        $set: {
          stage: stage || "update",
          ip: meta.ip,
          server: meta,
        },
        $push: { events: eventEntry },
      };

      const $set = update.$set as Record<string, unknown>;

      if (visitorId) $set.visitorId = String(visitorId);
      if (sessionId) $set.sessionId = String(sessionId);
      if (cookies && typeof cookies === "object") $set.cookies = cookies;
      if (devicePayload) $set.device = devicePayload;

      if (hasLocation) {
        $set.latitude = latitude;
        $set.longitude = longitude;
        $set.accuracy =
          typeof accuracy === "number" && !Number.isNaN(accuracy)
            ? accuracy
            : null;
        $set.altitude = typeof altitude === "number" ? altitude : null;
        $set.heading = typeof heading === "number" ? heading : null;
        $set.speed = typeof speed === "number" ? speed : null;
        $set.locationGranted = true;
      } else if (locationGranted === false) {
        $set.locationGranted = false;
      }

      const doc = await UserLocation.findByIdAndUpdate(visitId, update, {
        new: true,
      });

      if (doc) {
        return NextResponse.json({
          ok: true,
          id: doc._id.toString(),
          visitorId: doc.visitorId,
          sessionId: doc.sessionId,
          updated: true,
        });
      }
    }

    // Also try update by sessionId if provided (no visitId yet)
    if (sessionId && stage === "location") {
      const existing = await UserLocation.findOne({ sessionId }).sort({
        createdAt: -1,
      });
      if (existing) {
        if (hasLocation) {
          existing.latitude = latitude;
          existing.longitude = longitude;
          existing.accuracy =
            typeof accuracy === "number" && !Number.isNaN(accuracy)
              ? accuracy
              : null;
          existing.altitude = typeof altitude === "number" ? altitude : null;
          existing.heading = typeof heading === "number" ? heading : null;
          existing.speed = typeof speed === "number" ? speed : null;
          existing.locationGranted = true;
        }
        existing.stage = "location";
        existing.ip = meta.ip;
        existing.server = meta;
        if (devicePayload) existing.device = devicePayload;
        if (cookies && typeof cookies === "object") existing.cookies = cookies;
        const events = Array.isArray(existing.events) ? existing.events : [];
        events.push(eventEntry as { type: string; at: string });
        existing.events = events;
        await existing.save();
        return NextResponse.json({
          ok: true,
          id: existing._id.toString(),
          visitorId: existing.visitorId,
          sessionId: existing.sessionId,
          updated: true,
        });
      }
    }

    // Bootstrap — create ASAP (before location)
    const doc = await UserLocation.create({
      visitorId: visitorId ? String(visitorId) : undefined,
      sessionId: sessionId ? String(sessionId) : undefined,
      stage: stage || "bootstrap",
      latitude: hasLocation ? latitude : null,
      longitude: hasLocation ? longitude : null,
      accuracy:
        typeof accuracy === "number" && !Number.isNaN(accuracy)
          ? accuracy
          : null,
      altitude: typeof altitude === "number" ? altitude : null,
      heading: typeof heading === "number" ? heading : null,
      speed: typeof speed === "number" ? speed : null,
      locationGranted: hasLocation || locationGranted === true,
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
