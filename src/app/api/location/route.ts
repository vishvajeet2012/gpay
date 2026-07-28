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
    undefined
  );
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
    } = body;

    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      Number.isNaN(latitude) ||
      Number.isNaN(longitude)
    ) {
      return NextResponse.json(
        { ok: false, message: "Invalid coordinates" },
        { status: 400 }
      );
    }

    // Prefer client-collected UA; fallback to request header
    const devicePayload =
      device && typeof device === "object"
        ? {
            ...device,
            userAgent:
              device.userAgent || req.headers.get("user-agent") || undefined,
          }
        : {
            userAgent: req.headers.get("user-agent") || undefined,
          };

    const doc = await UserLocation.create({
      latitude,
      longitude,
      accuracy:
        typeof accuracy === "number" && !Number.isNaN(accuracy)
          ? accuracy
          : undefined,
      altitude: typeof altitude === "number" ? altitude : null,
      heading: typeof heading === "number" ? heading : null,
      speed: typeof speed === "number" ? speed : null,
      ip: getClientIp(req),
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
