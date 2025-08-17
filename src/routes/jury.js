const express = require('express');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// In-memory storage (would be in database in production)
const jurors = new Map();
const jurorAssignments = new Map();
const jurorVotes = new Map();

// Check if driver is eligible to be a juror
function checkJurorEligibility(driverProfile) {
  return {
    eligible: driverProfile.safetyScore >= 750 && 
             driverProfile.totalRides >= 500 &&
             driverProfile.accidentHistory.length === 0,
    requirements: {
      safetyScore: { required: 750, current: driverProfile.safetyScore, met: driverProfile.safetyScore >= 750 },
      totalRides: { required: 500, current: driverProfile.totalRides, met: driverProfile.totalRides >= 500 },
      noRecentClaims: { required: true, current: driverProfile.accidentHistory.length === 0, met: driverProfile.accidentHistory.length === 0 },
      activeContributor: { required: true, current: parseFloat(driverProfile.poolContributions) > 0, met: parseFloat(driverProfile.poolContributions) > 0 }
    }
  };
}

// Check jury eligibility
router.get('/eligible', async (req, res, next) => {
  try {
    const { wallet } = req.query;
    
    if (!wallet) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'wallet parameter is required'
      });
    }

    // Validate Ethereum address
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return res.status(400).json({
        error: 'Invalid Format',
        message: 'Invalid Ethereum wallet address'
      });
    }

    // Mock driver profile (would fetch from database)
    const driverProfile = {
      walletAddress: wallet,
      safetyScore: 850,
      totalRides: 1247,
      poolContributions: '125.50',
      accidentHistory: []
    };

    const eligibility = checkJurorEligibility(driverProfile);

    res.json({
      success: true,
      wallet,
      eligible: eligibility.eligible,
      requirements: eligibility.requirements,
      jurorProfile: {
        reputation: 850,
        totalVotes: 0,
        correctVotes: 0,
        earnings: '0'
      }
    });
  } catch (error) {
    next(error);
  }
});

// Volunteer to be a juror
router.post('/volunteer', async (req, res, next) => {
  try {
    const { wallet } = req.body;
    
    if (!wallet) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'wallet is required'
      });
    }

    // Validate Ethereum address
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return res.status(400).json({
        error: 'Invalid Format',
        message: 'Invalid Ethereum wallet address'
      });
    }

    // Check eligibility
    const driverProfile = {
      walletAddress: wallet,
      safetyScore: 850,
      totalRides: 1247,
      poolContributions: '125.50',
      accidentHistory: []
    };

    const eligibility = checkJurorEligibility(driverProfile);
    
    if (!eligibility.eligible) {
      return res.status(403).json({
        error: 'Not Eligible',
        message: 'You do not meet the requirements to be a juror',
        requirements: eligibility.requirements
      });
    }

    // Register as juror
    const juror = {
      wallet,
      reputation: 850,
      totalVotes: 0,
      correctVotes: 0,
      earnings: '0',
      joinedAt: new Date().toISOString(),
      status: 'active'
    };

    jurors.set(wallet, juror);

    res.status(201).json({
      success: true,
      message: 'Successfully registered as a juror',
      juror: {
        wallet: juror.wallet,
        reputation: juror.reputation,
        status: juror.status,
        joinedAt: juror.joinedAt
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get juror assignments
router.get('/assignments/:wallet', async (req, res, next) => {
  try {
    const { wallet } = req.params;
    
    // Validate Ethereum address
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return res.status(400).json({
        error: 'Invalid Format',
        message: 'Invalid Ethereum wallet address'
      });
    }

    const assignments = jurorAssignments.get(wallet) || [];

    res.json({
      success: true,
      wallet,
      totalAssignments: assignments.length,
      activeAssignments: assignments.filter(a => a.status === 'pending').length,
      assignments: assignments.map(assignment => ({
        reviewId: assignment.reviewId,
        claimId: assignment.claimId,
        assignedAt: assignment.assignedAt,
        deadline: assignment.deadline,
        status: assignment.status,
        aiAssessment: {
          fraudScore: (assignment.aiAssessment.fraudScore * 100).toFixed(0) + '%',
          recommendation: assignment.aiAssessment.recommendation
        }
      }))
    });
  } catch (error) {
    next(error);
  }
});

// Get juror reputation
router.get('/reputation/:wallet', async (req, res, next) => {
  try {
    const { wallet } = req.params;
    
    // Validate Ethereum address
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return res.status(400).json({
        error: 'Invalid Format',
        message: 'Invalid Ethereum wallet address'
      });
    }

    const juror = jurors.get(wallet);
    
    if (!juror) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Juror not found'
      });
    }

    const accuracy = juror.totalVotes > 0 ? 
      (juror.correctVotes / juror.totalVotes * 100).toFixed(1) : 0;

    res.json({
      success: true,
      wallet,
      reputation: {
        score: juror.reputation,
        rating: juror.reputation >= 900 ? 'Elite' :
                juror.reputation >= 800 ? 'Expert' :
                juror.reputation >= 700 ? 'Trusted' :
                juror.reputation >= 600 ? 'Regular' : 'Novice',
        totalVotes: juror.totalVotes,
        correctVotes: juror.correctVotes,
        accuracy: accuracy + '%',
        earnings: juror.earnings,
        rank: Math.floor(Math.random() * 100) + 1 // Mock ranking
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get voting history
router.get('/history/:wallet', async (req, res, next) => {
  try {
    const { wallet } = req.params;
    
    // Validate Ethereum address
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return res.status(400).json({
        error: 'Invalid Format',
        message: 'Invalid Ethereum wallet address'
      });
    }

    const votes = jurorVotes.get(wallet) || [];

    res.json({
      success: true,
      wallet,
      totalVotes: votes.length,
      voteHistory: votes.map(vote => ({
        reviewId: vote.reviewId,
        claimId: vote.claimId,
        vote: vote.decision,
        votedAt: vote.timestamp,
        outcome: vote.outcome || 'pending',
        earned: vote.earned || '0'
      }))
    });
  } catch (error) {
    next(error);
  }
});

// Get juror rewards
router.get('/rewards/:wallet', async (req, res, next) => {
  try {
    const { wallet } = req.params;
    
    // Validate Ethereum address
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return res.status(400).json({
        error: 'Invalid Format',
        message: 'Invalid Ethereum wallet address'
      });
    }

    const juror = jurors.get(wallet);
    
    if (!juror) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Juror not found'
      });
    }

    res.json({
      success: true,
      wallet,
      rewards: {
        totalEarned: juror.earnings,
        currency: 'POOL',
        pendingRewards: '12.50', // Mock pending rewards
        claimableRewards: '37.25', // Mock claimable
        rewardsHistory: [
          {
            date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            amount: '15.75',
            reason: 'Correct vote on claim_abc123'
          },
          {
            date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
            amount: '21.50',
            reason: 'Correct vote on claim_def456'
          }
        ]
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;