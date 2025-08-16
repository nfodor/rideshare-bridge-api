#!/usr/bin/env node

/**
 * Pi-optimized local blockchain setup for unattended testing
 * Uses Hardhat for zero-cost, fast local blockchain
 */

const { spawn } = require('child_process');
const { ethers } = require('ethers');
const fs = require('fs');

async function setupPiTesting() {
  console.log('🥧 Setting up Pi-optimized blockchain testing...\n');

  // Check if we're on a Pi
  try {
    const cpuInfo = fs.readFileSync('/proc/cpuinfo', 'utf8');
    if (cpuInfo.includes('BCM') || cpuInfo.includes('Raspberry')) {
      console.log('🎯 Raspberry Pi detected - optimizing for ARM architecture');
    }
  } catch (e) {
    console.log('🖥️  Non-Pi system detected');
  }

  // Install Hardhat globally for Pi
  console.log('📦 Installing Hardhat (lightweight for Pi)...');
  
  try {
    // Check if hardhat is available
    const { execSync } = require('child_process');
    execSync('npx hardhat --version', { stdio: 'ignore' });
    console.log('✅ Hardhat already available');
  } catch (e) {
    console.log('Installing Hardhat...');
    execSync('npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox', { stdio: 'inherit' });
  }

  // Create Pi-optimized Hardhat config
  const hardhatConfig = `
require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    hardhat: {
      chainId: 31337,
      accounts: {
        count: 20,        // Enough test accounts
        accountsBalance: "10000000000000000000000" // 10,000 ETH each
      },
      mining: {
        auto: true,       // Auto-mine for instant transactions
        interval: 1000    // 1 second blocks (Pi-friendly)
      },
      gas: 12000000,      // High gas limit
      gasPrice: 20000000000, // 20 gwei
      blockGasLimit: 30000000
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};
`;

  fs.writeFileSync('hardhat.config.js', hardhatConfig);
  console.log('✅ Created Pi-optimized Hardhat config');

  // Create optimized .env for Pi testing
  const piEnv = `
# Pi-optimized blockchain testing configuration
USE_REAL_BLOCKCHAIN=true
NETWORK=hardhat

# Hardhat local network (runs on Pi)
HARDHAT_RPC_URL=http://localhost:8545
HARDHAT_CHAIN_ID=31337

# Pre-funded Hardhat accounts (10,000 ETH each)
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
# Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
# Account #1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (10000 ETH)
# Account #2: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC (10000 ETH)

# API Configuration (Pi-friendly)
PORT=3000
NODE_ENV=development

# Performance optimizations for Pi
NODE_OPTIONS="--max_old_space_size=512"
UV_THREADPOOL_SIZE=4
`;

  fs.writeFileSync('.env', piEnv);
  console.log('✅ Created Pi-optimized .env configuration');

  // Create Pi startup script
  const piStartScript = `#!/bin/bash

# Pi Blockchain Testing Startup Script
echo "🥧 Starting Pi blockchain testing environment..."

# Check Pi resources
echo "📊 Pi Resources:"
echo "   RAM: $(free -h | grep Mem | awk '{print $2}')"
echo "   CPU: $(nproc) cores"
echo "   Temp: $(vcgencmd measure_temp 2>/dev/null || echo 'N/A')"

# Start Hardhat node in background (Pi-optimized)
echo "🔗 Starting Hardhat blockchain..."
npx hardhat node --port 8545 --hostname 0.0.0.0 > hardhat.log 2>&1 &
HARDHAT_PID=$!
echo "   Hardhat PID: $HARDHAT_PID"

# Wait for blockchain to start
echo "⏳ Waiting for blockchain to initialize..."
sleep 5

# Test blockchain connectivity
echo "🧪 Testing blockchain connection..."
curl -s -X POST http://localhost:8545 \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \\
  | grep -q result && echo "✅ Blockchain responsive" || echo "❌ Blockchain not responding"

# Start API server
echo "🚀 Starting API server..."
npm start &
API_PID=$!
echo "   API PID: $API_PID"

# Wait for API to start
sleep 3

# Test API connectivity
echo "🧪 Testing API connection..."
curl -s http://localhost:3000/health | grep -q healthy && echo "✅ API responsive" || echo "❌ API not responding"

echo ""
echo "🎉 Pi testing environment ready!"
echo "   Blockchain: http://localhost:8545"
echo "   API: http://localhost:3000"
echo "   Docs: http://localhost:3000/docs"
echo ""
echo "💡 Available test accounts (10,000 ETH each):"
echo "   0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
echo "   0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
echo "   0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
echo ""
echo "📝 View logs:"
echo "   Blockchain: tail -f hardhat.log"
echo "   API: pm2 logs (if using PM2)"
echo ""
echo "🛑 To stop:"
echo "   kill $HARDHAT_PID $API_PID"

# Keep script running
wait
`;

  fs.writeFileSync('start-pi-testing.sh', piStartScript);
  fs.chmodSync('start-pi-testing.sh', '755');
  console.log('✅ Created Pi startup script');

  // Create Pi-optimized test suite
  const piTestScript = `#!/bin/bash

# Pi-Optimized Unattended Test Suite
echo "🧪 Running Pi blockchain test suite..."

# Pre-test checks
echo "📋 Pre-test checks:"
curl -s http://localhost:8545 > /dev/null && echo "   ✅ Blockchain online" || echo "   ❌ Blockchain offline"
curl -s http://localhost:3000/health > /dev/null && echo "   ✅ API online" || echo "   ❌ API offline"

# Run lightweight test suite
echo ""
echo "🚀 Running tests..."
npm test 2>&1 | tee test-results.log

# Analyze results
if grep -q "passing" test-results.log; then
  echo "✅ Tests completed successfully"
  exit 0
else
  echo "❌ Tests failed - check test-results.log"
  exit 1
fi
`;

  fs.writeFileSync('test-pi.sh', piTestScript);
  fs.chmodSync('test-pi.sh', '755');
  console.log('✅ Created Pi test script');

  console.log('\n🎯 Pi Testing Setup Complete!');
  console.log('\n📋 Quick Start:');
  console.log('   ./start-pi-testing.sh    # Start blockchain + API');
  console.log('   ./test-pi.sh             # Run test suite');
  console.log('   npm run pi:test          # Alternative test command');
  
  console.log('\n💡 Benefits for Pi:');
  console.log('   • 0% cost - completely free');
  console.log('   • Fast - instant transactions');
  console.log('   • Lightweight - minimal resources');
  console.log('   • 20 pre-funded accounts (10,000 ETH each)');
  console.log('   • Unattended operation');
  console.log('   • No internet required after setup');
}

if (require.main === module) {
  setupPiTesting().catch(console.error);
}

module.exports = { setupPiTesting };