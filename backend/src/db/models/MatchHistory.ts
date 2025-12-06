// backend/src/db/models/MatchHistory.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IMatchPlayer {
  walletAddress: string;
  odlId: string; // WebSocket client ID during match
  avatar?: object | null;
  finalHp: number;
}

export interface IMatchHistory extends Document {
  matchId: string;
  players: IMatchPlayer[];
  winner: string | null; // wallet address of winner, null if draw
  loser: string | null;
  duration: number; // in seconds
  endReason: "knockout" | "timeout" | "forfeit" | "disconnect" | "hp_depleted" | "finished";
  coinsAwarded: number;
  createdAt: Date;
}

const MatchHistorySchema = new Schema<IMatchHistory>(
  {
    matchId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    players: [
      {
        walletAddress: String,
        odlId: String,
        avatar: Schema.Types.Mixed,
        finalHp: Number,
      },
    ],
    winner: {
      type: String,
      default: null,
      index: true,
    },
    loser: {
      type: String,
      default: null,
    },
    duration: {
      type: Number,
      default: 0,
    },
    endReason: {
      type: String,
      enum: ["knockout", "timeout", "forfeit", "disconnect", "hp_depleted", "finished"],
      default: "knockout",
    },
    coinsAwarded: {
      type: Number,
      default: 10,
    },
  },
  {
    timestamps: true,
  }
);

// Index for leaderboard queries
MatchHistorySchema.index({ createdAt: -1 });
MatchHistorySchema.index({ winner: 1, createdAt: -1 });

export const MatchHistory = mongoose.model<IMatchHistory>("MatchHistory", MatchHistorySchema);
