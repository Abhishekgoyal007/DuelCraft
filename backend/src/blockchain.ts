import { Router, Request, Response } from "express";
import { blockchainService } from "../services/blockchain";

const router = Router();

/**
 * GET /api/blockchain/info
 * Get blockchain service information
 */
router.get("/info", async (req: Request, res: Response) => {
  try {
    const walletAddress = blockchainService.getWalletAddress();
    const walletBalance = await blockchainService.getWalletBalance();
    const networkInfo = blockchainService.getNetworkInfo();

    res.json({
      success: true,
      data: {
        serverWallet: walletAddress,
        balance: walletBalance,
        network: networkInfo,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get blockchain info",
    });
  }
});

/**
 * POST /api/blockchain/record-match
 * Record match result on blockchain
 * Body: { tokenId: number, didWin: boolean }
 */
router.post("/record-match", async (req: Request, res: Response) => {
  try {
    const { tokenId, didWin } = req.body;

    if (tokenId === undefined || didWin === undefined) {
      return res.status(400).json({
        success: false,
        error: "tokenId and didWin are required",
      });
    }

    const receipt = await blockchainService.recordMatchResult(tokenId, didWin);

    res.json({
      success: true,
      data: {
        transactionHash: receipt?.hash,
        blockNumber: receipt?.blockNumber,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Failed to record match result",
    });
  }
});

/**
 * POST /api/blockchain/distribute-rewards
 * Distribute weekly ARENA token rewards
 * Body: { rewards: Array<{ address: string, amount: string }> }
 */
router.post("/distribute-rewards", async (req: Request, res: Response) => {
  try {
    const { rewards } = req.body;

    if (!Array.isArray(rewards) || rewards.length === 0) {
      return res.status(400).json({
        success: false,
        error: "rewards array is required",
      });
    }

    const receipt = await blockchainService.distributeWeeklyRewards(rewards);

    res.json({
      success: true,
      data: {
        transactionHash: receipt?.hash,
        rewardsDistributed: rewards.length,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Failed to distribute rewards",
    });
  }
});

/**
 * GET /api/blockchain/character/:tokenId
 * Get character NFT data
 */
router.get("/character/:tokenId", async (req: Request, res: Response) => {
  try {
    const tokenId = parseInt(req.params.tokenId);

    if (isNaN(tokenId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid tokenId",
      });
    }

    const characterData = await blockchainService.getCharacterData(tokenId);

    res.json({
      success: true,
      data: characterData,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get character data",
    });
  }
});

/**
 * GET /api/blockchain/character-available/:characterType
 * Check if character type is available for minting
 */
router.get(
  "/character-available/:characterType",
  async (req: Request, res: Response) => {
    try {
      const { characterType } = req.params;

      const available = await blockchainService.isCharacterAvailable(
        characterType
      );

      res.json({
        success: true,
        data: { available },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || "Failed to check character availability",
      });
    }
  }
);

/**
 * GET /api/blockchain/balance/:address
 * Get ARENA token balance for address
 */
router.get("/balance/:address", async (req: Request, res: Response) => {
  try {
    const { address } = req.params;

    if (!address || !address.startsWith("0x")) {
      return res.status(400).json({
        success: false,
        error: "Invalid address",
      });
    }

    const balance = await blockchainService.getTokenBalance(address);

    res.json({
      success: true,
      data: { balance },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get token balance",
    });
  }
});

/**
 * GET /api/blockchain/season-pass/:address
 * Check if user has active season pass and get tier
 */
router.get("/season-pass/:address", async (req: Request, res: Response) => {
  try {
    const { address } = req.params;

    if (!address || !address.startsWith("0x")) {
      return res.status(400).json({
        success: false,
        error: "Invalid address",
      });
    }

    const hasPass = await blockchainService.hasActiveSeasonPass(address);
    const tier = hasPass ? await blockchainService.getSeasonPassTier(address) : 0;

    res.json({
      success: true,
      data: { hasPass, tier },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get season pass info",
    });
  }
});

export default router;
