const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔐 Authorizing Game Server...\n");

  // Load deployment info
  const deploymentPath = path.join(__dirname, "../deployments/mantleTestnet-latest.json");
  
  if (!fs.existsSync(deploymentPath)) {
    console.error("❌ No deployment found. Please deploy contracts first.");
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));
  const characterAddress = deployment.contracts.DuelCraftCharacter;

  // Get server address from env
  const serverAddress = process.env.GAME_SERVER_ADDRESS;
  
  if (!serverAddress || serverAddress === "0x0000000000000000000000000000000000000000") {
    console.error("❌ GAME_SERVER_ADDRESS not set in .env");
    console.error("   Add your backend wallet address to .env file");
    process.exit(1);
  }

  console.log("📍 Character NFT:", characterAddress);
  console.log("🔑 Server Address:", serverAddress);
  console.log("");

  // Attach to contract
  const Character = await hre.ethers.getContractFactory("DuelCraftCharacter");
  const character = Character.attach(characterAddress);

  // Check current authorization
  const isAuthorized = await character.authorizedServers(serverAddress);
  
  if (isAuthorized) {
    console.log("✅ Server is already authorized!");
  } else {
    console.log("🔄 Authorizing server...");
    const tx = await character.setServerAuthorization(serverAddress, true);
    await tx.wait();
    console.log("✅ Server authorized successfully!");
    console.log("📝 Transaction:", tx.hash);
  }

  console.log("\n✨ Backend server can now update character stats!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
