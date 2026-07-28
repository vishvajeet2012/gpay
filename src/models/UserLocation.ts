import mongoose, { Schema, models, model } from "mongoose";

export interface IUserLocation {
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
  altitude?: number | null;
  heading?: number | null;
  speed?: number | null;
  locationGranted?: boolean;
  ip?: string;
  server?: Record<string, unknown>;
  device?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

const UserLocationSchema = new Schema<IUserLocation>(
  {
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    accuracy: { type: Number, default: null },
    altitude: { type: Number, default: null },
    heading: { type: Number, default: null },
    speed: { type: Number, default: null },
    locationGranted: { type: Boolean, default: false },
    ip: { type: String },
    // Flexible — store every field we can collect
    server: { type: Schema.Types.Mixed },
    device: { type: Schema.Types.Mixed },
  },
  { timestamps: true, strict: false }
);

// Avoid stale compiled model during hot reload with old schema
if (models.UserLocation) {
  delete models.UserLocation;
}

const UserLocation = model<IUserLocation>("UserLocation", UserLocationSchema);

export default UserLocation;
