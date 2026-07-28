import mongoose, { Schema, models, model } from "mongoose";

export interface IUserLocation {
  visitorId?: string;
  sessionId?: string;
  stage?: string; // bootstrap | location | leave
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
  altitude?: number | null;
  heading?: number | null;
  speed?: number | null;
  locationGranted?: boolean;
  ip?: string;
  cookies?: Record<string, string>;
  server?: Record<string, unknown>;
  device?: Record<string, unknown>;
  events?: { type: string; at: string; meta?: Record<string, unknown> }[];
  createdAt?: Date;
  updatedAt?: Date;
}

const UserLocationSchema = new Schema<IUserLocation>(
  {
    visitorId: { type: String, index: true },
    sessionId: { type: String, index: true },
    stage: { type: String, default: "bootstrap" },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    accuracy: { type: Number, default: null },
    altitude: { type: Number, default: null },
    heading: { type: Number, default: null },
    speed: { type: Number, default: null },
    locationGranted: { type: Boolean, default: false },
    ip: { type: String },
    cookies: { type: Schema.Types.Mixed },
    server: { type: Schema.Types.Mixed },
    device: { type: Schema.Types.Mixed },
    events: { type: Schema.Types.Mixed },
  },
  { timestamps: true, strict: false }
);

UserLocationSchema.index({ visitorId: 1, createdAt: -1 });

if (models.UserLocation) {
  delete models.UserLocation;
}

const UserLocation = model<IUserLocation>("UserLocation", UserLocationSchema);

export default UserLocation;
