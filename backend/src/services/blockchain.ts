import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import { CONTRACT_ADDRESSES, NETWORK_CONFIG } from "../contracts/addresses";

/**
 * Blockchain Service for DuelCraft Backend
 * Handles all Web3 interactions including:
 * - Match result recording
 * - Weekly reward distribution
 * - Season pass management
 * - Tournament operations
 */
class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private contracts: {
    token?: ethers.Contract;
    character?: ethers.Contract;
    seasonPass?: ethers.Contract;
    marketplace?: ethers.Contract;
    tournament?: ethers.Contract;
  } = {};

  constructor() {
    // Initialize provider
    this.provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);

    // Initialize wallet from environment variable
    const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error(
        "BLOCKCHAIN_PRIVATE_KEY not found in environment variables"
      );
    }

    this.wallet = new ethers.Wallet(privateKey, this.provider);
    console.log(`✅ Blockchain wallet initialized: ${this.wallet.address}`);

    // Initialize contracts
    this.initializeContracts();
  }

  /**
   * Load contract ABIs and initialize contract instances
   */
  private initializeContracts() {
    try {
      const abiPath = path.join(__dirname, "../contracts/abis");

      // Load ArenaToken
      const tokenABI = JSON.parse(
        fs.readFileSync(path.join(abiPath, "ArenaToken.json"), "utf8")
      );
      this.contracts.token = new ethers.Contract(
        CONTRACT_ADDRESSES.ARENA_TOKEN,
        tokenABI.abi,
        this.wallet
      );

      // Load DuelCraftCharacter
      const characterABI = JSON.parse(
        fs.readFileSync(
          path.join(abiPath, "DuelCraftCharacter.json"),
          "utf8"
        )
      );
      this.contracts.character = new ethers.Contract(
        CONTRACT_ADDRESSES.DUELCRAFT_CHARACTER,
        characterABI.abi,
        this.wallet
      );

      // Load SeasonPass
      const seasonPassABI = JSON.parse(
        fs.readFileSync(path.join(abiPath, "SeasonPass.json"), "utf8")
      );
      this.contracts.seasonPass = new ethers.Contract(
        CONTRACT_ADDRESSES.SEASON_PASS,
        seasonPassABI.abi,
        this.wallet
      );

      // Load Marketplace
      const marketplaceABI = JSON.parse(
        fs.readFileSync(path.join(abiPath, "Marketplace.json"), "utf8")
      );
      this.contracts.marketplace = new ethers.Contract(
        CONTRACT_ADDRESSES.MARKETPLACE,
        marketplaceABI.abi,
        this.wallet
      );

      // Load Tournament
      const tournamentABI = JSON.parse(
        fs.readFileSync(path.join(abiPath, "Tournament.json"), "utf8")
      );
      this.contracts.tournament = new ethers.Contract(
        CONTRACT_ADDRESSES.TOURNAMENT,
        tournamentABI.abi,
        this.wallet
      );

      console.log("✅ All smart contracts initialized");
    } catch (error) {
      console.error("❌ Error initializing contracts:", error);
      throw error;
    }
  }

  /**
   * Record match result on blockchain
   * Updates character NFT stats after a match
   */
  async recordMatchResult(
    tokenId: number,
    didWin: boolean
  ): Promise<ethers.ContractTransactionReceipt | null> {
    try {
      console.log(
        `Recording match result for token ${tokenId}: ${didWin ? "WIN" : "LOSS"}`
      );

      const tx = await this.contracts.character!.updateMatchStats(
        tokenId,
        didWin
      );
      const receipt = await tx.wait();

      console.log(
        `✅ Match result recorded. Tx: ${receipt?.hash || "N/A"}`
      );
      return receipt;
    } catch (error) {
      console.error("❌ Error recording match result:", error);
      throw error;
    }
  }

  /**
   * Batch record multiple match results
   * More gas-efficient for recording multiple matches at once
   */
  async batchRecordMatchResults(
    results: Array<{ tokenId: number; didWin: boolean }>
  ): Promise<ethers.ContractTransactionReceipt | null> {
    try {
      console.log(`Recording ${results.length} match results in batch`);

      // For now, record individually
      // TODO: Implement batch function in smart contract for gas optimization
      const receipts = [];
      for (const result of results) {
        const receipt = await this.recordMatchResult(
          result.tokenId,
          result.didWin
        );
        receipts.push(receipt);
      }

      console.log(`✅ Batch recorded ${receipts.length} match results`);
      return receipts[receipts.length - 1];
    } catch (error) {
      console.error("❌ Error batch recording matches:", error);
      throw error;
    }
  }

  /**
   * Distribute weekly ARENA token rewards
   * Mints tokens to winners based on their performance
   */
  async distributeWeeklyRewards(
    rewards: Array<{ address: string; amount: string }>
  ): Promise<ethers.ContractTransactionReceipt | null> {
    try {
      console.log(`Distributing rewards to ${rewards.length} players`);

      // Mint tokens to each winner
      const receipts = [];
      for (const reward of rewards) {
        const amountInWei = ethers.parseEther(reward.amount);
        const tx = await this.contracts.token!.mint(
          reward.address,
          amountInWei
        );
        const receipt = await tx.wait();
        receipts.push(receipt);
        console.log(
          `  ✅ Sent ${reward.amount} ARENA to ${reward.address}`
        );
      }

      console.log(`✅ Weekly rewards distributed successfully`);
      return receipts[receipts.length - 1];
    } catch (error) {
      console.error("❌ Error distributing rewards:", error);
      throw error;
    }
  }

  /**
   * Check if user has active season pass
   */
  async hasActiveSeasonPass(address: string): Promise<boolean> {
    try {
      const hasPass = await this.contracts.seasonPass!.hasActivePass(address);
      return hasPass;
    } catch (error) {
      console.error("❌ Error checking season pass:", error);
      return false;
    }
  }

  /**
   * Get season pass tier for user
   */
  async getSeasonPassTier(address: string): Promise<number> {
    try {
      const tier = await this.contracts.seasonPass!.getPassTier(address);
      return Number(tier);
    } catch (error) {
      console.error("❌ Error getting season pass tier:", error);
      return 0;
    }
  }

  /**
   * Get character NFT data
   */
  async getCharacterData(tokenId: number): Promise<any> {
    try {
      const data = await this.contracts.character!.getCharacterData(tokenId);
      return {
        characterType: data.characterType,
        level: Number(data.level),
        experience: Number(data.experience),
        totalMatches: Number(data.totalMatches),
        wins: Number(data.wins),
        losses: Number(data.losses),
      };
    } catch (error) {
      console.error("❌ Error getting character data:", error);
      throw error;
    }
  }

  /**
   * Check if character type is available for minting
   */
  async isCharacterAvailable(characterType: string): Promise<boolean> {
    try {
      const available = await this.contracts.character!.isCharacterAvailable(
        characterType
      );
      return available;
    } catch (error) {
      console.error("❌ Error checking character availability:", error);
      return false;
    }
  }

  /**
   * Get user's ARENA token balance
   */
  async getTokenBalance(address: string): Promise<string> {
    try {
      const balance = await this.contracts.token!.balanceOf(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error("❌ Error getting token balance:", error);
      return "0";
    }
  }

  /**
   * Get wallet address
   */
  getWalletAddress(): string {
    return this.wallet.address;
  }

  /**
   * Get network info
   */
  getNetworkInfo() {
    return NETWORK_CONFIG;
  }

  /**
   * Check wallet MNT balance
   */
  async getWalletBalance(): Promise<string> {
    try {
      const balance = await this.provider.getBalance(this.wallet.address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error("❌ Error getting wallet balance:", error);
      return "0";
    }
  }
}

// Export singleton instance
export const blockchainService = new BlockchainService();
