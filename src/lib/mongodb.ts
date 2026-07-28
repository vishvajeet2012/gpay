import mongoose from "mongoose";

// Hardcoded MongoDB connection string
const MONGODB_URL =
  "mongodb+srv://kingofjalore2:M59yl2yJYSHuw9Jw@dynamic.y9hsk.mongodb.net/?retryWrites=true&w=majority&appName=dynamic";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache ?? {
  conn: null,
  promise: null,
};

global.mongooseCache = cached;

export async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URL).then((m) => m);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export default connectDB;
