// Mint ARENA Tokens to Your Wallet
const { ethers } = require("hardhat");

async function main() {
  const tokenAddress = "0x57AC8904F597E727BD53e8E9f7A00280876F13A1"; // ArenaToken contract
  
  console.log("\n" + "=".repeat(70));
  console.log("💎 MINTING ARENA TOKENS");
  console.log("=".repeat(70) + "\n");

  // Get the signer (you - the owner)
  const [owner] = await ethers.getSigners();
  console.log("👤 Minting to wallet:", owner.address);
  
  // Attach to ArenaToken contract
  const ArenaToken = await ethers.getContractFactory("ArenaToken");
  const token = ArenaToken.attach(tokenAddress);

  // Amount to mint (1000 ARENA tokens)
  const amount = ethers.parseEther("1000");
  
  console.log("💰 Amount to mint: 1000 ARENA tokens");
  console.log("🔄 Minting...\n");

  const tx = await token.mint(owner.address, amount, "Initial testing tokens");
  console.log("📤 Transaction sent:", tx.hash);
  console.log("⏳ Waiting for confirmation...");
  
  await tx.wait();
  console.log("✅ Tokens minted successfully!\n");

  // Check balance
  const balance = await token.balanceOf(owner.address);
  console.log("💎 Your new balance:", ethers.formatEther(balance), "ARENA\n");

  console.log("=".repeat(70));
  console.log("✅ DONE! You now have ARENA tokens!");
  console.log("=".repeat(70));
  console.log("\n🎮 What you can do now:");
  console.log("   1. Buy Season Pass (10-250 ARENA)");
  console.log("   2. Register for Tournament (entry fee in ARENA)");
  console.log("   3. Buy NFTs from Marketplace");
  console.log("   4. Trade with other players\n");
  
  console.log("🔗 View transaction:");
  console.log("   https://explorer.sepolia.mantle.xyz/tx/" + tx.hash + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  });
