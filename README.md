# Rideshare Blockchain Bridge API

This repository contains the **complete implementation** of a standalone blockchain-based **Bridge API** designed for rideshare platforms. It allows platforms to **offload payments, escrow management, and referral incentives** to a secure, self-hosted blockchain layer.

## 🔥 Project Goal

Build a **secure, modular, and self-contained payment bridge** that:
- Handles escrow-based ride payments on-chain
- Supports milestone-based release (e.g. ride started, completed)
- Allows cancellation handling and lost item fee logic
- Issues referral rewards for early drivers and riders
- Is fully testable locally and testnet-ready
- Keeps wallet logic **fully decoupled** from the main rideshare app

This is part of a broader effort to support **independent rideshare networks** and empower drivers by giving them control over payment flows while ensuring platform-level integrity.

## ⚡ Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Start with Docker
docker-compose up
```

## 🔧 Integration Guide

### ⚠️ Critical: Update Before Each Test Session

**Before running any tests or integration work, you MUST update the codebase to ensure compatibility:**

```bash
# 1. Update dependencies
npm install

# 2. Verify server starts correctly
npm run dev

# 3. Test basic endpoints
curl http://localhost:3000/health
curl http://localhost:3000/api/pool/status

# 4. Run test suite to verify functionality
npm test
```

**Why This Matters:**
- Dependencies may have security updates
- API endpoints may have been modified
- Test data structures could have changed
- Blockchain integration libraries evolve rapidly

### 🏗️ Integration Architecture

This API is designed as a **standalone service** that can be integrated with any rideshare platform:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Rideshare     │    │  Bridge API      │    │   Blockchain    │
│   Platform      │───▶│  (This Repo)     │───▶│   Network       │
│                 │    │                  │    │                 │
│ • User Management│    │ • Escrow Logic   │    │ • Smart         │
│ • Ride Matching │    │ • Insurance Pool │    │   Contracts     │
│ • UI/UX         │    │ • Referral Sys   │    │ • Token Payments│
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### 🚀 Feature Overview

#### **1. Escrow System** 
- **Purpose**: Secure ride payments with milestone-based releases
- **Features**: 
  - Create escrow on ride initiation
  - Release payment on ride completion
  - Handle cancellations with partial refunds
  - Support multiple cryptocurrencies (ETH, USDC, DAI)

#### **2. Insurance Pool**
- **Purpose**: Collective protection against ride cancellations
- **Features**:
  - Voluntary rider contributions to shared pool
  - Non-refundable contributions on cancellation
  - Transparent pool analytics and statistics
  - Contributor tracking and rewards

#### **3. Referral System**
- **Purpose**: Incentivize network growth with automated rewards
- **Features**:
  - Track driver and rider referrals
  - Automated reward calculation and distribution
  - Completion milestone tracking
  - User referral statistics and history

### 🧪 Test Structure & Integration Testing

#### **Test Categories**

**1. Unit Tests** (`test/*.test.js`)
```bash
npm test                    # Run all tests
npm run test:watch         # Watch mode for development
```

**2. API Endpoint Tests**
- **Escrow API** (`test/escrow.test.js`): 15+ tests covering creation, release, cancellation
- **Referral API** (`test/referral.test.js`): 12+ tests covering tracking, completion, user stats  
- **Insurance Pool API** (`test/pool.test.js`): 10+ tests covering contributions, analytics
- **Integration Tests** (`test/integration.test.js`): End-to-end ride flows

**3. Test Data Requirements**

⚠️ **CRITICAL: Test data must be updated if API changes**

```javascript
// Valid Ethereum addresses (required format)
const testAddresses = {
  rider: "0x742d35Cc6e2c5e12A2B2C7b8B4F3E8A1F2c3d4e5",
  driver: "0x853e46Dd7f3e6f23B3C3D8c9c5f4f9b2e3d4f5f6"
};

// Sample ride data structure
const rideData = {
  rideId: "ride_123",
  riderWallet: testAddresses.rider,
  driverWallet: testAddresses.driver,
  amount: "25.50",
  currency: "ETH",
  insuranceContribution: "2.0",  // Optional
  referrerId: "ref_001"          // Optional
};
```

#### **Integration Test Scenarios**

**Scenario 1: Complete Ride Flow**
```bash
1. Track referral for new driver
2. Create escrow with insurance contribution  
3. Verify insurance pool balance increase
4. Complete ride and release escrow
5. Process referral reward
6. Verify all state changes
```

**Scenario 2: Cancellation Flow**
```bash
1. Create escrow with insurance
2. Cancel ride
3. Verify partial refund calculation
4. Confirm insurance contribution retained
5. Check pool balance unchanged
```

**Scenario 3: Error Handling**
```bash
1. Invalid Ethereum addresses
2. Duplicate escrow creation
3. Insufficient funds scenarios
4. Signature validation failures
```

### 🔌 Integration Endpoints

#### **Health & Status**
```bash
GET /health                 # API health check
GET /                      # API information and endpoints
```

#### **Escrow Management**
```bash
POST /api/escrow/initiate   # Create new escrow
POST /api/escrow/release    # Release payment to driver
POST /api/escrow/cancel     # Cancel with refund logic
GET  /api/escrow/status/:id # Check escrow status
```

#### **Referral System**
```bash
POST /api/referral/track    # Track new referral
POST /api/referral/complete # Complete referral & pay reward
GET  /api/referral/status/:id        # Referral status
GET  /api/referral/user/:userId      # User referral stats
```

#### **Insurance Pool**
```bash
POST /api/pool/contribute            # Add contribution
GET  /api/pool/status               # Pool status & analytics
GET  /api/pool/contributions/:addr  # User contribution history
GET  /api/pool/analytics            # Detailed analytics
```

---

## 🔄 **Deployment & Testing Plan**

### **Environment Switching System**

The API supports seamless switching between blockchain environments with one command:

```bash
# Check current environment
npm run env:status

# Switch environments instantly
npm run env:mock      # Mock blockchain (development)
npm run env:local     # Hardhat local (as-if-real, free)
npm run env:testnet   # Sepolia testnet (real, free test ETH)
npm run env:mainnet   # Ethereum mainnet (real, costly)
```

### **3-Phase Testing Strategy**

#### **Phase 1: Local Testing (Recommended for Pi)**
```bash
# Setup Pi-optimized environment
npm run setup:pi

# Switch to local Hardhat network
npm run env:local

# Start local blockchain + API
npm run pi:start

# Run comprehensive tests
npm run pi:test
```

**Benefits:**
- ✅ **Zero cost** - completely free
- ✅ **Instant transactions** - no waiting
- ✅ **Real blockchain behavior** - gas, contracts, signatures
- ✅ **20 pre-funded accounts** (10,000 ETH each)
- ✅ **Pi-optimized** - minimal resources
- ✅ **Unattended operation** - runs autonomously

#### **Phase 2: Testnet Validation**
```bash
# Switch to Sepolia testnet
npm run env:testnet

# Setup testnet environment
npm run setup:testnet

# Get free test ETH from: https://sepoliafaucet.com/

# Run tests on real blockchain
npm test
```

**Benefits:**
- ✅ **Real Ethereum network** behavior
- ✅ **Free test ETH** from faucets
- ✅ **Block explorer verification**
- ✅ **Network latency testing**

#### **Phase 3: Production Deployment**
```bash
# Run comprehensive deployment test plan
npm run deploy:test

# Switch to mainnet (when ready)
npm run env:mainnet

# Deploy to production
npm start
```

### **Environment Comparison**

| Environment | Cost | Speed | Use Case |
|-------------|------|-------|----------|
| **Mock** | Free | Instant | Fast development |
| **Local** | Free | Instant | Real testing without cost |
| **Testnet** | Free* | 15s blocks | Pre-production validation |
| **Mainnet** | High | 15s blocks | Production |

*Requires free test ETH from faucets

### **One-Command Testing Workflows**

```bash
# Development workflow
npm run env:local && npm start

# Testing workflow  
npm run env:local && npm test

# Pre-production workflow
npm run env:testnet && npm test

# Deployment readiness check
npm run deploy:test
```

### **Automated Test Matrix**

The deployment test plan validates:

**Local Environment (Phase 1):**
- ✅ Contract deployment
- ✅ Escrow lifecycle testing
- ✅ Insurance pool operations
- ✅ Referral system validation
- ✅ Error handling verification
- ✅ Gas estimation accuracy
- ✅ Concurrent transaction handling

**Testnet Environment (Phase 2):**
- ✅ Real gas cost validation
- ✅ Network latency handling
- ✅ Block confirmation timing
- ✅ Transaction receipt verification
- ✅ Block explorer validation

**Production Readiness (Phase 3):**
- ✅ Security audit checklist
- ✅ Gas optimization analysis
- ✅ Performance benchmarks
- ✅ Load testing scenarios
- ✅ Disaster recovery procedures

### **Pi-Specific Optimizations**

```bash
# Pi resource monitoring
echo "RAM: $(free -h | grep Mem | awk '{print $2}')"
echo "CPU: $(nproc) cores" 
echo "Temp: $(vcgencmd measure_temp)"

# Pi-optimized Hardhat config
# - 1-second blocks (vs instant)
# - Limited gas per block
# - ARM-compatible dependencies
```

This integrated system allows you to:
1. **Develop fast** with mock blockchain
2. **Test thoroughly** with local Hardhat (as-if-real)
3. **Validate completely** with Sepolia testnet
4. **Deploy confidently** to mainnet

All with **one environment variable switch** between any blockchain network!

### 🐛 Integration Troubleshooting

**Common Issues & Solutions:**

1. **Tests Failing After Update**
   ```bash
   # Clear node_modules and reinstall
   rm -rf node_modules package-lock.json
   npm install
   npm test
   ```

2. **Invalid Ethereum Addresses**
   ```bash
   # Addresses must be exactly 42 characters: 0x + 40 hex characters
   # Valid: 0x742d35Cc6e2c5e12A2B2C7b8B4F3E8A1F2c3d4e5
   # Invalid: 0x742d35Cc6e2c5e12 (too short)
   ```

3. **Signature Validation Issues**
   ```bash
   # Our mock signatures will fail real validation
   # This is expected behavior for security
   # Use ethers.js to generate real signatures for production
   ```

4. **Port Conflicts**
   ```bash
   # Change port in package.json or use environment variable
   PORT=3001 npm run dev
   ```

### 📊 Integration Metrics

**Current Test Coverage:**
- ✅ 40+ Tests passing
- ✅ All major API endpoints covered
- ✅ Error handling scenarios tested
- ✅ Integration workflows verified

**Performance Benchmarks:**
- API Response Time: < 100ms
- Test Suite Runtime: ~2 seconds
- Docker Build Time: ~30 seconds

## 📐 Specification

The full API, contract, and auth specification lives in [`specs/bridge-api.v0.1.md`](specs/bridge-api.v0.1.md).

## 🔄 Spec Versioning

- `specs/bridge-api.v0.1.md` ← current version
- `specs/bridge-api.v0.2.md` ← insurance pool features
- Future updates will follow the pattern:
  - `bridge-api.v1.0.md`

## 🧑‍💻 Author

Nicolas Fodor  
MIT License – free to use, fork, and build.

## 💬 Questions?

Start a GitHub Discussion or open an Issue.
