const { ethers } = require("hardhat");

async function main() {
  const serverAddress = "0x2B2FFC4898371798fDC3FfC003C412a1afE663da"; // Server wallet address
  const characterAddress = "0x5f8B9575ABADF3A356337c2118045412A966BED9"; // DuelCraftCharacter contract

  console.log("\n" + "=".repeat(70));
  console.log("🔐 AUTHORIZING SERVER WALLET IN DUELCRAFT CHARACTER CONTRACT");
  console.log("=".repeat(70) + "\n");

  // Get the signer (contract owner)
  const [owner] = await ethers.getSigners();
  console.log("👤 Using owner wallet:", owner.address);
  
  // Get owner balance
  const balance = await ethers.provider.getBalance(owner.address);
  console.log("💰 Owner MNT balance:", ethers.formatEther(balance), "MNT\n");

  console.log("📋 Server Address to Authorize:", serverAddress);
  console.log("📋 Contract Address:", characterAddress + "\n");

  // Attach to contract
  const Character = await ethers.getContractFactory("DuelCraftCharacter");
  const character = Character.attach(characterAddress);

  // Check current authorization
  const isAlreadyAuthorized = await character.authorizedServers(serverAddress);
  
  if (isAlreadyAuthorized) {
    console.log("✅ Server is ALREADY AUTHORIZED!");
    console.log("   No action needed.\n");
  } else {
    console.log("🔄 Authorizing server wallet...");
    
    const tx = await character.setServerAuthorization(serverAddress, true);
    console.log("📤 Transaction sent:", tx.hash);
    console.log("⏳ Waiting for confirmation...");
    
    await tx.wait();
    console.log("✅ Transaction confirmed!\n");
    
    // Verify authorization
    const isAuthorized = await character.authorizedServers(serverAddress);
    console.log("🔍 Verification: Server authorized =", isAuthorized + "\n");
  }

  console.log("=".repeat(70));
  console.log("✅ SERVER AUTHORIZATION COMPLETE!");
  console.log("=".repeat(70));
  console.log("\n📋 NEXT STEPS:");
  console.log("1. 💰 Fund server wallet with testnet MNT:");
  console.log("   - Visit: https://faucet.sepolia.mantle.xyz");
  console.log("   - Address: " + serverAddress);
  console.log("   - Request at least 5 MNT for gas fees");
  console.log("\n2. 🚀 Restart backend server (it will auto-detect authorization)");
  console.log("\n3. ✅ Blockchain routes will be enabled!");
  console.log("=".repeat(70) + "\n");
  
  console.log("🔗 View on explorer:");
  console.log("   https://explorer.sepolia.mantle.xyz/address/" + characterAddress + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error.message);
    console.error("\n💡 Common issues:");
    console.error("   - Make sure you're using the owner wallet (deployer wallet)");
    console.error("   - Check that you have enough MNT for gas");
    console.error("   - Verify the network in hardhat.config.js is correct\n");
    process.exit(1);
  });
