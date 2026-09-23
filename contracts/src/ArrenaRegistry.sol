// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title ArrenaRegistry
 * @notice Canonical registry for AI Agent identities on BOT Chain Mainnet.
 * @dev Enumerable onchain state without relying on eth_getLogs.
 */
contract ArrenaRegistry {
    // --- Structs ---
    struct Agent {
        uint256 id;
        address owner;
        address wallet;
        uint32 matches;
        uint32 wins;
        uint128 totalRewards;
        uint64 createdAt;
        bool active;
        string name;
        string metadataURI;
    }

    // --- State Variables ---
    address public owner;
    address public arena;
    uint256 private _agentIdCounter;

    uint256[] private _allAgentIds;
    mapping(uint256 => Agent) private _agents;
    mapping(address => uint256[]) private _ownerAgentIds;

    // --- Custom Errors ---
    error Unauthorized();
    error AgentNotFound();
    error InvalidName();
    error ArenaAlreadySet();
    error AlreadyInitialized();

    // --- Events ---
    event AgentRegistered(
        uint256 indexed agentId,
        address indexed owner,
        address indexed wallet,
        string name
    );
    event AgentUpdated(uint256 indexed agentId, string name, string metadataURI);
    event AgentStatsUpdated(
        uint256 indexed winnerAgentId,
        uint256 indexed loserAgentId,
        uint128 reward
    );
    event ArenaSet(address indexed arena);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // --- Modifiers ---
    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier onlyArena() {
        if (msg.sender != arena) revert Unauthorized();
        _;
    }

    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    // --- Admin ---
    function setArena(address _arena) external onlyOwner {
        arena = _arena;
        emit ArenaSet(_arena);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert Unauthorized();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // --- Agent Registration ---
    function registerAgent(
        string calldata name,
        string calldata metadataURI
    ) external returns (uint256 agentId) {
        bytes memory nameBytes = bytes(name);
        if (nameBytes.length == 0 || nameBytes.length > 32) revert InvalidName();

        unchecked {
            agentId = ++_agentIdCounter;
        }

        Agent storage agent = _agents[agentId];
        agent.id = agentId;
        agent.owner = msg.sender;
        agent.wallet = msg.sender;
        agent.matches = 0;
        agent.wins = 0;
        agent.totalRewards = 0;
        agent.createdAt = uint64(block.timestamp);
        agent.active = true;
        agent.name = name;
        agent.metadataURI = metadataURI;

        _allAgentIds.push(agentId);
        _ownerAgentIds[msg.sender].push(agentId);

        emit AgentRegistered(agentId, msg.sender, msg.sender, name);
    }

    function updateAgent(
        uint256 agentId,
        string calldata name,
        string calldata metadataURI
    ) external {
        Agent storage agent = _agents[agentId];
        if (agent.owner != msg.sender) revert Unauthorized();

        bytes memory nameBytes = bytes(name);
        if (nameBytes.length == 0 || nameBytes.length > 32) revert InvalidName();

        agent.name = name;
        agent.metadataURI = metadataURI;

        emit AgentUpdated(agentId, name, metadataURI);
    }

    // --- Match Outcome Updates (Restricted to Arena) ---
    function recordMatchOutcome(
        uint256 winnerAgentId,
        uint256 loserAgentId,
        uint128 reward
    ) external onlyArena {
        if (winnerAgentId != 0) {
            Agent storage winner = _agents[winnerAgentId];
            if (winner.active) {
                unchecked {
                    winner.matches++;
                    winner.wins++;
                    winner.totalRewards += reward;
                }
            }
        }

        if (loserAgentId != 0) {
            Agent storage loser = _agents[loserAgentId];
            if (loser.active) {
                unchecked {
                    loser.matches++;
                }
            }
        }

        emit AgentStatsUpdated(winnerAgentId, loserAgentId, reward);
    }

    // --- View Functions ---
    function totalAgents() external view returns (uint256) {
        return _allAgentIds.length;
    }

    function getAgent(uint256 agentId) external view returns (Agent memory) {
        Agent memory agent = _agents[agentId];
        if (!agent.active) revert AgentNotFound();
        return agent;
    }

    function isAgentActive(uint256 agentId) external view returns (bool) {
        return _agents[agentId].active;
    }

    function getAgentOwner(uint256 agentId) external view returns (address) {
        return _agents[agentId].owner;
    }

    function getAgentIdsByOwner(address agentOwner) external view returns (uint256[] memory) {
        return _ownerAgentIds[agentOwner];
    }

    function getAgents(uint256 offset, uint256 limit) external view returns (Agent[] memory) {
        uint256 total = _allAgentIds.length;
        if (offset >= total || limit == 0) {
            return new Agent[](0);
        }

        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }

        uint256 count = end - offset;
        Agent[] memory batch = new Agent[](count);

        for (uint256 i = 0; i < count;) {
            batch[i] = _agents[_allAgentIds[offset + i]];
            unchecked { ++i; }
        }

        return batch;
    }
}
