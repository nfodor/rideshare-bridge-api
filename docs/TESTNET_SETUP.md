# 🔗 Real Blockchain Integration Guide

This guide shows how to connect the Rideshare Bridge API to real Ethereum networks for testing and production.

## 🚀 Quick Start

The API supports both **mock blockchain** (for development) and **real blockchain** (for testing/production) modes.

### 1. Environment Setup

```bash
# Copy example environment file
cp .env.example .env

# Edit with your configuration
nano .env
```

### 2. Choose Your Network

```bash
# Development (Mock blockchain - default)
USE_REAL_BLOCKCHAIN=false

# Testnet (Real blockchain)
USE_REAL_BLOCKCHAIN=true
NETWORK=sepolia
```

## 🌐 Supported Networks

### Free Testnets (Recommended for Testing)

| Network | Chain ID | Faucets | RPC Providers |
|---------|----------|---------|---------------|
| **Sepolia** | 11155111 | [sepoliafaucet.com](https://sepoliafaucet.com) | Infura, Alchemy |
| **Goerli** | 5 | [goerlifaucet.com](https://goerlifaucet.com) | Infura, Alchemy |
| **Mumbai** | 80001 | [faucet.polygon.technology](https://faucet.polygon.technology) | Polygon RPC |

### Local Development

| Network | Usage | Setup |
|---------|-------|-------|
| **Hardhat** | Local testing | `npx hardhat node` |
| **Ganache** | GUI blockchain | Download Ganache |
| **Anvil** | Fast local node | `anvil` |

### Production Networks

| Network | Chain ID | Cost | Use Case |
|---------|----------|------|----------|
| **Ethereum** | 1 | High | Production mainnet |
| **Polygon** | 137 | Low | L2 production |
| **Arbitrum** | 42161 | Medium | L2 production |

## 🔧 Setup Steps

### Step 1: Get RPC Access

Choose a provider and get your API key:

- **[Infura](https://infura.io/)** - Free tier available
- **[Alchemy](https://alchemy.com/)** - Free tier available  
- **[QuickNode](https://quicknode.com/)** - Free tier available

### Step 2: Create Test Wallet

```javascript
// Generate new wallet
const { ethers } = require('ethers');
const wallet = ethers.Wallet.createRandom();
console.log('Address:', wallet.address);
console.log('Private Key:', wallet.privateKey);
```

### Step 3: Configure Environment

```bash
# Network selection
NETWORK=sepolia
USE_REAL_BLOCKCHAIN=true

# RPC Configuration
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID

# Wallet (NEVER commit real private keys!)
PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
```

### Step 4: Get Test ETH

Visit these faucets to get free test ETH:

**Sepolia Testnet:**
- https://sepoliafaucet.com/
- https://faucet.quicknode.com/ethereum/sepolia

**Goerli Testnet:**
- https://goerlifaucet.com/
- https://faucet.quicknode.com/ethereum/goerli

### Step 5: Run Setup Script

```bash
# Run testnet setup
node scripts/setup-testnet.js
```

This script will:
- ✅ Verify network connectivity
- ✅ Check wallet balance
- ✅ Deploy insurance pool contract
- ✅ Update .env with contract addresses

### Step 6: Start with Real Blockchain

```bash
# Start API with real blockchain
USE_REAL_BLOCKCHAIN=true npm run dev
```

## 🧪 Testing Integration

### Test Endpoints with Real Network

```bash
# Test escrow creation (uses real transactions)
curl -X POST http://localhost:3000/api/escrow/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "rideId": "ride_test_001",
    "riderWallet": "0x742d35Cc6635C0532925a3b8D400eC6C8ded6e5",
    "driverWallet": "0x853e46Dd7f3e6f23B3C3D8c9c5f4f9b2e3d4f5f6",
    "amount": "0.01",
    "currency": "ETH",
    "insuranceContribution": "0.001"
  }'
```

### Monitor Transactions

```bash
# Check transaction on block explorer
# Sepolia: https://sepolia.etherscan.io/
# Goerli: https://goerli.etherscan.io/
```

## 💰 Cost Estimates

### Testnet (Free)
- **Transaction fees**: Free test ETH
- **Contract deployment**: ~$0 (test ETH)
- **API calls**: Free

### Mainnet (Production)
- **Simple transfer**: ~$3-15 USD
- **Contract deployment**: ~$50-200 USD
- **Contract interaction**: ~$10-50 USD

### Layer 2 (Polygon)
- **Simple transfer**: ~$0.01 USD
- **Contract deployment**: ~$0.50 USD
- **Contract interaction**: ~$0.05-0.20 USD

## 🔒 Security Best Practices

### Environment Variables
```bash
# ✅ Good - Test wallet
PRIVATE_KEY=0x1234...

# ❌ Never - Production keys in .env
# Use encrypted key stores or hardware wallets
```

### Network Validation
```bash
# ✅ Always verify network before transactions
NETWORK=sepolia  # explicit testnet

# ❌ Never assume mainnet
# NETWORK=mainnet  # only when intentional
```

### Contract Verification
```bash
# ✅ Verify contracts on Etherscan
# Upload source code for transparency
```

## 🐛 Troubleshooting

### Common Issues

**"Insufficient funds"**
```bash
# Check balance
node -e "
const ethers = require('ethers');
const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
provider.getBalance('YOUR_WALLET_ADDRESS').then(b => 
  console.log('Balance:', ethers.formatEther(b), 'ETH')
);
"
```

**"Network connection failed"**
```bash
# Test RPC endpoint
curl -X POST YOUR_RPC_URL \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

**"Transaction timeout"**
```bash
# Check gas price
# Increase gas limit in transactions
```

### Support Resources

- **Ethereum Docs**: https://ethereum.org/developers/
- **Ethers.js Docs**: https://docs.ethers.org/
- **Testnet Status**: https://status.infura.io/
- **Gas Tracker**: https://etherscan.io/gastracker

## 📊 Monitoring

### Block Explorer Links
```javascript
// Add to API responses for transparency
const getBlockExplorerUrl = (network, txHash) => {
  const explorers = {
    sepolia: `https://sepolia.etherscan.io/tx/${txHash}`,
    goerli: `https://goerli.etherscan.io/tx/${txHash}`,
    mainnet: `https://etherscan.io/tx/${txHash}`,
    polygon: `https://polygonscan.com/tx/${txHash}`
  };
  return explorers[network];
};
```

### Real-time Updates
```javascript
// Listen for blockchain events
provider.on('block', (blockNumber) => {
  console.log('New block:', blockNumber);
});
```

## 🚦 Deployment Checklist

### Pre-deployment
- [ ] Test wallet has sufficient balance
- [ ] RPC endpoint is stable and fast
- [ ] Contract deployment successful
- [ ] All environment variables configured
- [ ] API endpoints tested with real transactions

### Production
- [ ] Use hardware wallet or encrypted key store
- [ ] Monitor gas prices and optimize
- [ ] Set up transaction monitoring
- [ ] Configure error alerting
- [ ] Plan for network congestion

## 📈 Next Steps

1. **Smart Contract Compilation**: Add Hardhat for proper contract compilation
2. **Multi-sig Wallets**: Implement multi-signature security
3. **Layer 2 Integration**: Add Polygon/Arbitrum support
4. **Gas Optimization**: Implement gas price optimization
5. **Monitoring Dashboard**: Real-time blockchain monitoring

---

**Ready to go live?** 🚀

```bash
# Switch to real blockchain
USE_REAL_BLOCKCHAIN=true npm start
```