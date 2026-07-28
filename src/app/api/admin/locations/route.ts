import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import UserLocation from "@/models/UserLocation";
import { isAdminAuthenticated } from "@/lib/adminAuth";

export async function GET() {
  try {
    const ok = await isAdminAuthenticated();
    if (!ok) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    const locations = await UserLocation.find()
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      ok: true,
      count: locations.length,
      locations: locations.map((doc) => {
        const lat = doc.latitude ?? null;
        const lng = doc.longitude ?? null;
        const hasCoords =
          typeof lat === "number" &&
          typeof lng === "number" &&
          !Number.isNaN(lat) &&
          !Number.isNaN(lng);

        return {
          id: String(doc._id),
          visitorId: doc.visitorId ?? null,
          sessionId: doc.sessionId ?? null,
          stage: doc.stage ?? null,
          latitude: lat,
          longitude: lng,
          accuracy: doc.accuracy ?? null,
          altitude: doc.altitude ?? null,
          heading: doc.heading ?? null,
          speed: doc.speed ?? null,
          locationGranted: !!doc.locationGranted || hasCoords,
          ip: doc.ip ?? null,
          cookies: doc.cookies ?? null,
          events: doc.events ?? null,
          device: doc.device ?? null,
          server: doc.server ?? null,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
          mapsUrl: hasCoords
            ? `https://www.google.com/maps?q=${lat},${lng}`
            : null,
        };
      }),
    });
  } catch (error) {
    console.error("Admin locations error:", error);
    return NextResponse.json(
      { ok: false, message: "Server error" },
      { status: 500 }
    );
  }
}
