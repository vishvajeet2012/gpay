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

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const {
      latitude,
      longitude,
      accuracy,
      altitude,
      heading,
      speed,
      device,
      locationGranted,
    } = body;

    const hasLocation =
      typeof latitude === "number" &&
      typeof longitude === "number" &&
      !Number.isNaN(latitude) &&
      !Number.isNaN(longitude);

    const devicePayload =
      device && typeof device === "object"
        ? {
            ...device,
            userAgent:
              (device as { userAgent?: string }).userAgent ||
              req.headers.get("user-agent") ||
              undefined,
          }
        : {
            userAgent: req.headers.get("user-agent") || undefined,
          };

    const serverMeta = {
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

    const doc = await UserLocation.create({
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
      ip: serverMeta.ip,
      server: serverMeta,
      device: devicePayload,
    });

    return NextResponse.json({ ok: true, id: doc._id.toString() });
  } catch (error) {
    console.error("Location save error:", error);
    return NextResponse.json(
      { ok: false, message: "Server error" },
      { status: 500 }
    );
  }
}
