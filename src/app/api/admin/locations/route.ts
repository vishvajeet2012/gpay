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
        const points = Array.isArray(doc.locations) ? doc.locations : [];
        const lat = doc.latitude ?? points[points.length - 1]?.latitude ?? null;
        const lng =
          doc.longitude ?? points[points.length - 1]?.longitude ?? null;
        const hasCoords =
          typeof lat === "number" &&
          typeof lng === "number" &&
          !Number.isNaN(lat) &&
          !Number.isNaN(lng);

        const normalizedPoints = points.map((p) => ({
          ...p,
          mapsUrl:
            p.mapsUrl ||
            (p.latitude != null && p.longitude != null
              ? `https://www.google.com/maps?q=${p.latitude},${p.longitude}`
              : null),
        }));

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
          locationCount: doc.locationCount ?? points.length,
          locations: normalizedPoints,
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
