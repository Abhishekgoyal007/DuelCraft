require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
require("dotenv").config();

const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000000";
const MANTLE_TESTNET_RPC = process.env.MANTLE_TESTNET_RPC || "https://rpc.sepolia.mantle.xyz/";
const MANTLE_MAINNET_RPC = process.env.MANTLE_MAINNET_RPC || "https://rpc.mantle.xyz/";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true, // Enable IR-based code generation for better optimization
    },
  },
  networks: {
    // Mantle Testnet (Sepolia)
    mantleTestnet: {
      url: MANTLE_TESTNET_RPC,
      chainId: 5003,
      accounts: [PRIVATE_KEY],
      gasPrice: 50000000, // 0.05 gwei - super cheap!
    },
    // Mantle Mainnet
    mantleMainnet: {
      url: MANTLE_MAINNET_RPC,
      chainId: 5000,
      accounts: [PRIVATE_KEY],
      gasPrice: 50000000, // 0.05 gwei
    },
    // Local development
    hardhat: {
      chainId: 31337,
    },
  },
  etherscan: {
    apiKey: {
      mantleTestnet: ETHERSCAN_API_KEY,
      mantleMainnet: ETHERSCAN_API_KEY,
    },
    customChains: [
      {
        network: "mantleTestnet",
        chainId: 5003,
        urls: {
          apiURL: "https://explorer.testnet.mantle.xyz/api",
          browserURL: "https://explorer.testnet.mantle.xyz",
        },
      },
      {
        network: "mantleMainnet",
        chainId: 5000,
        urls: {
          apiURL: "https://explorer.mantle.xyz/api",
          browserURL: "https://explorer.mantle.xyz",
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
