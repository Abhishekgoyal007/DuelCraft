// backend/src/db/models/ShopItem.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IShopItem extends Document {
  itemId: string;
  name: string;
  description: string;
  type: "skin" | "color" | "face" | "effect" | "bundle";
  price: number; // in coins
  category: string;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  metadata: {
    color?: string;
    body?: string;
    face?: string;
    preview?: string; // image URL
  };
  isNFT: boolean; // if true, represents an on-chain NFT
  nftContract?: string; // contract address if NFT
  nftTokenId?: string; // token ID if NFT
  isActive: boolean;
  limitedStock?: number; // null = unlimited
  soldCount: number;
  createdAt: Date;
}

const ShopItemSchema = new Schema<IShopItem>(
  {
    itemId: {
      type: String,
      required: true,
      unique: true,
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
    type: {
      type: String,
      enum: ["skin", "color", "face", "effect", "bundle"],
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: String,
      default: "general",
    },
    rarity: {
      type: String,
      enum: ["common", "uncommon", "rare", "epic", "legendary"],
      default: "common",
    },
    metadata: {
      color: String,
      body: String,
      face: String,
      preview: String,
    },
    isNFT: {
      type: Boolean,
      default: false,
    },
    nftContract: String,
    nftTokenId: String,
    isActive: {
      type: Boolean,
      default: true,
    },
    limitedStock: {
      type: Number,
      default: null,
    },
    soldCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const ShopItem = mongoose.model<IShopItem>("ShopItem", ShopItemSchema);
