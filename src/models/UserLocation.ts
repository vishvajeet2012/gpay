import mongoose, { Schema, models, model } from "mongoose";

const ScreenSchema = new Schema(
  {
    width: Number,
    height: Number,
    availWidth: Number,
    availHeight: Number,
    colorDepth: Number,
    pixelDepth: Number,
    orientation: String,
  },
  { _id: false }
);

const ViewportSchema = new Schema(
  {
    width: Number,
    height: Number,
    devicePixelRatio: Number,
  },
  { _id: false }
);

const ConnectionSchema = new Schema(
  {
    effectiveType: String,
    downlink: Number,
    rtt: Number,
    saveData: Boolean,
    type: String,
  },
  { _id: false }
);

const DeviceSchema = new Schema(
  {
    userAgent: String,
    platform: String,
    vendor: String,
    language: String,
    languages: [String],
    cookieEnabled: Boolean,
    hardwareConcurrency: Number,
    deviceMemory: Number,
    maxTouchPoints: Number,
    isTouch: Boolean,
    isMobile: Boolean,
    os: String,
    browser: String,
    brands: [String],
    screen: ScreenSchema,
    viewport: ViewportSchema,
    timezone: String,
    timezoneOffset: Number,
    connection: ConnectionSchema,
    online: Boolean,
    referrer: String,
    pageUrl: String,
  },
  { _id: false }
);

export interface IUserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number | null;
  heading?: number | null;
  speed?: number | null;
  ip?: string;
  device?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

const UserLocationSchema = new Schema<IUserLocation>(
  {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    accuracy: { type: Number },
    altitude: { type: Number, default: null },
    heading: { type: Number, default: null },
    speed: { type: Number, default: null },
    ip: { type: String },
    device: { type: DeviceSchema },
  },
  { timestamps: true }
);

const UserLocation =
  models.UserLocation ||
  model<IUserLocation>("UserLocation", UserLocationSchema);

export default UserLocation;
