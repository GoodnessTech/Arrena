const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("=========================================");
  console.log("   ARRENA PROTOCOL MAINNET DEPLOYMENT    ");
  console.log("=========================================");

  // 1. Safety Check: Verify Chain ID is 677
  const network = await ethers.provider.getNetwork();
  console.log(`Network Name:     ${network.name}`);
  console.log(`Chain ID:         ${network.chainId.toString()}`);

  if (network.chainId !== 677n) {
    console.error(`FATAL: Incorrect network! Expected Chain ID 677 (BOT Chain Mainnet), got ${network.chainId.toString()}`);
    process.exit(1);
  }

  // 2. Verify Deployer Account & Balance
  const [deployer] = await ethers.getSigners();
  if (!deployer) {
    console.error("FATAL: No deployer account configured. Check DEPLOYER_PRIVATE_KEY in .env");
    process.exit(1);
  }

  const deployerAddress = await deployer.getAddress();
  const balance = await ethers.provider.getBalance(deployerAddress);
  console.log(`Deployer Address: ${deployerAddress}`);
  console.log(`Deployer Balance: ${ethers.formatEther(balance)} BOT`);

  if (balance === 0n) {
    console.error("FATAL: Deployer account has 0 BOT balance.");
    process.exit(1);
  }

  // 3. Inspect Gas Price
  const feeData = await ethers.provider.getFeeData();
  const gasPrice = feeData.gasPrice || 24000000000n;
  console.log(`Current Gas Price: ${ethers.formatUnits(gasPrice, "gwei")} gwei`);

  // 4. Deploy ArrenaRegistry
  console.log("\n[1/3] Deploying ArrenaRegistry...");
  const RegistryFactory = await ethers.getContractFactory("ArrenaRegistry");

  const registryDeployTx = await RegistryFactory.getDeployTransaction();
  const regEstimatedGas = await ethers.provider.estimateGas(registryDeployTx);
  const regGasLimit = (regEstimatedGas * 120n) / 100n; // 20% safe buffer
  console.log(`Registry Gas Estimate: ${regEstimatedGas.toString()} (limit: ${regGasLimit.toString()})`);

  const registry = await RegistryFactory.deploy({
    gasLimit: regGasLimit,
    gasPrice: gasPrice,
  });
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  const regDeploymentTx = registry.deploymentTransaction();
  const registryReceipt = await regDeploymentTx.wait(1);

  console.log(`✓ ArrenaRegistry deployed at: ${registryAddress}`);
  console.log(`  Tx Hash:  ${regDeploymentTx.hash}`);
  console.log(`  Block:    ${registryReceipt.blockNumber}`);
  console.log(`  Gas Used: ${registryReceipt.gasUsed.toString()}`);

  // 5. Deploy ArrenaArena
  console.log("\n[2/3] Deploying ArrenaArena...");
  const ArenaFactory = await ethers.getContractFactory("ArrenaArena");

  const arenaDeployTx = await ArenaFactory.getDeployTransaction(registryAddress);
  const arenaEstimatedGas = await ethers.provider.estimateGas(arenaDeployTx);
  const arenaGasLimit = (arenaEstimatedGas * 120n) / 100n;
  console.log(`Arena Gas Estimate: ${arenaEstimatedGas.toString()} (limit: ${arenaGasLimit.toString()})`);

  const arena = await ArenaFactory.deploy(registryAddress, {
    gasLimit: arenaGasLimit,
    gasPrice: gasPrice,
  });
  await arena.waitForDeployment();
  const arenaAddress = await arena.getAddress();
  const arenaDeploymentTx = arena.deploymentTransaction();
  const arenaReceipt = await arenaDeploymentTx.wait(1);

  console.log(`✓ ArrenaArena deployed at: ${arenaAddress}`);
  console.log(`  Tx Hash:  ${arenaDeploymentTx.hash}`);
  console.log(`  Block:    ${arenaReceipt.blockNumber}`);
  console.log(`  Gas Used: ${arenaReceipt.gasUsed.toString()}`);

  // 6. Link Arena in Registry
  console.log("\n[3/3] Linking Arena in Registry...");
  const setArenaGas = await registry.setArena.estimateGas(arenaAddress);
  const setArenaTx = await registry.setArena(arenaAddress, {
    gasLimit: (setArenaGas * 120n) / 100n,
    gasPrice: gasPrice,
  });
  const setArenaReceipt = await setArenaTx.wait(1);
  console.log(`✓ Registry linked to Arena in tx: ${setArenaTx.hash}`);
  console.log(`  Gas Used: ${setArenaReceipt.gasUsed.toString()}`);

  // 7. Verify Bytecode onchain
  const registryCode = await ethers.provider.getCode(registryAddress);
  const arenaCode = await ethers.provider.getCode(arenaAddress);

  if (registryCode === "0x" || arenaCode === "0x") {
    console.error("FATAL: Deployed contract bytecode could not be verified on chain!");
    process.exit(1);
  }
  console.log("\n✓ Verified onchain bytecode for both contracts.");

  // 8. Save deployment artifacts
  const deploymentInfo = {
    network: "BOT Chain Mainnet",
    chainId: 677,
    rpc: "https://rpc.botchain.ai",
    explorer: "https://scan.botchain.ai",
    deployer: deployerAddress,
    deployedAt: new Date().toISOString(),
    contracts: {
      registry: {
        address: registryAddress,
        deploymentTx: regDeploymentTx.hash,
        blockNumber: registryReceipt.blockNumber,
        explorerUrl: `https://scan.botchain.ai/address/${registryAddress}`,
        txUrl: `https://scan.botchain.ai/tx/${regDeploymentTx.hash}`,
      },
      arena: {
        address: arenaAddress,
        deploymentTx: arenaDeploymentTx.hash,
        blockNumber: arenaReceipt.blockNumber,
        explorerUrl: `https://scan.botchain.ai/address/${arenaAddress}`,
        txUrl: `https://scan.botchain.ai/tx/${arenaDeploymentTx.hash}`,
      },
      linkTx: setArenaTx.hash,
    },
  };

  const deployedJsonPath = path.join(__dirname, "../deployed.json");
  fs.writeFileSync(deployedJsonPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\nDeployment details saved to: ${deployedJsonPath}`);

  // Also write to frontend config
  const frontendConfigDir = path.join(__dirname, "../../frontend/src/config");
  if (!fs.existsSync(frontendConfigDir)) {
    fs.mkdirSync(frontendConfigDir, { recursive: true });
  }

  // Extract ABIs
  const registryArtifact = require("../artifacts/src/ArrenaRegistry.sol/ArrenaRegistry.json");
  const arenaArtifact = require("../artifacts/src/ArrenaArena.sol/ArrenaArena.json");

  const frontendContractsTs = `// AUTOGENERATED BOT CHAIN MAINNET CONFIGURATION
export const BOT_CHAIN = {
  id: 677,
  name: 'BOT Chain Mainnet',
  network: 'botchain',
  nativeCurrency: {
    decimals: 18,
    name: 'BOT',
    symbol: 'BOT',
  },
  rpcUrls: {
    default: { http: ['https://rpc.botchain.ai'] },
    public: { http: ['https://rpc.botchain.ai'] },
  },
  blockExplorers: {
    default: { name: 'BOTScan', url: 'https://scan.botchain.ai' },
  },
} as const;

export const CONTRACT_ADDRESSES = {
  registry: '${registryAddress}' as \`0x\${string}\`,
  arena: '${arenaAddress}' as \`0x\${string}\`,
} as const;

export const DEPLOYMENT_METADATA = {
  chainId: 677,
  network: 'BOT Chain Mainnet',
  deployer: '${deployerAddress}',
  deployedAt: '${deploymentInfo.deployedAt}',
  registry: {
    address: '${registryAddress}',
    txHash: '${regDeploymentTx.hash}',
    blockNumber: ${registryReceipt.blockNumber},
    explorerUrl: 'https://scan.botchain.ai/address/${registryAddress}',
    txUrl: 'https://scan.botchain.ai/tx/${regDeploymentTx.hash}',
  },
  arena: {
    address: '${arenaAddress}',
    txHash: '${arenaDeploymentTx.hash}',
    blockNumber: ${arenaReceipt.blockNumber},
    explorerUrl: 'https://scan.botchain.ai/address/${arenaAddress}',
    txUrl: 'https://scan.botchain.ai/tx/${arenaDeploymentTx.hash}',
  },
  linkTx: '${setArenaTx.hash}',
} as const;

export const REGISTRY_ABI = ${JSON.stringify(registryArtifact.abi, null, 2)} as const;

export const ARENA_ABI = ${JSON.stringify(arenaArtifact.abi, null, 2)} as const;
`;

  fs.writeFileSync(path.join(frontendConfigDir, "contracts.ts"), frontendContractsTs);
  console.log(`Frontend contract configuration written to: ${path.join(frontendConfigDir, "contracts.ts")}`);

  console.log("\n=========================================");
  console.log("   MAINNET DEPLOYMENT COMPLETE!          ");
  console.log(`   Registry: ${registryAddress}`);
  console.log(`   Arena:    ${arenaAddress}`);
  console.log("=========================================\n");
}

main().catch((error) => {
  console.error("Deployment failed with error:", error);
  process.exit(1);
});
