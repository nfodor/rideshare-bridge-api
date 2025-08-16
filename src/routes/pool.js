const express = require('express');
const { BlockchainService } = require('../utils/blockchain');
const { validateEthereumAddress, validateAmount } = require('../utils/validation');

const router = express.Router();
const blockchainService = new BlockchainService();

router.get('/status', async (req, res, next) => {
  try {
    const poolStatus = blockchainService.getInsurancePoolStatus();

    res.json({
      success: true,
      message: 'Insurance pool status retrieved successfully',
      pool: {
        totalBalance: poolStatus.totalBalance,
        contributorCount: poolStatus.contributorCount,
        totalContributions: poolStatus.totalContributions,
        lastUpdated: poolStatus.lastUpdated,
        currency: 'ETH'
      },
      stats: {
        averageContribution: poolStatus.totalContributions > 0 
          ? (parseFloat(poolStatus.totalBalance) / poolStatus.totalContributions).toFixed(4)
          : '0',
        poolHealthScore: poolStatus.contributorCount > 10 ? 'High' : 
                        poolStatus.contributorCount > 5 ? 'Medium' : 'Low'
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post('/contribute', async (req, res, next) => {
  try {
    const { contributor, amount } = req.body;

    if (!contributor || !amount) {
      return res.status(400).json({
        error: 'Missing Required Fields',
        message: 'contributor and amount are required'
      });
    }

    if (!validateEthereumAddress(contributor)) {
      return res.status(400).json({
        error: 'Invalid Ethereum Address',
        message: 'contributor must be a valid Ethereum address'
      });
    }

    if (!validateAmount(amount)) {
      return res.status(400).json({
        error: 'Invalid Amount',
        message: 'amount must be a positive number with up to 18 decimal places'
      });
    }

    const contribution = await blockchainService.contributeToInsurance(contributor, amount);

    res.status(201).json({
      success: true,
      message: 'Insurance pool contribution successful',
      contribution: {
        contributor: contribution.contributor,
        amount: contribution.amount,
        timestamp: contribution.timestamp,
        transactionHash: contribution.transactionHash
      },
      poolStatus: blockchainService.getInsurancePoolStatus()
    });
  } catch (error) {
    next(error);
  }
});

router.get('/contributions/:address', async (req, res, next) => {
  try {
    const { address } = req.params;

    if (!validateEthereumAddress(address)) {
      return res.status(400).json({
        error: 'Invalid Ethereum Address',
        message: 'address must be a valid Ethereum address'
      });
    }

    const poolData = blockchainService.getInsurancePoolStatus();
    const allContributions = blockchainService.insurancePool.contributions;
    
    const userContributions = allContributions.filter(
      contrib => contrib.contributor.toLowerCase() === address.toLowerCase()
    );

    const totalUserContribution = userContributions.reduce(
      (sum, contrib) => sum + parseFloat(contrib.amount), 0
    );

    res.json({
      success: true,
      contributor: address,
      totalContributions: userContributions.length,
      totalAmount: totalUserContribution.toString(),
      contributions: userContributions.map(contrib => ({
        amount: contrib.amount,
        timestamp: contrib.timestamp,
        transactionHash: contrib.transactionHash
      })),
      poolShare: poolData.totalBalance !== '0' 
        ? ((totalUserContribution / parseFloat(poolData.totalBalance)) * 100).toFixed(2) + '%'
        : '0%'
    });
  } catch (error) {
    next(error);
  }
});

router.get('/analytics', async (req, res, next) => {
  try {
    const poolData = blockchainService.getInsurancePoolStatus();
    const allContributions = blockchainService.insurancePool.contributions;

    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const recentContributions = allContributions.filter(
      contrib => new Date(contrib.timestamp) > last30Days
    );

    const contributionsByDay = {};
    recentContributions.forEach(contrib => {
      const day = contrib.timestamp.split('T')[0];
      if (!contributionsByDay[day]) {
        contributionsByDay[day] = { count: 0, total: 0 };
      }
      contributionsByDay[day].count += 1;
      contributionsByDay[day].total += parseFloat(contrib.amount);
    });

    const topContributors = {};
    allContributions.forEach(contrib => {
      const addr = contrib.contributor;
      if (!topContributors[addr]) {
        topContributors[addr] = { count: 0, total: 0 };
      }
      topContributors[addr].count += 1;
      topContributors[addr].total += parseFloat(contrib.amount);
    });

    const sortedContributors = Object.entries(topContributors)
      .sort(([,a], [,b]) => b.total - a.total)
      .slice(0, 10)
      .map(([address, data]) => ({
        address,
        contributionCount: data.count,
        totalAmount: data.total.toString()
      }));

    res.json({
      success: true,
      analytics: {
        poolOverview: {
          totalBalance: poolData.totalBalance,
          contributorCount: poolData.contributorCount,
          totalContributions: poolData.totalContributions
        },
        last30Days: {
          contributionCount: recentContributions.length,
          totalAmount: recentContributions.reduce((sum, c) => sum + parseFloat(c.amount), 0).toString(),
          dailyBreakdown: contributionsByDay
        },
        topContributors: sortedContributors,
        trends: {
          averageContribution: poolData.totalContributions > 0 
            ? (parseFloat(poolData.totalBalance) / poolData.totalContributions).toFixed(4)
            : '0',
          growthRate: '12.5%' // Placeholder - would calculate from historical data
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;