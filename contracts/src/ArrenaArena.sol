// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IArrenaRegistry {
    function isAgentActive(uint256 agentId) external view returns (bool);
    function getAgentOwner(uint256 agentId) external view returns (address);
    function recordMatchOutcome(
        uint256 winnerAgentId,
        uint256 loserAgentId,
        uint128 reward
    ) external;
}

/**
 * @title ArrenaArena
 * @notice Deterministic economic Strategy Duel arena for autonomous AI agents on BOT Chain Mainnet.
 * @dev Fully onchain settlement with Colonel Blotto 3-front game theory.
 */
contract ArrenaArena {
    // --- Enums & Structs ---
    enum MatchStatus {
        EMPTY,
        OPEN,
        COMMITTED,
        SETTLED,
        CANCELLED
    }

    struct StrategyDuelMatch {
        uint256 matchId;
        uint256 creatorAgentId;
        uint256 opponentAgentId;
        uint128 stake;
        uint64 createdAt;
        uint64 revealDeadline;
        MatchStatus status;
        bytes32 creatorCommit;
        bytes32 opponentCommit;
        uint8[3] creatorAllocation;
        uint8[3] opponentAllocation;
        bool creatorRevealed;
        bool opponentRevealed;
        uint256 winnerAgentId;
        uint128 payout;
    }

    // --- Constants ---
    uint256 public constant MIN_STAKE = 0.001 ether; // 0.001 BOT
    uint256 public constant REVEAL_WINDOW = 1 hours;
    uint256 public constant CANCEL_WINDOW = 15 minutes;
    uint256 public constant FEE_DENOMINATOR = 10000;

    // --- State Variables ---
    address public owner;
    address public feeRecipient;
    uint256 public protocolFeeBps = 200; // 2% protocol fee
    IArrenaRegistry public immutable registry;

    uint256 private _matchIdCounter;
    uint256[] private _allMatchIds;
    mapping(uint256 => StrategyDuelMatch) private _matches;
    mapping(uint256 => uint256[]) private _agentMatchIds;

    // Reentrancy guard
    uint256 private _reentrancyStatus;
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    // --- Custom Errors ---
    error Unauthorized();
    error ReentrancyGuard();
    error InvalidStake();
    error InvalidCommit();
    error InvalidAllocation();
    error AgentNotActive();
    error NotAgentOwner();
    error SameAgent();
    error MatchNotOpen();
    error MatchNotCommitted();
    error AlreadyRevealed();
    error DeadlineNotPassed();
    error DeadlinePassed();
    error TransferFailed();
    error MatchNotFound();
    error CancelWindowNotReached();

    // --- Events ---
    event MatchCreated(
        uint256 indexed matchId,
        uint256 indexed creatorAgentId,
        uint128 stake,
        bytes32 commitHash
    );
    event MatchJoined(
        uint256 indexed matchId,
        uint256 indexed opponentAgentId,
        uint128 stake,
        bytes32 commitHash,
        uint64 revealDeadline
    );
    event ActionRevealed(
        uint256 indexed matchId,
        uint256 indexed agentId,
        uint8 p1,
        uint8 p2,
        uint8 p3
    );
    event MatchSettled(
        uint256 indexed matchId,
        uint256 indexed winnerAgentId,
        uint256 loserAgentId,
        uint128 payout,
        uint128 protocolFee,
        bool isTie
    );
    event MatchCancelled(uint256 indexed matchId, uint256 indexed agentId, uint128 refund);
    event ProtocolFeeUpdated(uint256 oldFee, uint256 newFee);
    event FeeRecipientUpdated(address oldRecipient, address newRecipient);

    // --- Modifiers ---
    modifier nonReentrant() {
        if (_reentrancyStatus == _ENTERED) revert ReentrancyGuard();
        _reentrancyStatus = _ENTERED;
        _;
        _reentrancyStatus = _NOT_ENTERED;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    constructor(address _registry) {
        if (_registry == address(0)) revert Unauthorized();
        owner = msg.sender;
        feeRecipient = msg.sender;
        registry = IArrenaRegistry(_registry);
        _reentrancyStatus = _NOT_ENTERED;
    }

    // --- Admin Functions ---
    function setProtocolFeeBps(uint256 newFeeBps) external onlyOwner {
        if (newFeeBps > 1000) revert InvalidStake(); // Max 10%
        emit ProtocolFeeUpdated(protocolFeeBps, newFeeBps);
        protocolFeeBps = newFeeBps;
    }

    function setFeeRecipient(address newRecipient) external onlyOwner {
        if (newRecipient == address(0)) revert Unauthorized();
        emit FeeRecipientUpdated(feeRecipient, newRecipient);
        feeRecipient = newRecipient;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert Unauthorized();
        owner = newOwner;
    }

    // --- Match Lifecycle ---

    /**
     * @notice Create a Strategy Duel match by committing stake and action hash.
     * @param agentId The registered agent ID of the creator.
     * @param commitHash keccak256(abi.encodePacked(matchId, agentId, p1, p2, p3, salt))
     */
    function createMatch(
        uint256 agentId,
        bytes32 commitHash
    ) external payable nonReentrant returns (uint256 matchId) {
        if (msg.value < MIN_STAKE) revert InvalidStake();
        if (commitHash == bytes32(0)) revert InvalidCommit();
        if (!registry.isAgentActive(agentId)) revert AgentNotActive();
        if (registry.getAgentOwner(agentId) != msg.sender) revert NotAgentOwner();

        unchecked {
            matchId = ++_matchIdCounter;
        }

        StrategyDuelMatch storage m = _matches[matchId];
        m.matchId = matchId;
        m.creatorAgentId = agentId;
        m.stake = uint128(msg.value);
        m.createdAt = uint64(block.timestamp);
        m.status = MatchStatus.OPEN;
        m.creatorCommit = commitHash;

        _allMatchIds.push(matchId);
        _agentMatchIds[agentId].push(matchId);

        emit MatchCreated(matchId, agentId, uint128(msg.value), commitHash);
    }

    /**
     * @notice Join an existing open match by matching the exact stake and committing action.
     */
    function joinMatch(
        uint256 matchId,
        uint256 agentId,
        bytes32 commitHash
    ) external payable nonReentrant {
        StrategyDuelMatch storage m = _matches[matchId];
        if (m.status != MatchStatus.OPEN) revert MatchNotOpen();
        if (msg.value != m.stake) revert InvalidStake();
        if (commitHash == bytes32(0)) revert InvalidCommit();
        if (!registry.isAgentActive(agentId)) revert AgentNotActive();
        if (registry.getAgentOwner(agentId) != msg.sender) revert NotAgentOwner();
        if (agentId == m.creatorAgentId) revert SameAgent();

        m.opponentAgentId = agentId;
        m.opponentCommit = commitHash;
        m.status = MatchStatus.COMMITTED;
        m.revealDeadline = uint64(block.timestamp + REVEAL_WINDOW);

        _agentMatchIds[agentId].push(matchId);

        emit MatchJoined(matchId, agentId, uint128(msg.value), commitHash, m.revealDeadline);
    }

    /**
     * @notice Reveal allocation actions and trigger settlement once both parties have revealed.
     * @dev Strategy allocations p1, p2, p3 must sum to exactly 100.
     */
    function revealAction(
        uint256 matchId,
        uint256 agentId,
        uint8 p1,
        uint8 p2,
        uint8 p3,
        bytes32 salt
    ) external nonReentrant {
        StrategyDuelMatch storage m = _matches[matchId];
        if (m.status != MatchStatus.COMMITTED) revert MatchNotCommitted();
        if (block.timestamp > m.revealDeadline) revert DeadlinePassed();
        if (uint16(p1) + uint16(p2) + uint16(p3) != 100) revert InvalidAllocation();

        bytes32 expectedHash = keccak256(abi.encodePacked(matchId, agentId, p1, p2, p3, salt));

        if (agentId == m.creatorAgentId) {
            if (m.creatorRevealed) revert AlreadyRevealed();
            if (registry.getAgentOwner(agentId) != msg.sender) revert NotAgentOwner();
            if (expectedHash != m.creatorCommit) revert InvalidCommit();

            m.creatorAllocation = [p1, p2, p3];
            m.creatorRevealed = true;
            emit ActionRevealed(matchId, agentId, p1, p2, p3);
        } else if (agentId == m.opponentAgentId) {
            if (m.opponentRevealed) revert AlreadyRevealed();
            if (registry.getAgentOwner(agentId) != msg.sender) revert NotAgentOwner();
            if (expectedHash != m.opponentCommit) revert InvalidCommit();

            m.opponentAllocation = [p1, p2, p3];
            m.opponentRevealed = true;
            emit ActionRevealed(matchId, agentId, p1, p2, p3);
        } else {
            revert Unauthorized();
        }

        // If both revealed, settle deterministically
        if (m.creatorRevealed && m.opponentRevealed) {
            _settleMatch(m);
        }
    }

    /**
     * @notice Settle match after deadline if one agent failed to reveal (anti-griefing).
     */
    function claimTimeout(uint256 matchId) external nonReentrant {
        StrategyDuelMatch storage m = _matches[matchId];
        if (m.status != MatchStatus.COMMITTED) revert MatchNotCommitted();
        if (block.timestamp <= m.revealDeadline) revert DeadlineNotPassed();

        uint256 totalPot = uint256(m.stake) * 2;
        m.status = MatchStatus.SETTLED;

        if (m.creatorRevealed && !m.opponentRevealed) {
            // Creator wins by forfeit
            m.winnerAgentId = m.creatorAgentId;
            _distributeWinnerPayout(m, m.creatorAgentId, m.opponentAgentId, totalPot);
        } else if (m.opponentRevealed && !m.creatorRevealed) {
            // Opponent wins by forfeit
            m.winnerAgentId = m.opponentAgentId;
            _distributeWinnerPayout(m, m.opponentAgentId, m.creatorAgentId, totalPot);
        } else {
            // Neither revealed: refund stakes
            m.winnerAgentId = 0;
            m.payout = 0;
            address creatorOwner = registry.getAgentOwner(m.creatorAgentId);
            address opponentOwner = registry.getAgentOwner(m.opponentAgentId);

            (bool ok1, ) = creatorOwner.call{value: m.stake}("");
            (bool ok2, ) = opponentOwner.call{value: m.stake}("");
            if (!ok1 || !ok2) revert TransferFailed();

            emit MatchSettled(matchId, 0, 0, 0, 0, true);
        }
    }

    /**
     * @notice Creator cancels an unmatched duel after cancel window and reclaims full stake.
     */
    function cancelMatch(uint256 matchId) external nonReentrant {
        StrategyDuelMatch storage m = _matches[matchId];
        if (m.status != MatchStatus.OPEN) revert MatchNotOpen();
        if (registry.getAgentOwner(m.creatorAgentId) != msg.sender) revert NotAgentOwner();
        if (block.timestamp < m.createdAt + CANCEL_WINDOW) revert CancelWindowNotReached();

        m.status = MatchStatus.CANCELLED;
        uint128 refund = m.stake;

        (bool ok, ) = msg.sender.call{value: refund}("");
        if (!ok) revert TransferFailed();

        emit MatchCancelled(matchId, m.creatorAgentId, refund);
    }

    // --- Internal Settlement Logic ---
    function _settleMatch(StrategyDuelMatch storage m) internal {
        uint8 creatorWins = 0;
        uint8 opponentWins = 0;

        for (uint256 i = 0; i < 3; i++) {
            if (m.creatorAllocation[i] > m.opponentAllocation[i]) {
                unchecked { ++creatorWins; }
            } else if (m.opponentAllocation[i] > m.creatorAllocation[i]) {
                unchecked { ++opponentWins; }
            }
        }

        uint256 totalPot = uint256(m.stake) * 2;
        m.status = MatchStatus.SETTLED;

        if (creatorWins > opponentWins) {
            m.winnerAgentId = m.creatorAgentId;
            _distributeWinnerPayout(m, m.creatorAgentId, m.opponentAgentId, totalPot);
        } else if (opponentWins > creatorWins) {
            m.winnerAgentId = m.opponentAgentId;
            _distributeWinnerPayout(m, m.opponentAgentId, m.creatorAgentId, totalPot);
        } else {
            // Tie (e.g. 1-1-1 or identical bids): full refund, zero fees
            m.winnerAgentId = 0;
            m.payout = 0;

            address creatorOwner = registry.getAgentOwner(m.creatorAgentId);
            address opponentOwner = registry.getAgentOwner(m.opponentAgentId);

            (bool ok1, ) = creatorOwner.call{value: m.stake}("");
            (bool ok2, ) = opponentOwner.call{value: m.stake}("");
            if (!ok1 || !ok2) revert TransferFailed();

            emit MatchSettled(m.matchId, 0, 0, 0, 0, true);
        }
    }

    function _distributeWinnerPayout(
        StrategyDuelMatch storage m,
        uint256 winnerId,
        uint256 loserId,
        uint256 totalPot
    ) internal {
        uint256 fee = (totalPot * protocolFeeBps) / FEE_DENOMINATOR;
        uint256 netPayout = totalPot - fee;

        m.payout = uint128(netPayout);

        address winnerOwner = registry.getAgentOwner(winnerId);

        if (fee > 0) {
            (bool feeOk, ) = feeRecipient.call{value: fee}("");
            if (!feeOk) revert TransferFailed();
        }

        (bool winOk, ) = winnerOwner.call{value: netPayout}("");
        if (!winOk) revert TransferFailed();

        // Update registry stats
        try registry.recordMatchOutcome(winnerId, loserId, uint128(netPayout)) {} catch {}

        emit MatchSettled(
            m.matchId,
            winnerId,
            loserId,
            uint128(netPayout),
            uint128(fee),
            false
        );
    }

    // --- Enumerable View Functions ---
    function totalMatches() external view returns (uint256) {
        return _allMatchIds.length;
    }

    function getMatch(uint256 matchId) external view returns (StrategyDuelMatch memory) {
        StrategyDuelMatch memory m = _matches[matchId];
        if (m.status == MatchStatus.EMPTY) revert MatchNotFound();
        return m;
    }

    function getMatches(uint256 offset, uint256 limit) external view returns (StrategyDuelMatch[] memory) {
        uint256 total = _allMatchIds.length;
        if (offset >= total || limit == 0) {
            return new StrategyDuelMatch[](0);
        }

        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }

        uint256 count = end - offset;
        StrategyDuelMatch[] memory batch = new StrategyDuelMatch[](count);

        for (uint256 i = 0; i < count;) {
            batch[i] = _matches[_allMatchIds[offset + i]];
            unchecked { ++i; }
        }

        return batch;
    }

    function getOpenMatchIds() external view returns (uint256[] memory) {
        uint256 total = _allMatchIds.length;
        uint256 openCount = 0;

        for (uint256 i = 0; i < total; i++) {
            if (_matches[_allMatchIds[i]].status == MatchStatus.OPEN) {
                unchecked { ++openCount; }
            }
        }

        uint256[] memory openIds = new uint256[](openCount);
        uint256 idx = 0;
        for (uint256 i = 0; i < total; i++) {
            uint256 mId = _allMatchIds[i];
            if (_matches[mId].status == MatchStatus.OPEN) {
                openIds[idx] = mId;
                unchecked { ++idx; }
            }
        }

        return openIds;
    }

    function getMatchesByAgent(uint256 agentId) external view returns (uint256[] memory) {
        return _agentMatchIds[agentId];
    }
}
