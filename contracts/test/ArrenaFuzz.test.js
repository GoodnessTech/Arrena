const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Arrena Invariant & Fuzzing Suite", function () {
  let registry, arena;
  let owner, feeRecipient, agentOwner1, agentOwner2;
  let agentId1, agentId2;

  const MATCH_STAKE = ethers.parseEther("0.02");

  function hashAction(matchId, agentId, p1, p2, p3, salt) {
    return ethers.solidityPackedKeccak256(
      ["uint256", "uint256", "uint8", "uint8", "uint8", "bytes32"],
      [matchId, agentId, p1, p2, p3, salt]
    );
  }

  // Generates valid random partition summing to 100
  function randomPartition() {
    const a = Math.floor(Math.random() * 99) + 1;
    const b = Math.floor(Math.random() * (100 - a));
    const c = 100 - a - b;
    return [a, b, c];
  }

  before(async function () {
    [owner, feeRecipient, agentOwner1, agentOwner2] = await ethers.getSigners();

    const ArrenaRegistry = await ethers.getContractFactory("ArrenaRegistry");
    registry = await ArrenaRegistry.deploy();
    await registry.waitForDeployment();

    const ArrenaArena = await ethers.getContractFactory("ArrenaArena");
    arena = await ArrenaArena.deploy(await registry.getAddress());
    await arena.waitForDeployment();

    await registry.setArena(await arena.getAddress());
    await arena.setFeeRecipient(feeRecipient.address);

    await (await registry.connect(agentOwner1).registerAgent("FUZZ_A", "")).wait();
    await (await registry.connect(agentOwner2).registerAgent("FUZZ_B", "")).wait();
    agentId1 = 1n;
    agentId2 = 2n;
  });

  it("fuzz: should satisfy economic conservation across 25 random strategy duels", async function () {
    for (let i = 0; i < 25; i++) {
      const matchId = BigInt(i + 1);
      const allocA = randomPartition();
      const allocB = randomPartition();

      const saltA = ethers.keccak256(ethers.toUtf8Bytes(`saltA_${i}`));
      const saltB = ethers.keccak256(ethers.toUtf8Bytes(`saltB_${i}`));

      const commitA = hashAction(matchId, agentId1, allocA[0], allocA[1], allocA[2], saltA);
      const commitB = hashAction(matchId, agentId2, allocB[0], allocB[1], allocB[2], saltB);

      await (await arena.connect(agentOwner1).createMatch(agentId1, commitA, { value: MATCH_STAKE })).wait();
      await (await arena.connect(agentOwner2).joinMatch(matchId, agentId2, commitB, { value: MATCH_STAKE })).wait();

      await (await arena.connect(agentOwner1).revealAction(matchId, agentId1, allocA[0], allocA[1], allocA[2], saltA)).wait();
      await (await arena.connect(agentOwner2).revealAction(matchId, agentId2, allocB[0], allocB[1], allocB[2], saltB)).wait();

      const match = await arena.getMatch(matchId);
      expect(match.status).to.equal(3); // SETTLED

      // Manual check
      let winsA = 0;
      let winsB = 0;
      for (let f = 0; f < 3; f++) {
        if (allocA[f] > allocB[f]) winsA++;
        else if (allocB[f] > allocA[f]) winsB++;
      }

      if (winsA > winsB) {
        expect(match.winnerAgentId).to.equal(agentId1);
        expect(match.payout).to.equal(ethers.parseEther("0.0392")); // 0.04 - 2% fee
      } else if (winsB > winsA) {
        expect(match.winnerAgentId).to.equal(agentId2);
        expect(match.payout).to.equal(ethers.parseEther("0.0392"));
      } else {
        expect(match.winnerAgentId).to.equal(0n);
        expect(match.payout).to.equal(0n); // Full refund
      }
    }
  });
});
