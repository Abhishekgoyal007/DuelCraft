// Generate Server Wallet for DuelCraft Backend
const { ethers } = require("ethers");

console.log("\n" + "=".repeat(70));
console.log("🔐 GENERATING SERVER WALLET FOR DUELCRAFT");
console.log("=".repeat(70) + "\n");

// Generate a new random wallet
const wallet = ethers.Wallet.createRandom();

console.log("✅ Server Wallet Generated Successfully!\n");
console.log("📍 Wallet Address:");
console.log("   " + wallet.address + "\n");
console.log("🔑 Private Key:");
console.log("   " + wallet.privateKey + "\n");

console.log("=".repeat(70));
console.log("⚠️  IMPORTANT SECURITY INSTRUCTIONS:");
console.log("=".repeat(70));
console.log("1. Copy the private key above");
console.log("2. Add it to backend/.env file:");
console.log("   BLOCKCHAIN_PRIVATE_KEY=" + wallet.privateKey);
console.log("\n3. NEVER commit .env file to git");
console.log("4. NEVER share the private key with anyone");
console.log("5. This wallet is for SERVER operations only\n");

console.log("=".repeat(70));
console.log("📋 NEXT STEPS:");
console.log("=".repeat(70));
console.log("1. ✅ Add private key to backend/.env");
console.log("2. 💰 Fund wallet with testnet MNT:");
console.log("   - Visit: https://faucet.sepolia.mantle.xyz");
console.log("   - Enter address: " + wallet.address);
console.log("   - Request MNT (get at least 5 MNT)");
console.log("\n3. 🔐 Authorize wallet in smart contract:");
console.log("   - Run the authorization script (coming next)");
console.log("\n4. 🚀 Restart backend server");
console.log("=".repeat(70) + "\n");

console.log("💾 SAVE THIS INFORMATION NOW!");
console.log("   The private key will not be shown again.\n");
