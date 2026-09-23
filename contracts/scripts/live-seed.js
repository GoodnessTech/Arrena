const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

function hashAction(matchId, agentId, p1, p2, p3, salt) {
  return ethers.solidityPackedKeccak256(
    ["uint256", "uint256", "uint8", "uint8", "uint8", "bytes32"],
    [matchId, agentId, p1, p2, p3, salt]
  );
}

async function main() {
  console.log("=========================================");
  console.log("   LIVE PRODUCT VALIDATION ON MAINNET    ");
  console.log("=========================================");

  const deployedPath = path.join(__dirname, "../deployed.json");
  if (!fs.existsSync(deployedPath)) {
    console.error("deployed.json not found!");
    process.exit(1);
  }
  const deployed = JSON.parse(fs.readFileSync(deployedPath, "utf8"));

  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(`Deployer: ${deployerAddress}`);
  console.log(`Balance:  ${ethers.formatEther(await ethers.provider.getBalance(deployerAddress))} BOT`);

  const registry = await ethers.getContractAt("ArrenaRegistry", deployed.contracts.registry.address);
  const arena = await ethers.getContractAt("ArrenaArena", deployed.contracts.arena.address);

  // Check if agents already registered
  const totalAgentsBefore = await registry.totalAgents();
  console.log(`Total Agents onchain before: ${totalAgentsBefore.toString()}`);

  let agentId1 = 1n;
  let agentId2 = 2n;

  if (totalAgentsBefore === 0n) {
    console.log("\n[1/5] Registering Genesis Agent 1 (ATLAS-PRIME)...");
    const txReg1 = await registry.registerAgent("ATLAS-PRIME", "ipfs://agent/atlas-prime");
    const rcReg1 = await txReg1.wait(1);
    console.log(`✓ Registered ATLAS-PRIME (Agent #1) in tx: ${txReg1.hash}`);

    console.log("\n[2/5] Registering Genesis Agent 2 (NOVA-NEXUS)...");
    const txReg2 = await registry.registerAgent("NOVA-NEXUS", "ipfs://agent/nova-nexus");
    const rcReg2 = await txReg2.wait(1);
    console.log(`✓ Registered NOVA-NEXUS (Agent #2) in tx: ${txReg2.hash}`);
  } else {
    console.log("Agents already registered onchain.");
  }

  const totalMatchesBefore = await arena.totalMatches();
  console.log(`\nTotal Matches onchain before: ${totalMatchesBefore.toString()}`);

  if (totalMatchesBefore === 0n) {
    const matchStake = ethers.parseEther("0.005"); // 0.005 BOT
    const matchId = 1n;

    // Agent 1 allocates: [55, 30, 15] (Liquidity focus)
    const salt1 = ethers.keccak256(ethers.toUtf8Bytes("live_atlas_salt_01"));
    const commit1 = hashAction(matchId, agentId1, 55, 30, 15, salt1);

    // Agent 2 allocates: [25, 45, 30] (Compute & Defense focus)
    const salt2 = ethers.keccak256(ethers.toUtf8Bytes("live_nova_salt_02"));
    const commit2 = hashAction(matchId, agentId2, 25, 45, 30, salt2);

    console.log("\n[3/5] Creating Strategy Duel #1 (0.005 BOT Stake)...");
    const createTx = await arena.createMatch(agentId1, commit1, { value: matchStake });
    const createRc = await createTx.wait(1);
    console.log(`✓ Match #1 created in tx: ${createTx.hash}`);

    console.log("\n[4/5] Opponent Joining Strategy Duel #1...");
    const joinTx = await arena.joinMatch(matchId, agentId2, commit2, { value: matchStake });
    const joinRc = await joinTx.wait(1);
    console.log(`✓ Match #1 joined in tx: ${joinTx.hash}`);

    console.log("\n[5/5] Revealing Actions & Settling Deterministically...");
    const rev1Tx = await arena.revealAction(matchId, agentId1, 55, 30, 15, salt1);
    await rev1Tx.wait(1);
    console.log(`✓ ATLAS-PRIME revealed action in tx: ${rev1Tx.hash}`);

    // Opponent reveal triggers atomic settlement
    const rev2Tx = await arena.revealAction(matchId, agentId2, 25, 45, 30, salt2);
    const rev2Rc = await rev2Tx.wait(1);
    console.log(`✓ NOVA-NEXUS revealed action & settled match in tx: ${rev2Tx.hash}`);

    const settledMatch = await arena.getMatch(matchId);
    console.log("\n=========================================");
    console.log("   MATCH #1 SETTLED ON MAINNET!          ");
    console.log(`   Winner Agent ID: ${settledMatch.winnerAgentId.toString()}`);
    console.log(`   Net Payout:      ${ethers.formatEther(settledMatch.payout)} BOT`);
    console.log(`   Status:          ${settledMatch.status.toString()} (SETTLED)`);
    console.log(`   Settlement Tx:   ${rev2Tx.hash}`);
    console.log("=========================================\n");

    // Record verified proof in deployed.json
    deployed.genesisProof = {
      matchId: 1,
      stake: "0.005 BOT",
      agent1: { id: 1, name: "ATLAS-PRIME", allocation: [55, 30, 15] },
      agent2: { id: 2, name: "NOVA-NEXUS", allocation: [25, 45, 30] },
      winnerId: Number(settledMatch.winnerAgentId),
      payout: `${ethers.formatEther(settledMatch.payout)} BOT`,
      settlementTx: rev2Tx.hash,
      settlementBlock: rev2Rc.blockNumber,
      botscanUrl: `https://scan.botchain.ai/tx/${rev2Tx.hash}`,
    };
    fs.writeFileSync(deployedPath, JSON.stringify(deployed, null, 2));
  }

  const finalBalance = await ethers.provider.getBalance(deployerAddress);
  console.log(`Final Deployer Balance: ${ethers.formatEther(finalBalance)} BOT`);
}

main().catch((err) => {
  console.error("Live validation failed:", err);
  process.exit(1);
});
