const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Export contract ABIs for frontend use
 * Run after compiling contracts
 */
async function main() {
  console.log("📦 Exporting Contract ABIs...\n");

  const contracts = [
    "ArenaToken",
    "DuelCraftCharacter",
    "SeasonPass",
    "Marketplace",
    "Tournament",
  ];

  // Create output directory
  const outputDir = path.join(__dirname, "../../frontend/src/contracts/abis");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const contractName of contracts) {
    const artifactPath = path.join(
      __dirname,
      "../artifacts/contracts",
      `${contractName}.sol`,
      `${contractName}.json`
    );

    if (fs.existsSync(artifactPath)) {
      const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
      const abi = artifact.abi;

      // Save ABI
      const abiPath = path.join(outputDir, `${contractName}.json`);
      fs.writeFileSync(abiPath, JSON.stringify(abi, null, 2));

      console.log(`✅ Exported ${contractName}.json`);
    } else {
      console.warn(`⚠️  ${contractName} artifact not found. Compile first.`);
    }
  }

  console.log("\n📄 ABIs exported to:", outputDir);
  console.log("💡 Import in frontend: import ABI from '@/contracts/abis/ContractName.json'");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
