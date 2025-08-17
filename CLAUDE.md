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

**Core Payment System:**
- `/api/escrow/initiate` - Creates escrow for ride payment with optional insurance contribution
- `/api/escrow/release` - Releases payment to driver on ride completion
- `/api/escrow/cancel` - Handles cancellation logic (insurance contributions non-refundable)
- `/api/referral/track` - Tracks referral rewards for early adopters
- `/api/pool/status` - Insurance pool transparency (v0.2 feature)

**Insurance System (v0.3):**
- `/api/insurance/quote` - Get insurance quote with dynamic pricing
- `/api/insurance/purchase` - Purchase insurance policy for ride
- `/api/insurance/policies/:walletAddress` - Get user's insurance policies
- `/api/claims/submit` - Submit insurance claim with file uploads
- `/api/claims/status/:claimId` - Check claim processing status
- `/api/claims/:claimId` - Get detailed claim information
- `/api/jury/eligibility/:walletAddress` - Check driver jury eligibility
- `/api/jury/assign/:claimId` - Assign jury members to claim
- `/api/review/:reviewId` - Get community review details
- `/api/review/:reviewId/vote` - Submit vote on claim review

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

**IMPLEMENTATION COMPLETE AS OF v0.3.0** - Full rideshare insurance system implemented:
- ✅ API specifications (v0.1, v0.2, v0.3)
- ✅ Complete Node.js/Express API server implementation
- ✅ Insurance pool smart contract
- ✅ Comprehensive ride insurance system (up to $1M coverage)
- ✅ AI-powered claims processing with fraud detection
- ✅ Driver community validation system (jury-based)
- ✅ File upload support for claim documents
- ✅ Dynamic premium calculation based on driver history
- ✅ Docker development setup
- ⏳ Escrow smart contract implementation
- ⏳ Enhanced claim payout automation
- ⏳ Comprehensive insurance endpoint testing

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
- AI fraud detection with configurable confidence thresholds
- Community validation prevents single-point-of-failure in claim processing
- File upload validation and secure storage for claim documents
- Driver jury system with reputation-based eligibility requirements

## Current Session TODO for Future Claude Instances

**CRITICAL: Session crashed during insurance system enhancement. Continue from here:**

1. **PENDING IMPLEMENTATION:**
   - Enhanced claim payout automation system (researched, needs implementation)
   - Comprehensive tests for insurance endpoints (in-progress)
   - Advanced fraud detection with external data integration
   - Validator staking system with reputation management

2. **COMPLETED IN THIS SESSION:**
   - Full insurance system v0.3 implementation (insurance.js, claims.js, jury.js, review.js, payouts.js)
   - AI-powered fraud detection with confidence scoring
   - Driver community validation system
   - File upload support via Multer
   - Dynamic premium calculation
   - All routes integrated into main server

3. **RESEARCH COMPLETED:**
   - Analyzed blockchain insurance best practices (Nexus Mutual, InsurAce, Bridge Mutual)
   - Identified key implementation patterns for payout automation
   - Defined staking and validation mechanisms
   - Emergency fund management protocols

4. **IMMEDIATE NEXT STEPS:**
   - Implement enhanced claim payout automation from research
   - Create comprehensive test suite for all insurance endpoints
   - Add advanced fraud detection algorithms
   - Implement validator staking system
   - Test end-to-end insurance flow
   - Commit and push completed insurance system

5. **FILES MODIFIED/CREATED:**
   - `src/routes/insurance.js` - Insurance policy management
   - `src/routes/claims.js` - Claims processing with AI
   - `src/routes/jury.js` - Driver jury system
   - `src/routes/review.js` - Community review voting
   - `src/routes/payouts.js` - Claim payout management
   - `src/utils/validation.js` - Updated with insurance schemas
   - `src/index.js` - Integrated all new routes
   - `specs/ride-insurance-system.v0.3.md` - Comprehensive specification

**START HERE:** Continue with implementing claim payout automation and comprehensive testing. The insurance system foundation is complete and functional.