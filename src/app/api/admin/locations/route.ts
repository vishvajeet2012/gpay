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
      locations: locations.map((doc) => ({
        id: String(doc._id),
        latitude: doc.latitude,
        longitude: doc.longitude,
        accuracy: doc.accuracy ?? null,
        altitude: doc.altitude ?? null,
        heading: doc.heading ?? null,
        speed: doc.speed ?? null,
        ip: doc.ip ?? null,
        device: doc.device ?? null,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        mapsUrl: `https://www.google.com/maps?q=${doc.latitude},${doc.longitude}`,
      })),
    });
  } catch (error) {
    console.error("Admin locations error:", error);
    return NextResponse.json(
      { ok: false, message: "Server error" },
      { status: 500 }
    );
  }
}
