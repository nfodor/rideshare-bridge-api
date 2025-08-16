#!/usr/bin/env node

/**
 * Environment Switcher - One command to switch between blockchain environments
 * Usage: node scripts/env-switcher.js [mock|local|testnet|mainnet]
 */

const fs = require('fs');
const path = require('path');

class EnvironmentSwitcher {
  constructor() {
    this.envFile = '.env';
    this.environments = {
      mock: {
        name: 'Mock Blockchain (Development)',
        description: 'Fast mock blockchain for development - no real transactions',
        cost: 'Free',
        speed: 'Instant',
        config: {
          USE_REAL_BLOCKCHAIN: 'false',
          NETWORK: 'mock'
        }
      },
      local: {
        name: 'Hardhat Local Network',
        description: 'Real blockchain behavior locally - zero cost with test funds',
        cost: 'Free',
        speed: 'Instant',
        config: {
          USE_REAL_BLOCKCHAIN: 'true',
          NETWORK: 'hardhat',
          HARDHAT_RPC_URL: 'http://localhost:8545',
          PRIVATE_KEY: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
        }
      },
      testnet: {
        name: 'Sepolia Testnet',
        description: 'Real Ethereum testnet - free test ETH required',
        cost: 'Free (test ETH)',
        speed: 'Slow (15 seconds)',
        config: {
          USE_REAL_BLOCKCHAIN: 'true',
          NETWORK: 'sepolia',
          SEPOLIA_RPC_URL: process.env.SEPOLIA_RPC_URL || 'https://sepolia.infura.io/v3/YOUR_PROJECT_ID',
          PRIVATE_KEY: process.env.TESTNET_PRIVATE_KEY || '0x...'
        }
      },
      mainnet: {
        name: 'Ethereum Mainnet',
        description: 'Production Ethereum network - real ETH and gas costs',
        cost: 'High ($$$)',
        speed: 'Slow (15 seconds)',
        config: {
          USE_REAL_BLOCKCHAIN: 'true',
          NETWORK: 'mainnet',
          MAINNET_RPC_URL: process.env.MAINNET_RPC_URL || 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID',
          PRIVATE_KEY: process.env.MAINNET_PRIVATE_KEY || '0x...'
        }
      }
    };
  }

  showHelp() {
    console.log('🔄 BLOCKCHAIN ENVIRONMENT SWITCHER');
    console.log('=====================================\n');
    
    console.log('Available environments:\n');
    
    Object.entries(this.environments).forEach(([key, env]) => {
      console.log(`${key.toUpperCase()}:`);
      console.log(`   Name: ${env.name}`);
      console.log(`   Description: ${env.description}`);
      console.log(`   Cost: ${env.cost}`);
      console.log(`   Speed: ${env.speed}\n`);
    });

    console.log('Usage:');
    console.log('   node scripts/env-switcher.js <environment>');
    console.log('   npm run env:switch <environment>\n');
    
    console.log('Examples:');
    console.log('   node scripts/env-switcher.js local    # Switch to Hardhat');
    console.log('   node scripts/env-switcher.js testnet  # Switch to Sepolia');
    console.log('   node scripts/env-switcher.js mainnet  # Switch to Mainnet');
  }

  getCurrentEnvironment() {
    if (!fs.existsSync(this.envFile)) {
      return 'mock'; // Default
    }

    const envContent = fs.readFileSync(this.envFile, 'utf8');
    const useReal = this.getEnvValue(envContent, 'USE_REAL_BLOCKCHAIN');
    const network = this.getEnvValue(envContent, 'NETWORK');

    if (useReal === 'false') return 'mock';
    if (network === 'hardhat') return 'local';
    if (network === 'sepolia') return 'testnet';
    if (network === 'mainnet') return 'mainnet';
    
    return 'unknown';
  }

  getEnvValue(content, key) {
    const match = content.match(new RegExp(`^${key}=(.*)$`, 'm'));
    return match ? match[1].trim() : null;
  }

