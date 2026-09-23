const { ethers } = require("hardhat");

async function main() {
  console.log("=========================================");
  console.log("   MAINNET DEPLOYMENT PRE-FLIGHT CHECK   ");
  console.log("=========================================");

  const network = await ethers.provider.getNetwork();
  console.log(`Network Chain ID: ${network.chainId.toString()}`);
  if (network.chainId !== 677n) {
    console.error(`ERROR: Expected Chain ID 677, got ${network.chainId.toString()}`);
    process.exit(1);
  }

  const [deployer] = await ethers.getSigners();
  if (!deployer) {
    console.error("ERROR: No deployer found. Check DEPLOYER_PRIVATE_KEY");
    process.exit(1);
  }

  const deployerAddress = await deployer.getAddress();
  const balance = await ethers.provider.getBalance(deployerAddress);
  console.log(`Deployer Address:  ${deployerAddress}`);
  console.log(`Deployer Balance:  ${ethers.formatEther(balance)} BOT`);

  const feeData = await ethers.provider.getFeeData();
  const gasPrice = feeData.gasPrice || 1000000000n;
  console.log(`Gas Price:         ${ethers.formatUnits(gasPrice, "gwei")} gwei`);

  // Estimate gas
  const RegistryFactory = await ethers.getContractFactory("ArrenaRegistry");
  const regTx = await RegistryFactory.getDeployTransaction();
  const regGas = await ethers.provider.estimateGas(regTx);

  const ArenaFactory = await ethers.getContractFactory("ArrenaArena");
  // Using dummy address for estimate
  const arenaTx = await ArenaFactory.getDeployTransaction(deployerAddress);
  const arenaGas = await ethers.provider.estimateGas(arenaTx);

  const setArenaGas = 45000n; // typical setter

  const totalGas = regGas + arenaGas + setArenaGas;
  const estimatedCost = totalGas * gasPrice;

  console.log(`Estimated Registry Gas: ${regGas.toString()}`);
  console.log(`Estimated Arena Gas:    ${arenaGas.toString()}`);
  console.log(`Total Estimated Gas:    ${totalGas.toString()}`);
  console.log(`Total Estimated Cost:   ${ethers.formatEther(estimatedCost)} BOT`);

  if (balance < estimatedCost) {
    console.error(`\nWARNING: Deployer balance (${ethers.formatEther(balance)} BOT) is lower than estimated cost (${ethers.formatEther(estimatedCost)} BOT)!`);
    process.exit(1);
  } else {
    console.log(`\n✓ PRE-FLIGHT PASSED: Deployer has sufficient funds for mainnet deployment.`);
  }
}

main().catch((err) => {
  console.error("Preflight check failed:", err);
  process.exit(1);
});
