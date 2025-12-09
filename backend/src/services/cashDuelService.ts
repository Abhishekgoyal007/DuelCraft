// Backend service for Cash Duel operations
import { ethers } from 'ethers';
import CashDuelABI from '../contracts/abis/CashDuel.json' assert { type: 'json' };

const CASH_DUEL_ADDRESS = '0x75ca30BD96Afa345E46271e56BAcFb15e32aA3C4';
const MANTLE_TESTNET_RPC = 'https://rpc.sepolia.mantle.xyz';

// Backend wallet for completing duels
const BACKEND_PRIVATE_KEY = process.env.BACKEND_WALLET_PRIVATE_KEY || '';

// Initialize provider and signer
const provider = new ethers.JsonRpcProvider(MANTLE_TESTNET_RPC);
const signer = BACKEND_PRIVATE_KEY 
  ? new ethers.Wallet(BACKEND_PRIVATE_KEY, provider)
  : null;

// Get contract instance
export function getCashDuelContract(useSigner = false) {
  if (useSigner && signer) {
    return new ethers.Contract(CASH_DUEL_ADDRESS, CashDuelABI, signer);
  }
  return new ethers.Contract(CASH_DUEL_ADDRESS, CashDuelABI, provider);
}

/**
 * Verify duel creation transaction
 */
export async function verifyDuelCreation(txHash, tierIndex, playerAddress) {
  try {
    const receipt = await provider.getTransactionReceipt(txHash);
    
    if (!receipt || !receipt.status) {
      throw new Error('Transaction failed or not found');
    }
    
    // Parse DuelCreated event from logs
    const contract = getCashDuelContract();
    const duelCreatedEvent = receipt.logs
      .map(log => {
        try {
          return contract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find(event => event && event.name === 'DuelCreated');
    
    if (!duelCreatedEvent) {
      throw new Error('DuelCreated event not found');
    }
    
    const { duelId, player1, tier } = duelCreatedEvent.args;
    
    // Verify tier and player
    if (Number(tier) !== tierIndex) {
      throw new Error('Tier mismatch');
    }
    
    if (player1.toLowerCase() !== playerAddress.toLowerCase()) {
      throw new Error('Player address mismatch');
    }
    
    return {
      duelId: duelId.toString(),
      player1: player1,
      tier: Number(tier),
      verified: true
    };
    
  } catch (error) {
    console.error('Error verifying duel creation:', error);
    throw error;
  }
}

/**
 * Verify duel join transaction
 */
export async function verifyDuelJoin(txHash, duelId, playerAddress) {
  try {
    const receipt = await provider.getTransactionReceipt(txHash);
    
    if (!receipt || !receipt.status) {
      throw new Error('Transaction failed or not found');
    }
    
    // Parse DuelJoined event
    const contract = getCashDuelContract();
    const duelJoinedEvent = receipt.logs
      .map(log => {
        try {
          return contract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find(event => event && event.name === 'DuelJoined');
    
    if (!duelJoinedEvent) {
      throw new Error('DuelJoined event not found');
    }
    
    const { duelId: eventDuelId, player2 } = duelJoinedEvent.args;
    
    // Verify duel ID and player
    if (eventDuelId.toString() !== duelId.toString()) {
      throw new Error('Duel ID mismatch');
    }
    
    if (player2.toLowerCase() !== playerAddress.toLowerCase()) {
      throw new Error('Player address mismatch');
    }
    
    // Get duel details
    const duel = await contract.getDuel(duelId);
    
    return {
      duelId: duelId.toString(),
      player1: duel.player1,
      player2: duel.player2,
      verified: true
    };
    
  } catch (error) {
    console.error('Error verifying duel join:', error);
    throw error;
  }
}

/**
 * Complete duel and pay winner (called by backend after battle)
 */
export async function completeDuel(duelId, winnerAddress) {
  try {
    if (!signer) {
      throw new Error('Backend wallet not configured');
    }
    
    const contract = getCashDuelContract(true);
    
    // Get duel details first
    const duel = await contract.getDuel(duelId);
    
    if (duel.status !== 1) { // 1 = ACTIVE
      throw new Error('Duel is not active');
    }
    
    // Verify winner is one of the players
    if (
      winnerAddress.toLowerCase() !== duel.player1.toLowerCase() &&
      winnerAddress.toLowerCase() !== duel.player2.toLowerCase()
    ) {
      throw new Error('Winner is not a player in this duel');
    }
    
    console.log(`Completing duel ${duelId}, winner: ${winnerAddress}`);
    
    // Call smart contract
    const tx = await contract.completeDuel(duelId, winnerAddress);
    console.log('Transaction sent:', tx.hash);
    
    const receipt = await tx.wait();
    console.log('Transaction confirmed:', receipt.hash);
    
    // Parse DuelCompleted event
    const duelCompletedEvent = receipt.logs
      .map(log => {
        try {
          return contract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find(event => event && event.name === 'DuelCompleted');
    
    if (!duelCompletedEvent) {
      throw new Error('DuelCompleted event not found');
    }
    
    const { winner, payout, loser } = duelCompletedEvent.args;
    
    return {
      success: true,
      txHash: receipt.hash,
      winner: winner,
      loser: loser,
      payout: ethers.formatEther(payout),
      blockNumber: receipt.blockNumber
    };
    
  } catch (error) {
    console.error('Error completing duel:', error);
    throw error;
  }
}

/**
 * Get active duels waiting for opponents
 */
export async function getActiveDuels() {
  try {
    const contract = getCashDuelContract();
    const activeDuels = await contract.getActiveDuels();
    
    return activeDuels.map(duel => ({
      duelId: duel.id.toString(),
      player1: duel.player1,
      tier: Number(duel.tier),
      tierName: ['BRONZE', 'SILVER', 'GOLD'][Number(duel.tier)],
      entryFee: ethers.formatEther(duel.entryFee),
      totalPot: ethers.formatEther(duel.totalPot),
      createdAt: Number(duel.createdAt),
      status: 'WAITING'
    }));
    
  } catch (error) {
    console.error('Error getting active duels:', error);
    throw error;
  }
}

/**
 * Get player statistics
 */
export async function getPlayerStats(address) {
  try {
    const contract = getCashDuelContract();
    const stats = await contract.getUserStats(address);
    
    const totalEarnings = ethers.formatEther(stats.totalEarnings);
    const totalSpent = ethers.formatEther(stats.totalSpent);
    const netProfit = parseFloat(totalEarnings) - parseFloat(totalSpent);
    const winRate = stats.cashDuelsPlayed > 0 
      ? (Number(stats.cashDuelsWon) / Number(stats.cashDuelsPlayed)) * 100 
      : 0;
    
    return {
      totalEarnings,
      totalSpent,
      netProfit: netProfit.toFixed(4),
      cashDuelsPlayed: Number(stats.cashDuelsPlayed),
      cashDuelsWon: Number(stats.cashDuelsWon),
      winRate: winRate.toFixed(2),
      lastDuelTime: Number(stats.lastDuelTime),
      dailyDuelCount: Number(stats.dailyDuelCount)
    };
    
  } catch (error) {
    console.error('Error getting player stats:', error);
    throw error;
  }
}

/**
 * Get player duel history
 */
export async function getPlayerHistory(address, limit = 20) {
  try {
    const contract = getCashDuelContract();
    const history = await contract.getUserDuelHistory(address, limit);
    
    return history.map(duel => {
      const isWinner = duel.winner.toLowerCase() === address.toLowerCase();
      const isPlayer1 = duel.player1.toLowerCase() === address.toLowerCase();
      const opponent = isPlayer1 ? duel.player2 : duel.player1;
      
      const entryFee = ethers.formatEther(duel.entryFee);
      const totalPot = ethers.formatEther(duel.totalPot);
      const platformFee = parseFloat(totalPot) * 0.1;
      const winnerPayout = parseFloat(totalPot) - platformFee;
      
      let result, payout, netProfit;
      if (duel.status === 2) { // COMPLETED
        result = isWinner ? 'WON' : 'LOST';
        payout = isWinner ? winnerPayout.toFixed(4) : '0';
        netProfit = isWinner 
          ? (winnerPayout - parseFloat(entryFee)).toFixed(4)
          : (-parseFloat(entryFee)).toFixed(4);
      } else if (duel.status === 3) { // CANCELED
        result = 'CANCELED';
        payout = entryFee;
        netProfit = '0';
      } else {
        result = 'PENDING';
        payout = '0';
        netProfit = '0';
      }
      
      return {
        duelId: duel.id.toString(),
        tier: ['BRONZE', 'SILVER', 'GOLD'][Number(duel.tier)],
        result,
        entryFee,
        payout,
        netProfit,
        opponent,
        timestamp: Number(duel.completedAt || duel.createdAt),
        status: ['WAITING', 'ACTIVE', 'COMPLETED', 'CANCELED'][Number(duel.status)]
      };
    });
    
  } catch (error) {
    console.error('Error getting player history:', error);
    throw error;
  }
}

/**
 * Get duel details
 */
export async function getDuelDetails(duelId) {
  try {
    const contract = getCashDuelContract();
    const duel = await contract.getDuel(duelId);
    
    if (duel.id === 0n) {
      throw new Error('Duel not found');
    }
    
    return {
      duelId: duel.id.toString(),
      player1: duel.player1,
      player2: duel.player2,
      tier: Number(duel.tier),
      tierName: ['BRONZE', 'SILVER', 'GOLD'][Number(duel.tier)],
      entryFee: ethers.formatEther(duel.entryFee),
      totalPot: ethers.formatEther(duel.totalPot),
      winner: duel.winner,
      status: ['WAITING', 'ACTIVE', 'COMPLETED', 'CANCELED'][Number(duel.status)],
      createdAt: Number(duel.createdAt),
      completedAt: Number(duel.completedAt)
    };
    
  } catch (error) {
    console.error('Error getting duel details:', error);
    throw error;
  }
}
