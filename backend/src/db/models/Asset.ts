// backend/src/db/models/Asset.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IAsset extends Document {
  assetId: string;           // unique identifier (e.g., "body_warrior_001")
  category: "body" | "hair" | "eyes" | "tops" | "bottoms" | "shoes" | "effect" | "background";
  name: string;
  description: string;
  url: string;               // CDN/public URL for the image
  thumbnailUrl?: string;     // smaller preview image
  price: number;             // cost in coins (0 = free/default)
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  isDefault: boolean;        // true = available to everyone without purchase
  isActive: boolean;         // false = hidden from shop
  sortOrder: number;         // for display ordering
  metadata: {
    color?: string;          // primary color for filtering
    style?: string;          // "pixel", "cartoon", etc.
    animated?: boolean;      // has animation frames
    frameCount?: number;     // if animated
  };
  createdAt: Date;
  updatedAt: Date;
}

const AssetSchema = new Schema<IAsset>(
  {
    assetId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    category: {
      type: String,
      enum: ["body", "hair", "eyes", "tops", "bottoms", "shoes", "effect", "background"],
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    url: {
      type: String,
      required: true,
    },
    thumbnailUrl: {
      type: String,
      default: null,
    },
    price: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    rarity: {
      type: String,
      enum: ["common", "uncommon", "rare", "epic", "legendary"],
      default: "common",
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    metadata: {
      color: String,
      style: { type: String, default: "pixel" },
      animated: { type: Boolean, default: false },
      frameCount: Number,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
AssetSchema.index({ category: 1, isActive: 1, sortOrder: 1 });
AssetSchema.index({ rarity: 1 });
AssetSchema.index({ isDefault: 1 });

export const Asset = mongoose.model<IAsset>("Asset", AssetSchema);
