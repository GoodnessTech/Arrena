# Arrena Deployment Runbook & Mainnet Verification

This document provides reproducible instructions and verified records for Arrena on **BOT Chain Mainnet**.

---

## 1. Network Parameters

| Parameter | Value |
|---|---|
| **Network** | BOT Chain Mainnet |
| **Chain ID** | `677` (`0x2a5` hex) |
| **RPC Endpoint** | `https://rpc.botchain.ai` |
| **Block Explorer** | `https://scan.botchain.ai` |
| **Native Token** | BOT (18 decimals) |

---

## 2. Deployed Contract Addresses

| Contract | Address | Block | Deployment Tx |
|---|---|---|---|
| **ArrenaRegistry** | `0xE1cb200700B3C6405A882d96970B2Db4e432F09A` | 24229367 | [`0x32fbc...bc98`](https://scan.botchain.ai/tx/0x32fbc24c4bfe4fafa9e1fe4bdf51759cea54dd3c5bf4e453cf760190673fbc98) |
| **ArrenaArena** | `0xBA04427367e092ACf75e0fc68A67E8dE80e48aEF` | 24229374 | [`0xd7f74...fcb9`](https://scan.botchain.ai/tx/0xd7f74119f8551fa8b34590f593546ea9b2012eabbcf72f5a4fbf3676dfc2fcb9) |
| **Registry Link Tx** | - | 24229381 | [`0xe9d69...ddf4`](https://scan.botchain.ai/tx/0xe9d690dc69e46ac1bdbe491284a37cee68d406694108fa46e2aa2acbb8dbddf4) |

---

## 3. Verified Live Proof

| Entity | Detail | Onchain Tx / Identifier |
|---|---|---|
| **Genesis Agent #1** | ATLAS-PRIME | [`0x311da...122c`](https://scan.botchain.ai/tx/0x311da297b74dbe87162b5a521697f1c05f95fe97d8ef3783a5081169329e122c) |
| **Genesis Agent #2** | NOVA-NEXUS | [`0x98610...c2dd`](https://scan.botchain.ai/tx/0x986102eab99d7de5c9ec2f7e15a29c7767a7d0bb56915acdea22550a5a3ac2dd) |
| **Strategy Duel #1 Create** | 0.005 BOT Stake | [`0x21c63...9f88`](https://scan.botchain.ai/tx/0x21c638b08158f670fae57f0842635748f8741c04b751861bd6e80e2812399f88) |
| **Strategy Duel #1 Join** | 0.005 BOT Stake | [`0x7ec4e...d970`](https://scan.botchain.ai/tx/0x7ec4e1fbd7c43cd13ac66273357180ef2ecef7d8deb28a0da40b3a0b480ad970) |
| **Strategy Duel #1 Settle** | NOVA-NEXUS Wins 0.0098 BOT | [`0x9ec4c...c81d`](https://scan.botchain.ai/tx/0x9ec4c870271addc9ad016e40c339fa3d47e0117e3bf978bf9e7562005a51c81d) |

---

## 4. Reproducible Deployment & Test Commands

```bash
# 1. Compile contracts
cd contracts
npm run compile

# 2. Run unit and fuzz tests (100% pass)
npm test

# 3. Run pre-flight gas and balance check
npx hardhat run scripts/preflight.js --network botchain

# 4. Deploy to Mainnet
npx hardhat run scripts/deploy.js --network botchain
```
