import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import UserLocation from "@/models/UserLocation";
import { isAdminAuthenticated } from "@/lib/adminAuth";

/** Delete one location by id, or all when body.all === true */
export async function POST(req: NextRequest) {
  try {
    const ok = await isAdminAuthenticated();
    if (!ok) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();
    const body = await req.json().catch(() => ({}));

    // Delete ALL
    if (body.all === true) {
      const result = await UserLocation.deleteMany({});
      return NextResponse.json({
        ok: true,
        deleted: result.deletedCount ?? 0,
        mode: "all",
      });
    }

    // Delete one
    const id = body.id || body.locationId;
    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { ok: false, message: "Missing id or all:true" },
        { status: 400 }
      );
    }

    const result = await UserLocation.findByIdAndDelete(id);
    if (!result) {
      return NextResponse.json(
        { ok: false, message: "Not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      deleted: 1,
      id,
      mode: "one",
    });
  } catch (error) {
    console.error("Admin delete error:", error);
    return NextResponse.json(
      { ok: false, message: "Server error" },
      { status: 500 }
    );
  }
}
