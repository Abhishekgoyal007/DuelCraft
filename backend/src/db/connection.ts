// backend/src/db/connection.ts
import mongoose from "mongoose";

export async function connectDB(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri) {
    console.warn("[DB] MONGODB_URI not set - running without database");
    return;
  }

  try {
    await mongoose.connect(mongoUri);
    console.log("[DB] Connected to MongoDB Atlas");
  } catch (err) {
    console.error("[DB] MongoDB connection error:", err);
    throw err;
  }
}

export function isDBConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
