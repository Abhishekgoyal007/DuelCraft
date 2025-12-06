const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("🚀 Deploying DuelCraft Contracts to", hre.network.name);
  console.log("📍 Deploying with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "MNT");

  // =====================
  // 1. Deploy ArenaToken (ERC-20)
  // =====================
  console.log("\n📜 Deploying ArenaToken...");
  const ArenaToken = await hre.ethers.getContractFactory("ArenaToken");
  const arenaToken = await ArenaToken.deploy();
  await arenaToken.waitForDeployment();
  const arenaTokenAddress = await arenaToken.getAddress();
  console.log("✅ ArenaToken deployed to:", arenaTokenAddress);

  // =====================
  // 2. Deploy DuelCraftCharacter NFT
  // =====================
  console.log("\n📜 Deploying DuelCraftCharacter...");
  const DuelCraftCharacter = await hre.ethers.getContractFactory("DuelCraftCharacter");
  const character = await DuelCraftCharacter.deploy();
  await character.waitForDeployment();
  const characterAddress = await character.getAddress();
  console.log("✅ DuelCraftCharacter deployed to:", characterAddress);

  // =====================
  // 3. Deploy SeasonPass NFT
  // =====================
  console.log("\n📜 Deploying SeasonPass...");
  const SeasonPass = await hre.ethers.getContractFactory("SeasonPass");
  const seasonPass = await SeasonPass.deploy(arenaTokenAddress);
  await seasonPass.waitForDeployment();
  const seasonPassAddress = await seasonPass.getAddress();
  console.log("✅ SeasonPass deployed to:", seasonPassAddress);

  // =====================
  // 4. Deploy Marketplace
  // =====================
  console.log("\n📜 Deploying Marketplace...");
  const Marketplace = await hre.ethers.getContractFactory("Marketplace");
  const marketplace = await Marketplace.deploy(arenaTokenAddress, 250); // 2.5% fee
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log("✅ Marketplace deployed to:", marketplaceAddress);

  // =====================
  // 5. Deploy Tournament
  // =====================
  console.log("\n📜 Deploying Tournament...");
  const Tournament = await hre.ethers.getContractFactory("Tournament");
  const tournament = await Tournament.deploy(characterAddress, arenaTokenAddress);
  await tournament.waitForDeployment();
  const tournamentAddress = await tournament.getAddress();
  console.log("✅ Tournament deployed to:", tournamentAddress);

  // =====================
  // 6. Initial Setup
  // =====================
  console.log("\n⚙️ Setting up initial configuration...");
  
  // Authorize game server (if provided in env)
  const gameServerAddress = process.env.GAME_SERVER_ADDRESS;
  if (gameServerAddress && gameServerAddress !== "0x0000000000000000000000000000000000000000") {
    console.log("Authorizing game server:", gameServerAddress);
    await character.setServerAuthorization(gameServerAddress, true);
    console.log("✅ Game server authorized");
  }

  // =====================
  // 7. Save Deployment Info
  // =====================
  const deploymentInfo = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      ArenaToken: arenaTokenAddress,
      DuelCraftCharacter: characterAddress,
      SeasonPass: seasonPassAddress,
      Marketplace: marketplaceAddress,
      Tournament: tournamentAddress,
    },
  };

  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const filename = `${hre.network.name}-${Date.now()}.json`;
  fs.writeFileSync(
    path.join(deploymentsDir, filename),
    JSON.stringify(deploymentInfo, null, 2)
  );

  // Also save as "latest"
  fs.writeFileSync(
    path.join(deploymentsDir, `${hre.network.name}-latest.json`),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\n📄 Deployment info saved to:", filename);

  // =====================
  // 8. Wait for confirmations
  // =====================
  console.log("\n⏳ Waiting for block confirmations...");
  await character.deploymentTransaction().wait(5);

  // =====================
  // 9. Summary
  // =====================
  console.log("\n🎉 Deployment Complete!");
  console.log("====================================");
  console.log("ArenaToken:", arenaTokenAddress);
  console.log("DuelCraftCharacter:", characterAddress);
  console.log("SeasonPass:", seasonPassAddress);
  console.log("Marketplace:", marketplaceAddress);
  console.log("Tournament:", tournamentAddress);
  console.log("====================================");
  console.log("\n💡 Next Steps:");
  console.log("1. Verify contracts: npm run verify:testnet");
  console.log("2. Update frontend/backend config with addresses");
  console.log("3. Fund ArenaToken contract for rewards");
  console.log("4. Authorize backend server address");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
