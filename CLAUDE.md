# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a blockchain-based payment bridge API for rideshare platforms that handles escrow-based payments, cancellation logic, referral rewards, and insurance pool contributions. The project is designed to be self-hosted and fully decoupled from main rideshare applications.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server with hot reload
npm run dev

# Run tests
npm test

# Run single test file
npx mocha test/sample.test.js

# Docker development setup
docker-compose up

# Access development server
curl http://localhost:3000
```

## Project Architecture

### Core Components

- **Specifications**: Two-version system in `specs/` directory
  - `bridge-api.v0.1.md` - Basic escrow and referral system (current base)
  - `bridge-api.v0.2.md` - Added insurance pool contributions and cancellation logic
- **Smart Contracts**: Solidity contracts in `contracts/`
  - `InsurancePool.sol` - Manages voluntary insurance contributions and cancellation forfeitures
- **API Server**: Node.js/Express backend (planned in `src/`)
- **Testing**: Mocha test framework setup

### API Design Patterns

The API follows RESTful patterns with these key endpoints:
- `/api/escrow/initiate` - Creates escrow for ride payment with optional insurance contribution
- `/api/escrow/release` - Releases payment to driver on ride completion
- `/api/escrow/cancel` - Handles cancellation logic (insurance contributions non-refundable)
- `/api/referral/track` - Tracks referral rewards for early adopters
- `/api/pool/status` - Insurance pool transparency (v0.2 feature)

### Blockchain Integration

- **Escrow Logic**: Per-ride smart contracts hold payments until milestone completion
- **Insurance Pool**: Global contract collecting voluntary contributions for cancellation protection
- **Multi-currency Support**: Designed for ETH and stablecoin payments
- **Testnet Ready**: Local development with Ganache, production-ready for Ethereum testnets

## Key Design Principles

- **Self-contained**: Runs independently from main rideshare application
- **Defensive Security**: All smart contract interactions are escrow-based with milestone releases
- **Transparency**: Insurance pool status and contribution tracking for audit purposes
- **Modularity**: Separate contracts for escrow vs insurance pool functionality
- **Optional Features**: Insurance contributions and referral tracking are opt-in

## Current Development Status

This is an early-stage project with specifications complete but implementation pending:
- ✅ API specifications (v0.1 and v0.2)
- ✅ Insurance pool smart contract
- ✅ Docker development setup
- ⏳ Node.js API server implementation
- ⏳ Escrow smart contract implementation
- ⏳ Integration tests

## Testing Strategy

- **Unit Tests**: Mocha/Chai framework for API endpoints
- **Contract Tests**: Solidity testing for smart contract logic
- **Integration Tests**: End-to-end ride flow testing
- **Local Blockchain**: Docker-based Ganache for development testing

## Security Considerations

- All payment flows use escrow contracts with milestone-based releases
- Insurance contributions are explicitly non-refundable on cancellation
- Wallet addresses validated before any blockchain transactions
- Referral rewards have built-in abuse prevention logic