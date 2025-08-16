# Rideshare Blockchain Bridge API

This repository contains the specification and upcoming implementation for a standalone blockchain-based **Bridge API** designed for rideshare platforms. It allows platforms to **offload payments, escrow management, and referral incentives** to a secure, self-hosted blockchain layer.

## 🔥 Project Goal

Build a **secure, modular, and self-contained payment bridge** that:
- Handles escrow-based ride payments on-chain
- Supports milestone-based release (e.g. ride started, completed)
- Allows cancellation handling and lost item fee logic
- Issues referral rewards for early drivers and riders
- Is fully testable locally and testnet-ready
- Keeps wallet logic **fully decoupled** from the main rideshare app

This is part of a broader effort to support **independent rideshare networks** and empower drivers by giving them control over payment flows while ensuring platform-level integrity.

## 📐 Specification

The full API, contract, and auth specification lives in [`specs/bridge-api.v0.1.md`](specs/bridge-api.v0.1.md).

## 🔄 Spec Versioning

- `specs/bridge-api.v0.1.md` ← current version
- Future updates will follow the pattern:
  - `bridge-api.v0.2.md`
  - `bridge-api.v1.0.md`

## 🧪 Coming Soon

- `contracts/`: Solidity escrow/referral contracts
- `src/`: Node.js API server with Express
- `tests/`: Mocha/Chai test coverage
- `docker/`: Local dev setup with Ganache/testnet

## 🧑‍💻 Author

Nicolas Fodor  
MIT License – free to use, fork, and build.

## 💬 Questions?

Start a GitHub Discussion or open an Issue.
