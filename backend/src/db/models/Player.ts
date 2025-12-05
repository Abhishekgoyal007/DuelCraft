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

export interface IPlayer extends Document {
  walletAddress: string;
  avatar: IAvatar;
  coins: number;
  purchases: IPurchase[];
  ownedSkins: string[]; // skin IDs the player owns
  settings: {
    soundEnabled?: boolean;
    musicEnabled?: boolean;
  };
  stats: {
    wins: number;
    losses: number;
    totalMatches: number;
  };
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
