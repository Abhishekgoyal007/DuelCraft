// Authorize yourself as minter and mint ARENA tokens
const { ethers } = require("hardhat");

async function main() {
  const tokenAddress = "0x57AC8904F597E727BD53e8E9f7A00280876F13A1"; // ArenaToken contract
  
  console.log("\n" + "=".repeat(70));
  console.log("💎 SETUP: AUTHORIZE & MINT ARENA TOKENS");
  console.log("=".repeat(70) + "\n");

  const [owner] = await ethers.getSigners();
  console.log("👤 Your wallet:", owner.address);
  
  const ArenaToken = await ethers.getContractFactory("ArenaToken");
  const token = ArenaToken.attach(tokenAddress);

  // Step 1: Authorize yourself as minter
  console.log("\n🔐 Step 1: Authorizing you as minter...");
  const authTx = await token.setMinterAuthorization(owner.address, true);
  await authTx.wait();
  console.log("✅ You are now authorized to mint!\n");

  // Step 2: Mint tokens
  const amount = ethers.parseEther("1000");
  console.log("💰 Step 2: Minting 1000 ARENA tokens...");
  const mintTx = await token.mint(owner.address, amount, "Initial testing tokens");
  await mintTx.wait();
  console.log("✅ Tokens minted!\n");

  // Check balance
  const balance = await token.balanceOf(owner.address);
  console.log("=".repeat(70));
  console.log("💎 YOUR BALANCE:", ethers.formatEther(balance), "ARENA");
  console.log("=".repeat(70));
  
  console.log("\n🎮 Now you can:");
  console.log("   ✅ Buy Season Pass (10-250 ARENA)");
  console.log("   ✅ Register for Tournament");
  console.log("   ✅ Buy from Marketplace");
  console.log("   ✅ List NFTs for sale\n");
  
  console.log("🔗 View your tokens in wallet:");
  console.log("   Open MetaMask → Import Token");
  console.log("   Address:", tokenAddress);
  console.log("   Symbol: ARENA");
  console.log("   Decimals: 18\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  });
