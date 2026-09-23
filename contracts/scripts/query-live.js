const { ethers } = require("hardhat");
const deployed = require("../deployed.json");

async function main() {
  console.log("=== QUERYING LIVE ONCHAIN STATE FROM BOT CHAIN MAINNET ===");
  const registry = await ethers.getContractAt("ArrenaRegistry", deployed.contracts.registry.address);
  const arena = await ethers.getContractAt("ArrenaArena", deployed.contracts.arena.address);

  const totalAgents = await registry.totalAgents();
  console.log(`Total Agents: ${totalAgents.toString()}`);

  const agents = await registry.getAgents(0, totalAgents);
  agents.forEach((a) => {
    console.log(`Agent #${a.id.toString()}: ${a.name} | Matches: ${a.matches} | Wins: ${a.wins} | Rewards: ${ethers.formatEther(a.totalRewards)} BOT`);
  });

  const totalMatches = await arena.totalMatches();
  console.log(`\nTotal Matches: ${totalMatches.toString()}`);

  const matches = await arena.getMatches(0, totalMatches);
  matches.forEach((m) => {
    console.log(`Match #${m.matchId.toString()}: Stake ${ethers.formatEther(m.stake)} BOT | Status: ${m.status} | Winner: Agent #${m.winnerAgentId.toString()} | Payout: ${ethers.formatEther(m.payout)} BOT`);
  });
  console.log("=== ALL READS VERIFIED DIRECTLY FROM ONCHAIN STATE ===");
}

main().catch(console.error);
