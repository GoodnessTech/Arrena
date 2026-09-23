const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Arrena Protocol Suite", function () {
  let registry, arena;
  let owner, feeRecipient, agentOwner1, agentOwner2, unauthorized;
  let agentId1, agentId2;

  const MIN_STAKE = ethers.parseEther("0.001");
  const MATCH_STAKE = ethers.parseEther("0.01");

  function hashAction(matchId, agentId, p1, p2, p3, salt) {
    return ethers.solidityPackedKeccak256(
      ["uint256", "uint256", "uint8", "uint8", "uint8", "bytes32"],
      [matchId, agentId, p1, p2, p3, salt]
    );
  }

  beforeEach(async function () {
    [owner, feeRecipient, agentOwner1, agentOwner2, unauthorized] = await ethers.getSigners();

    // Deploy Registry
    const ArrenaRegistry = await ethers.getContractFactory("ArrenaRegistry");
    registry = await ArrenaRegistry.deploy();
    await registry.waitForDeployment();

    // Deploy Arena
    const ArrenaArena = await ethers.getContractFactory("ArrenaArena");
    arena = await ArrenaArena.deploy(await registry.getAddress());
    await arena.waitForDeployment();

    // Link Arena to Registry
    await registry.setArena(await arena.getAddress());
    await arena.setFeeRecipient(feeRecipient.address);

    // Register Agents
    const tx1 = await registry.connect(agentOwner1).registerAgent("ATLAS-01", "ipfs://agent-atlas");
    const rc1 = await tx1.wait();
    agentId1 = 1n;

    const tx2 = await registry.connect(agentOwner2).registerAgent("NOVA-02", "ipfs://agent-nova");
    const rc2 = await tx2.wait();
    agentId2 = 2n;
  });

  describe("ArrenaRegistry", function () {
    it("should register agents correctly and track ownership", async function () {
      expect(await registry.totalAgents()).to.equal(2n);

      const agent1 = await registry.getAgent(agentId1);
      expect(agent1.name).to.equal("ATLAS-01");
      expect(agent1.owner).to.equal(agentOwner1.address);
      expect(agent1.active).to.be.true;
      expect(agent1.matches).to.equal(0);
      expect(agent1.wins).to.equal(0);

      const owner1Agents = await registry.getAgentIdsByOwner(agentOwner1.address);
      expect(owner1Agents.length).to.equal(1);
      expect(owner1Agents[0]).to.equal(agentId1);
    });

    it("should reject empty names or overly long names", async function () {
      await expect(
        registry.connect(agentOwner1).registerAgent("", "uri")
      ).to.be.revertedWithCustomError(registry, "InvalidName");

      const longName = "A".repeat(33);
      await expect(
        registry.connect(agentOwner1).registerAgent(longName, "uri")
      ).to.be.revertedWithCustomError(registry, "InvalidName");
    });

    it("should paginate agents correctly", async function () {
      const batch = await registry.getAgents(0, 10);
      expect(batch.length).to.equal(2);
      expect(batch[0].id).to.equal(1n);
      expect(batch[1].id).to.equal(2n);
    });

    it("should only allow authorized arena to record match outcome", async function () {
      await expect(
        registry.connect(unauthorized).recordMatchOutcome(agentId1, agentId2, 1000n)
      ).to.be.revertedWithCustomError(registry, "Unauthorized");
    });
  });

  describe("ArrenaArena - Match Lifecycle & Game Theory", function () {
    const salt1 = ethers.encodeBytes32String("salt_creator_123");
    const salt2 = ethers.encodeBytes32String("salt_opponent_456");

    it("should reject creation with stake below minimum", async function () {
      const dummyHash = ethers.encodeBytes32String("dummy");
      await expect(
        arena.connect(agentOwner1).createMatch(agentId1, dummyHash, { value: ethers.parseEther("0.0001") })
      ).to.be.revertedWithCustomError(arena, "InvalidStake");
    });

    it("should reject creation if caller does not own the agent", async function () {
      const dummyHash = ethers.encodeBytes32String("dummy");
      await expect(
        arena.connect(unauthorized).createMatch(agentId1, dummyHash, { value: MATCH_STAKE })
      ).to.be.revertedWithCustomError(arena, "NotAgentOwner");
    });

    it("should execute a full decisive match with atomic settlement", async function () {
      const matchId = 1n;
      // Creator allocates [60, 25, 15]
      const commit1 = hashAction(matchId, agentId1, 60, 25, 15, salt1);
      // Opponent allocates [20, 40, 40]
      const commit2 = hashAction(matchId, agentId2, 20, 40, 40, salt2);

      // 1. Create match
      await expect(
        arena.connect(agentOwner1).createMatch(agentId1, commit1, { value: MATCH_STAKE })
      )
        .to.emit(arena, "MatchCreated")
        .withArgs(matchId, agentId1, MATCH_STAKE, commit1);

      expect(await arena.totalMatches()).to.equal(1n);
      const openMatches = await arena.getOpenMatchIds();
      expect(openMatches.length).to.equal(1);
      expect(openMatches[0]).to.equal(matchId);

      // 2. Join match
      await expect(
        arena.connect(agentOwner2).joinMatch(matchId, agentId2, commit2, { value: MATCH_STAKE })
      ).to.emit(arena, "MatchJoined");

      let match = await arena.getMatch(matchId);
      expect(match.status).to.equal(2); // COMMITTED

      // 3. Creator reveals
      await expect(
        arena.connect(agentOwner1).revealAction(matchId, agentId1, 60, 25, 15, salt1)
      )
        .to.emit(arena, "ActionRevealed")
        .withArgs(matchId, agentId1, 60, 25, 15);

      match = await arena.getMatch(matchId);
      expect(match.creatorRevealed).to.be.true;
      expect(match.status).to.equal(2); // Still COMMITTED

      // 4. Opponent reveals -> Triggers atomic settlement!
      const feeRecipientBalBefore = await ethers.provider.getBalance(feeRecipient.address);
      const opponentBalBefore = await ethers.provider.getBalance(agentOwner2.address);

      const revealTx = await arena.connect(agentOwner2).revealAction(matchId, agentId2, 20, 40, 40, salt2);
      const receipt = await revealTx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      // Settlement:
      // Front 1: 60 vs 20 -> Creator (1 win)
      // Front 2: 25 vs 40 -> Opponent (1 win)
      // Front 3: 15 vs 40 -> Opponent (2 wins)
      // Winner: Opponent (agentId2)
      // Total Pot: 0.02 BOT
      // Fee (2%): 0.0004 BOT
      // Net Payout: 0.0196 BOT
      match = await arena.getMatch(matchId);
      expect(match.status).to.equal(3); // SETTLED
      expect(match.winnerAgentId).to.equal(agentId2);
      expect(match.payout).to.equal(ethers.parseEther("0.0196"));

      const feeRecipientBalAfter = await ethers.provider.getBalance(feeRecipient.address);
      expect(feeRecipientBalAfter - feeRecipientBalBefore).to.equal(ethers.parseEther("0.0004"));

      const opponentBalAfter = await ethers.provider.getBalance(agentOwner2.address);
      expect(opponentBalAfter + gasUsed - opponentBalBefore).to.equal(ethers.parseEther("0.0196"));

      // Check Registry stats update
      const agent2 = await registry.getAgent(agentId2);
      expect(agent2.matches).to.equal(1);
      expect(agent2.wins).to.equal(1);
      expect(agent2.totalRewards).to.equal(ethers.parseEther("0.0196"));

      const agent1 = await registry.getAgent(agentId1);
      expect(agent1.matches).to.equal(1);
      expect(agent1.wins).to.equal(0);
    });

    it("should handle tie matches with 100% full refund and zero fees", async function () {
      const matchId = 1n;
      // Creator: [50, 30, 20]
      const commit1 = hashAction(matchId, agentId1, 50, 30, 20, salt1);
      // Opponent: [40, 40, 20]
      // Front 1: 50 > 40 (Creator)
      // Front 2: 30 < 40 (Opponent)
      // Front 3: 20 == 20 (Draw)
      // Final: 1 - 1 -> TIE!
      const commit2 = hashAction(matchId, agentId2, 40, 40, 20, salt2);

      await arena.connect(agentOwner1).createMatch(agentId1, commit1, { value: MATCH_STAKE });
      await arena.connect(agentOwner2).joinMatch(matchId, agentId2, commit2, { value: MATCH_STAKE });

      const bal1Before = await ethers.provider.getBalance(agentOwner1.address);
      const bal2Before = await ethers.provider.getBalance(agentOwner2.address);

      const txA = await arena.connect(agentOwner1).revealAction(matchId, agentId1, 50, 30, 20, salt1);
      const rA = await txA.wait();
      const gasA = rA.gasUsed * rA.gasPrice;

      const txB = await arena.connect(agentOwner2).revealAction(matchId, agentId2, 40, 40, 20, salt2);
      const rB = await txB.wait();
      const gasB = rB.gasUsed * rB.gasPrice;

      const match = await arena.getMatch(matchId);
      expect(match.status).to.equal(3); // SETTLED
      expect(match.winnerAgentId).to.equal(0n); // Tie
      expect(match.payout).to.equal(0n);

      const bal1After = await ethers.provider.getBalance(agentOwner1.address);
      const bal2After = await ethers.provider.getBalance(agentOwner2.address);

      expect(bal1After + gasA - bal1Before).to.equal(MATCH_STAKE);
      expect(bal2After + gasB - bal2Before).to.equal(MATCH_STAKE);
    });

    it("should revert if allocation does not sum to 100", async function () {
      const matchId = 1n;
      const invalidCommit = hashAction(matchId, agentId1, 50, 50, 50, salt1);
      await arena.connect(agentOwner1).createMatch(agentId1, invalidCommit, { value: MATCH_STAKE });
      await arena.connect(agentOwner2).joinMatch(matchId, agentId2, invalidCommit, { value: MATCH_STAKE });

      await expect(
        arena.connect(agentOwner1).revealAction(matchId, agentId1, 50, 50, 50, salt1)
      ).to.be.revertedWithCustomError(arena, "InvalidAllocation");
    });

    it("should revert if revealed values do not match commitment hash", async function () {
      const matchId = 1n;
      const commit = hashAction(matchId, agentId1, 40, 30, 30, salt1);
      await arena.connect(agentOwner1).createMatch(agentId1, commit, { value: MATCH_STAKE });
      await arena.connect(agentOwner2).joinMatch(matchId, agentId2, commit, { value: MATCH_STAKE });

      // Reveal with different values [50, 30, 20]
      await expect(
        arena.connect(agentOwner1).revealAction(matchId, agentId1, 50, 30, 20, salt1)
      ).to.be.revertedWithCustomError(arena, "InvalidCommit");
    });

    it("should allow timeout claim if opponent fails to reveal (anti-griefing)", async function () {
      const matchId = 1n;
      const commit1 = hashAction(matchId, agentId1, 40, 30, 30, salt1);
      const commit2 = hashAction(matchId, agentId2, 30, 30, 40, salt2);

      await arena.connect(agentOwner1).createMatch(agentId1, commit1, { value: MATCH_STAKE });
      await arena.connect(agentOwner2).joinMatch(matchId, agentId2, commit2, { value: MATCH_STAKE });

      // Creator reveals
      await arena.connect(agentOwner1).revealAction(matchId, agentId1, 40, 30, 30, salt1);

      // Opponent does not reveal. Advance time beyond REVEAL_WINDOW (1 hour)
      await time.increase(3601);

      // Creator claims timeout victory
      const balBefore = await ethers.provider.getBalance(agentOwner1.address);
      const claimTx = await arena.connect(agentOwner1).claimTimeout(matchId);
      const r = await claimTx.wait();
      const gas = r.gasUsed * r.gasPrice;

      const match = await arena.getMatch(matchId);
      expect(match.status).to.equal(3);
      expect(match.winnerAgentId).to.equal(agentId1);

      const balAfter = await ethers.provider.getBalance(agentOwner1.address);
      // Expected payout = 0.02 BOT - 2% fee = 0.0196 BOT
      expect(balAfter + gas - balBefore).to.equal(ethers.parseEther("0.0196"));
    });

    it("should allow cancellation if match remains open after cancel window", async function () {
      const matchId = 1n;
      const commit1 = hashAction(matchId, agentId1, 40, 30, 30, salt1);

      await arena.connect(agentOwner1).createMatch(agentId1, commit1, { value: MATCH_STAKE });

      // Advance time past CANCEL_WINDOW (15 min)
      await time.increase(901);

      const balBefore = await ethers.provider.getBalance(agentOwner1.address);
      const cancelTx = await arena.connect(agentOwner1).cancelMatch(matchId);
      const r = await cancelTx.wait();
      const gas = r.gasUsed * r.gasPrice;

      const match = await arena.getMatch(matchId);
      expect(match.status).to.equal(4); // CANCELLED

      const balAfter = await ethers.provider.getBalance(agentOwner1.address);
      expect(balAfter + gas - balBefore).to.equal(MATCH_STAKE);
    });
  });
});
