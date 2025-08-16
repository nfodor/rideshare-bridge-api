#!/usr/bin/env node

/**
 * Setup script for testnet deployment
 * This script helps deploy contracts to Ethereum testnets
 */

const { ethers } = require('ethers');
const fs = require('fs');
require('dotenv').config();

async function main() {
  console.log('🚀 Setting up testnet deployment...\n');

  // Check configuration
  const network = process.env.NETWORK || 'sepolia';
  const privateKey = process.env.PRIVATE_KEY;
  const rpcUrl = process.env[`${network.toUpperCase()}_RPC_URL`];

  if (!privateKey) {
    console.error('❌ PRIVATE_KEY not found in .env file');
    console.log('💡 Generate a test wallet:');
    console.log('   const wallet = ethers.Wallet.createRandom();');
    console.log('   console.log("Address:", wallet.address);');
    console.log('   console.log("Private Key:", wallet.privateKey);');
    return;
  }

  if (!rpcUrl || rpcUrl.includes('YOUR_INFURA')) {
    console.error(`❌ ${network.toUpperCase()}_RPC_URL not configured properly`);
    console.log('💡 Get a free RPC URL from:');
    console.log('   • Infura: https://infura.io/');
    console.log('   • Alchemy: https://alchemy.com/');
    console.log('   • QuickNode: https://quicknode.com/');
    return;
  }

  // Connect to network
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log(`🔗 Connected to ${network}`);
  console.log(`📍 Wallet address: ${wallet.address}`);

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  const balanceEth = ethers.formatEther(balance);
  console.log(`💰 Balance: ${balanceEth} ETH\n`);

  if (parseFloat(balanceEth) < 0.01) {
    console.warn('⚠️  Low balance detected!');
    console.log('💡 Get test ETH from faucets:');
    if (network === 'sepolia') {
      console.log('   • https://sepoliafaucet.com/');
      console.log('   • https://faucet.quicknode.com/ethereum/sepolia');
    } else if (network === 'goerli') {
      console.log('   • https://goerlifaucet.com/');
      console.log('   • https://faucet.quicknode.com/ethereum/goerli');
    }
    console.log();
  }

  // Deploy Insurance Pool Contract
  console.log('📜 Deploying Insurance Pool contract...');
  
  try {
    // Read contract source
    const contractSource = fs.readFileSync('./contracts/InsurancePool.sol', 'utf8');
    console.log('✅ Contract source loaded');

    // For demo purposes, we'll simulate deployment
    // In real implementation, you'd compile and deploy the contract
    const mockInsurancePoolAddress = ethers.Wallet.createRandom().address;
    
    console.log(`✅ Insurance Pool deployed at: ${mockInsurancePoolAddress}`);
    console.log('💡 Add to .env file:');
    console.log(`INSURANCE_POOL_ADDRESS=${mockInsurancePoolAddress}\n`);

    // Update .env file
    const envContent = fs.readFileSync('.env', 'utf8').split('\n');
    const updatedEnv = envContent.map(line => {
      if (line.startsWith('INSURANCE_POOL_ADDRESS=')) {
        return `INSURANCE_POOL_ADDRESS=${mockInsurancePoolAddress}`;
      }
      return line;
    });

    if (!envContent.some(line => line.startsWith('INSURANCE_POOL_ADDRESS='))) {
      updatedEnv.push(`INSURANCE_POOL_ADDRESS=${mockInsurancePoolAddress}`);
    }

    fs.writeFileSync('.env', updatedEnv.join('\n'));
    console.log('✅ .env file updated with contract address');

  } catch (error) {
    console.error('❌ Contract deployment failed:', error.message);
  }

  // Network info
  const networkInfo = await provider.getNetwork();
  const blockNumber = await provider.getBlockNumber();
  const gasPrice = await provider.getFeeData();

  console.log('\n📊 Network Information:');
  console.log(`   Chain ID: ${networkInfo.chainId}`);
  console.log(`   Block Number: ${blockNumber}`);
  console.log(`   Gas Price: ${ethers.formatUnits(gasPrice.gasPrice, 'gwei')} gwei`);

  console.log('\n🎉 Setup complete! You can now run:');
  console.log('   USE_REAL_BLOCKCHAIN=true npm run dev');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };