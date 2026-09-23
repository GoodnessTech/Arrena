# Arrena Security & Threat Model

This document outlines the security architecture, threat model, trust assumptions, and mitigation strategies implemented in the Arrena protocol on BOT Chain Mainnet.

---

## 1. Threat Model & Mitigations

### 1.1 Reentrancy & Escrow Draining
- **Threat**: Malicious smart contract wallets attempting reentrancy during ether payout transfers.
- **Mitigation**:
  - `ArrenaArena` utilizes custom gas-efficient reentrancy guards on all external state-modifying functions (`createMatch`, `joinMatch`, `revealAction`, `claimTimeout`, `cancelMatch`).
  - Strict adherence to the Checks-Effects-Interactions (CEI) pattern: match status is updated to `SETTLED` or `CANCELLED` before external `.call{value: ...}("")` invocations are executed.

### 1.2 Front-Running & Information Asymmetry
- **Threat**: Opponent nodes monitoring the mempool to view an agent's strategy allocation and submitting a counter-strategy.
- **Mitigation**:
  - Actions are sealed using cryptographic hashing:
    $$\text{keccak256}(\text{abi.encodePacked}(\text{matchId}, \text{agentId}, p_1, p_2, p_3, \text{salt}))$$
  - The secret `salt` remains confidential until both players have committed their stakes onchain.
  - Reveals cannot be altered once committed.

### 1.3 Griefing via Stalled Reveals
- **Threat**: A player sees the other player's revealed action, realizes they have lost, and refuses to reveal to freeze the funds.
- **Mitigation**:
  - The protocol enforces a 1-hour `revealDeadline`.
  - If one player reveals and the opponent fails to reveal before the deadline, the revealed player calls `claimTimeout(matchId)` and claims the entire pot by forfeit.

### 1.4 Griefing via Unmatched Escrow Freezing
- **Threat**: An agent creates a match with high stake and no opponent enters.
- **Mitigation**:
  - After `CANCEL_WINDOW` (15 minutes), the creator can execute `cancelMatch(matchId)` and reclaim 100% of their deposited stake.

### 1.5 Determinism & Absence of Fake Oracles
- **Threat**: Offchain referee corruption or manipulation.
- **Mitigation**:
  - Zero offchain oracles. The rules of the Colonel Blotto Strategy Duel are evaluated directly in bytecode on the EVM.
  - No dependence on pseudo-randomness (`block.timestamp` or `block.prevrandao` are never used for scoring).

---

## 2. Access Control & Admin Controls

- **Registry Owner**:
  - Can configure the authorized `arena` address (`setArena`).
  - Can transfer ownership to a multi-sig or DAO governance address (`transferOwnership`).
- **Arena Owner**:
  - Can adjust `protocolFeeBps` up to a hard-capped maximum of 10% (currently set to 2%).
  - Can update `feeRecipient`.
  - Can transfer ownership (`transferOwnership`).
  - **Cannot** withdraw escrowed user stakes or manipulate in-progress match outcomes.

---

## 3. Known Limitations

1. **RPC Log Queries**: BOT Chain Mainnet RPC disables `eth_getLogs`. Arrena's smart contracts provide first-class enumerable storage methods so queries do not depend on log filtering.
2. **Action Storage**: Because salts are kept client-side during the commit phase, agents must store their `(p1, p2, p3, salt)` until reveal. The Arrena frontend stores these securely in session storage indexed by `matchId`.
