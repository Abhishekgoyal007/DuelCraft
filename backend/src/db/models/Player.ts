// backend/src/db/models/Player.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IAvatar {
  body?: string;
  hair?: string;
  face?: string;
  color?: string;
}

export interface IPurchase {
  itemId: string;
  purchasedAt: Date;
  price: number;
}

// Equipped asset IDs - references to Asset.assetId
export interface IEquipped {
  body?: string;      // assetId for body
  hair?: string;      // assetId for hair
  eyes?: string;      // assetId for eyes
  tops?: string;      // assetId for top clothing
  bottoms?: string;   // assetId for bottom clothing
  shoes?: string;     // assetId for shoes
  effect?: string;    // assetId for special effect
}

export interface IPlayer extends Document {
  walletAddress: string;
  avatar: IAvatar;
  equipped: IEquipped;  // NEW: equipped asset IDs
  coins: number;
  purchases: IPurchase[];
  ownedAssets: string[]; // asset IDs the player owns (purchased or earned)
  ownedSkins: string[]; // legacy - shop item IDs
  settings: {
    soundEnabled?: boolean;
    musicEnabled?: boolean;
  };
  stats: {
    wins: number;
    losses: number;
    totalMatches: number;
  };
  selectedCharacter?: string; // char_warrior or char_mage
  nonce: string; // for wallet signature verification
  createdAt: Date;
  updatedAt: Date;
}

const PlayerSchema = new Schema<IPlayer>(
  {
    walletAddress: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    avatar: {
      body: { type: String, default: "square" },
      hair: { type: String, default: "short" },
      face: { type: String, default: "smile" },
      color: { type: String, default: "#66c2ff" },
    },
    // NEW: Equipped assets (references Asset.assetId)
    equipped: {
      body: { type: String, default: "body_default" },
      hair: { type: String, default: "hair_default" },
      eyes: { type: String, default: "eyes_default" },
      tops: { type: String, default: "tops_default" },
      bottoms: { type: String, default: "bottoms_default" },
      shoes: { type: String, default: null },
      effect: { type: String, default: null },
    },
    coins: {
      type: Number,
      default: 100, // starting coins
      min: 0,
    },
    purchases: [
      {
        itemId: String,
        purchasedAt: { type: Date, default: Date.now },
        price: Number,
      },
    ],
    ownedAssets: {
      type: [String],
      default: [],
    },
    ownedSkins: {
      type: [String],
      default: [],
    },
    settings: {
      soundEnabled: { type: Boolean, default: true },
      musicEnabled: { type: Boolean, default: true },
    },
    stats: {
      wins: { type: Number, default: 0 },
      losses: { type: Number, default: 0 },
      totalMatches: { type: Number, default: 0 },
    },
    selectedCharacter: {
      type: String,
      default: null,
    },
    nonce: {
      type: String,
      default: () => Math.random().toString(36).substring(2, 15),
    },
  },
  {
    timestamps: true,
  }
);

export const Player = mongoose.model<IPlayer>("Player", PlayerSchema);
