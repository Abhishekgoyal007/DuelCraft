const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Deploying CashDuel contract to Mantle Sepolia...");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "MNT");
  
  // Configuration
  const AUTHORIZED_CALLER = process.env.BACKEND_WALLET_ADDRESS || deployer.address;
  const OPERATIONS_WALLET = process.env.OPERATIONS_WALLET || deployer.address;
  const TREASURY_WALLET = process.env.TREASURY_WALLET || deployer.address;
  
  console.log("\n⚙️  Configuration:");
  console.log("   Authorized Caller:", AUTHORIZED_CALLER);
  console.log("   Operations Wallet:", OPERATIONS_WALLET);
  console.log("   Treasury Wallet:", TREASURY_WALLET);
  
  // Deploy contract
  console.log("\n📦 Deploying CashDuel contract...");
  const CashDuel = await hre.ethers.getContractFactory("CashDuel");
  const cashDuel = await CashDuel.deploy(
    AUTHORIZED_CALLER,
    OPERATIONS_WALLET,
    TREASURY_WALLET
  );
  
  await cashDuel.waitForDeployment();
  const cashDuelAddress = await cashDuel.getAddress();
  
  console.log("✅ CashDuel deployed to:", cashDuelAddress);
  
  // Save deployment info
  const deploymentInfo = {
    network: "mantleTestnet",
    chainId: 5003,
    contractAddress: cashDuelAddress,
    deployer: deployer.address,
    authorizedCaller: AUTHORIZED_CALLER,
    operationsWallet: OPERATIONS_WALLET,
    treasuryWallet: TREASURY_WALLET,
    deploymentTime: new Date().toISOString(),
    blockNumber: await hre.ethers.provider.getBlockNumber(),
  };
  
  // Save to deployments folder
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const timestamp = Date.now();
  const deploymentFile = path.join(deploymentsDir, `cashduel-mantleTestnet-${timestamp}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  
  // Also save as latest
  const latestFile = path.join(deploymentsDir, "cashduel-mantleTestnet-latest.json");
  fs.writeFileSync(latestFile, JSON.stringify(deploymentInfo, null, 2));
  
  console.log("💾 Deployment info saved to:", deploymentFile);
  
  // Update main deployments file with CashDuel address
  const mainDeploymentFile = path.join(deploymentsDir, "mantleTestnet-latest.json");
  if (fs.existsSync(mainDeploymentFile)) {
    const mainDeployment = JSON.parse(fs.readFileSync(mainDeploymentFile, "utf8"));
    mainDeployment.CashDuel = cashDuelAddress;
    mainDeployment.lastUpdated = new Date().toISOString();
    fs.writeFileSync(mainDeploymentFile, JSON.stringify(mainDeployment, null, 2));
    console.log("✅ Updated main deployment file");
  }
  
  console.log("\n📋 Contract Details:");
  console.log("   Bronze Fee:", hre.ethers.formatEther(await cashDuel.BRONZE_FEE()), "MNT");
  console.log("   Silver Fee:", hre.ethers.formatEther(await cashDuel.SILVER_FEE()), "MNT");
  console.log("   Gold Fee:", hre.ethers.formatEther(await cashDuel.GOLD_FEE()), "MNT");
  console.log("   Platform Fee:", await cashDuel.PLATFORM_FEE_PERCENT(), "%");
  console.log("   Cooldown Period:", await cashDuel.COOLDOWN_PERIOD(), "seconds");
  console.log("   Daily Limit:", await cashDuel.DAILY_DUEL_LIMIT(), "duels");
  
  console.log("\n⏳ Waiting for block confirmations...");
  await cashDuel.deploymentTransaction().wait(5);
  
  console.log("\n🎉 Deployment complete!");
  console.log("\n📝 Next steps:");
  console.log("   1. Run: npm run export-abis");
  console.log("   2. Verify contract on explorer (if needed)");
  console.log("   3. Update frontend/backend configs");
  console.log("   4. Fund the authorized caller wallet for gas");
  
  // Export ABI automatically
  console.log("\n📤 Exporting ABI...");
  await exportABI();
}

async function exportABI() {
  const artifactsDir = path.join(__dirname, "..", "artifacts", "contracts");
  const cashDuelArtifact = path.join(artifactsDir, "CashDuel.sol", "CashDuel.json");
  
  if (!fs.existsSync(cashDuelArtifact)) {
    console.log("❌ CashDuel artifact not found");
    return;
  }
  
  const artifact = JSON.parse(fs.readFileSync(cashDuelArtifact, "utf8"));
  const abi = artifact.abi;
  
  // Export to frontend
  const frontendAbiDir = path.join(__dirname, "..", "..", "frontend", "src", "contracts", "abis");
  if (!fs.existsSync(frontendAbiDir)) {
    fs.mkdirSync(frontendAbiDir, { recursive: true });
  }
  fs.writeFileSync(
    path.join(frontendAbiDir, "CashDuel.json"),
    JSON.stringify(abi, null, 2)
  );
  console.log("✅ Exported ABI to frontend");
  
  // Export to backend
  const backendAbiDir = path.join(__dirname, "..", "..", "backend", "src", "contracts", "abis");
  if (!fs.existsSync(backendAbiDir)) {
    fs.mkdirSync(backendAbiDir, { recursive: true });
  }
  fs.writeFileSync(
    path.join(backendAbiDir, "CashDuel.json"),
    JSON.stringify(abi, null, 2)
  );
  console.log("✅ Exported ABI to backend");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