  switchTo(targetEnv) {
    if (!this.environments[targetEnv]) {
      console.error(`❌ Unknown environment: ${targetEnv}`);
      this.showHelp();
      process.exit(1);
    }

    const env = this.environments[targetEnv];
    const currentEnv = this.getCurrentEnvironment();

    console.log(`🔄 Switching from ${currentEnv} to ${targetEnv}...`);
    console.log(`   Target: ${env.name}`);
    console.log(`   Cost: ${env.cost}`);
    console.log(`   Speed: ${env.speed}\n`);

    // Update .env file
    this.updateEnvFile(env.config);

    // Validate switch
    this.validateEnvironment(targetEnv);

    console.log(`✅ Successfully switched to ${targetEnv}`);
    console.log(`\n💡 Next steps:`);
    console.log(`   npm start                # Start API with ${env.name}`);
    console.log(`   npm test                 # Run tests on ${env.name}`);
    
    if (targetEnv === 'local') {
      console.log(`   npx hardhat node        # Start local blockchain first`);
    }
    
    if (targetEnv === 'testnet') {
      console.log(`   # Get test ETH: https://sepoliafaucet.com/`);
    }
  }

  updateEnvFile(config) {
    let envContent = '';
    
    // Read existing .env if it exists
    if (fs.existsSync(this.envFile)) {
      envContent = fs.readFileSync(this.envFile, 'utf8');
    }

    // Update each config value
    Object.entries(config).forEach(([key, value]) => {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (envContent.match(regex)) {
        envContent = envContent.replace(regex, `${key}=${value}`);
      } else {
        envContent += `\n${key}=${value}`;
      }
    });

    // Write updated .env
    fs.writeFileSync(this.envFile, envContent.trim() + '\n');
  }

  validateEnvironment(targetEnv) {
    const config = this.environments[targetEnv].config;
    
    // Check required environment variables
    const required = ['USE_REAL_BLOCKCHAIN', 'NETWORK'];
    const missing = [];

    required.forEach(key => {
      if (!config[key]) {
        missing.push(key);
      }
    });

    if (missing.length > 0) {
      console.warn(`⚠️  Missing required config: ${missing.join(', ')}`);
    }

    // Environment-specific validations
    if (targetEnv === 'testnet' && config.SEPOLIA_RPC_URL?.includes('YOUR_PROJECT_ID')) {
      console.warn('⚠️  Update SEPOLIA_RPC_URL with your Infura/Alchemy project ID');
    }

    if (targetEnv === 'mainnet' && config.MAINNET_RPC_URL?.includes('YOUR_PROJECT_ID')) {
      console.warn('⚠️  Update MAINNET_RPC_URL with your Infura/Alchemy project ID');
    }

    if ((targetEnv === 'testnet' || targetEnv === 'mainnet') && 
        config.PRIVATE_KEY === '0x...') {
      console.warn('⚠️  Update PRIVATE_KEY with your wallet private key');
    }
  }

  showStatus() {
    const current = this.getCurrentEnvironment();
    const env = this.environments[current];

    console.log('📊 CURRENT ENVIRONMENT STATUS');
    console.log('==============================\n');
    
    if (env) {
      console.log(`Environment: ${current}`);
      console.log(`Name: ${env.name}`);
      console.log(`Description: ${env.description}`);
      console.log(`Cost: ${env.cost}`);
      console.log(`Speed: ${env.speed}\n`);
    } else {
      console.log(`Environment: ${current} (unknown configuration)\n`);
    }

    // Show current .env relevant settings
    if (fs.existsSync(this.envFile)) {
      const envContent = fs.readFileSync(this.envFile, 'utf8');
      console.log('Current .env settings:');
      
      ['USE_REAL_BLOCKCHAIN', 'NETWORK', 'PRIVATE_KEY'].forEach(key => {
        const value = this.getEnvValue(envContent, key);
        if (value) {
          const displayValue = key === 'PRIVATE_KEY' ? 
            (value.substring(0, 6) + '...' + value.substring(value.length - 4)) : 
            value;
          console.log(`   ${key}: ${displayValue}`);
        }
      });
    }
  }
}

// CLI interface
function main() {
  const switcher = new EnvironmentSwitcher();
  const args = process.argv.slice(2);

  if (args.length === 0) {
    switcher.showStatus();
    console.log('\n💡 Use "node scripts/env-switcher.js <environment>" to switch');
    return;
  }

  const command = args[0];

  switch (command) {
    case 'help':
    case '--help':
    case '-h':
      switcher.showHelp();
      break;
    
    case 'status':
      switcher.showStatus();
      break;
    
    case 'mock':
    case 'local':
    case 'testnet':
    case 'mainnet':
      switcher.switchTo(command);
      break;
    
    default:
      console.error(`❌ Unknown command: ${command}`);
      switcher.showHelp();
      process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { EnvironmentSwitcher };