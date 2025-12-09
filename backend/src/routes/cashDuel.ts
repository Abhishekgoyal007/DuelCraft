// Cash Duel API routes
import express from 'express';
import {
  verifyDuelCreation,
  verifyDuelJoin,
  completeDuel,
  getActiveDuels,
  getPlayerStats,
  getPlayerHistory,
  getDuelDetails
} from '../services/cashDuelService';

const router = express.Router();

// In-memory storage for active duels (in production, use Redis or database)
const activeDuelsMap = new Map();
const battleResults = new Map();

/**
 * POST /api/cash-duel/create
 * Create a new cash duel
 */
router.post('/create', async (req, res) => {
  try {
    const { tier, transactionHash, address } = req.body;
    
    if (tier === undefined || !transactionHash || !address) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: tier, transactionHash, address'
      });
    }
    
    // Verify the blockchain transaction
    const verification = await verifyDuelCreation(transactionHash, tier, address);
    
    if (!verification.verified) {
      return res.status(400).json({
        success: false,
        error: 'Transaction verification failed'
      });
    }
    
    // Store duel info
    activeDuelsMap.set(verification.duelId, {
      duelId: verification.duelId,
      tier: verification.tier,
      player1: verification.player1,
      player2: null,
      status: 'WAITING',
      createdAt: Date.now()
    });
    
    res.json({
      success: true,
      duelId: verification.duelId,
      waitingForOpponent: true,
      tier: verification.tier
    });
    
  } catch (error) {
    console.error('Error creating duel:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create duel'
    });
  }
});

/**
 * POST /api/cash-duel/join
 * Join an existing cash duel
 */
router.post('/join', async (req, res) => {
  try {
    const { duelId, transactionHash, address } = req.body;
    
    if (!duelId || !transactionHash || !address) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: duelId, transactionHash, address'
      });
    }
    
    // Verify the blockchain transaction
    const verification = await verifyDuelJoin(transactionHash, duelId, address);
    
    if (!verification.verified) {
      return res.status(400).json({
        success: false,
        error: 'Transaction verification failed'
      });
    }
    
    // Update duel info
    const duelInfo = activeDuelsMap.get(duelId);
    if (duelInfo) {
      duelInfo.player2 = verification.player2;
      duelInfo.status = 'ACTIVE';
      activeDuelsMap.set(duelId, duelInfo);
    }
    
    res.json({
      success: true,
      battleReady: true,
      duelId,
      player1Address: verification.player1,
      player2Address: verification.player2
    });
    
  } catch (error) {
    console.error('Error joining duel:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to join duel'
    });
  }
});

/**
 * POST /api/cash-duel/complete
 * Complete a duel after battle ends (internal use)
 */
router.post('/complete', async (req, res) => {
  try {
    const { duelId, winnerAddress, battleData } = req.body;
    
    if (!duelId || !winnerAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: duelId, winnerAddress'
      });
    }
    
    // Verify duel exists and is active
    const duelInfo = activeDuelsMap.get(duelId);
    if (!duelInfo) {
      return res.status(404).json({
        success: false,
        error: 'Duel not found'
      });
    }
    
    if (duelInfo.status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        error: 'Duel is not active'
      });
    }
    
    // Anti-cheat validation (basic checks)
    if (battleData) {
      // TODO: Add more sophisticated validation
      // - Check battle duration
      // - Validate moves/actions
      // - Compare with expected ranges
      console.log('Battle data received:', battleData);
    }
    
    // Call smart contract to complete duel
    const result = await completeDuel(duelId, winnerAddress);
    
    // Update duel status
    duelInfo.status = 'COMPLETED';
    duelInfo.winner = winnerAddress;
    duelInfo.completedAt = Date.now();
    activeDuelsMap.set(duelId, duelInfo);
    
    // Store result for history
    battleResults.set(duelId, {
      ...result,
      battleData
    });
    
    res.json({
      success: true,
      txHash: result.txHash,
      winner: result.winner,
      loser: result.loser,
      winnerPayout: result.payout,
      blockNumber: result.blockNumber
    });
    
  } catch (error) {
    console.error('Error completing duel:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to complete duel'
    });
  }
});

/**
 * GET /api/cash-duel/active
 * Get list of active duels waiting for opponents
 */
router.get('/active', async (req, res) => {
  try {
    const activeDuels = await getActiveDuels();
    
    res.json({
      success: true,
      activeDuels
    });
    
  } catch (error) {
    console.error('Error getting active duels:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get active duels'
    });
  }
});

/**
 * GET /api/cash-duel/stats/:address
 * Get player statistics
 */
router.get('/stats/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid address format'
      });
    }
    
    const stats = await getPlayerStats(address);
    
    res.json({
      success: true,
      stats
    });
    
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get player stats'
    });
  }
});

/**
 * GET /api/cash-duel/history/:address
 * Get player's duel history
 */
router.get('/history/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid address format'
      });
    }
    
    const history = await getPlayerHistory(address, limit);
    
    res.json({
      success: true,
      history
    });
    
  } catch (error) {
    console.error('Error getting history:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get player history'
    });
  }
});

/**
 * GET /api/cash-duel/:duelId
 * Get duel details by ID
 */
router.get('/:duelId', async (req, res) => {
  try {
    const { duelId } = req.params;
    
    const details = await getDuelDetails(duelId);
    
    res.json({
      success: true,
      duel: details
    });
    
  } catch (error) {
    console.error('Error getting duel details:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get duel details'
    });
  }
});

/**
 * POST /api/cash-duel/poll/:duelId
 * Poll for duel status updates (used by frontend waiting screen)
 */
router.get('/poll/:duelId', async (req, res) => {
  try {
    const { duelId } = req.params;
    
    // First check in-memory map for faster response
    const cachedDuel = activeDuelsMap.get(duelId);
    if (cachedDuel) {
      console.log(`[CashDuel] Poll duelId ${duelId}, status: ${cachedDuel.status}`);
      return res.json({
        success: true,
        status: cachedDuel.status,
        player2: cachedDuel.player2,
        battleReady: cachedDuel.status === 'ACTIVE'
      });
    }
    
    // Fallback to blockchain if not in cache
    const details = await getDuelDetails(duelId);
    
    res.json({
      success: true,
      status: details.status,
      player2: details.player2,
      battleReady: details.status === 'ACTIVE'
    });
    
  } catch (error) {
    console.error('Error polling duel:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to poll duel status'
    });
  }
});

export default router;
