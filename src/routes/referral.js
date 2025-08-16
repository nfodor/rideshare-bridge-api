const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { referralTrackSchema } = require('../utils/validation');

const router = express.Router();

const referralDatabase = new Map();
const rewardHistory = [];

router.post('/track', async (req, res, next) => {
  try {
    const { error, value } = referralTrackSchema.validate(req.body);
    if (error) {
      error.isJoi = true;
      return next(error);
    }

    const { referrerId, newUserId, userType, rewardAmount } = value;

    const existingReferral = Array.from(referralDatabase.values()).find(
      ref => ref.newUserId === newUserId
    );

    if (existingReferral) {
      return res.status(409).json({
        error: 'User Already Referred',
        message: `User ${newUserId} has already been referred by ${existingReferral.referrerId}`
      });
    }

    const referralId = uuidv4();
    const defaultReward = userType === 'driver' ? '25.0' : '10.0';
    const actualReward = rewardAmount || defaultReward;

    const referral = {
      referralId,
      referrerId,
      newUserId,
      userType,
      rewardAmount: actualReward,
      status: 'pending',
      createdAt: new Date().toISOString(),
      eligibilityMet: false,
      rewardPaid: false
    };

    referralDatabase.set(referralId, referral);

    res.status(201).json({
      success: true,
      message: 'Referral tracked successfully',
      referral: {
        referralId: referral.referralId,
        referrerId: referral.referrerId,
        newUserId: referral.newUserId,
        userType: referral.userType,
        rewardAmount: referral.rewardAmount,
        status: referral.status,
        createdAt: referral.createdAt
      },
      eligibilityCriteria: userType === 'driver' 
        ? 'Complete 5 rides within 30 days'
        : 'Complete 3 rides within 14 days'
    });
  } catch (error) {
    next(error);
  }
});

router.post('/complete', async (req, res, next) => {
  try {
    const { referralId } = req.body;

    if (!referralId) {
      return res.status(400).json({
        error: 'Missing Required Field',
        message: 'referralId is required'
      });
    }

    const referral = referralDatabase.get(referralId);
    if (!referral) {
      return res.status(404).json({
        error: 'Referral Not Found',
        message: `Referral ${referralId} not found`
      });
    }

    if (referral.status === 'completed') {
      return res.status(409).json({
        error: 'Referral Already Completed',
        message: 'This referral has already been completed'
      });
    }

    referral.status = 'completed';
    referral.eligibilityMet = true;
    referral.rewardPaid = true;
    referral.completedAt = new Date().toISOString();

    const rewardRecord = {
      referralId: referral.referralId,
      referrerId: referral.referrerId,
      newUserId: referral.newUserId,
      rewardAmount: referral.rewardAmount,
      paidAt: referral.completedAt,
      transactionHash: `0x${Buffer.from(`reward_${referralId}_${Date.now()}`).toString('hex').slice(0, 64)}`
    };

    rewardHistory.push(rewardRecord);

    res.json({
      success: true,
      message: 'Referral completed and reward paid',
      referral: {
        referralId: referral.referralId,
        referrerId: referral.referrerId,
        newUserId: referral.newUserId,
        userType: referral.userType,
        rewardAmount: referral.rewardAmount,
        status: referral.status,
        completedAt: referral.completedAt
      },
      reward: {
        amount: rewardRecord.rewardAmount,
        transactionHash: rewardRecord.transactionHash,
        paidAt: rewardRecord.paidAt
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/status/:referralId', async (req, res, next) => {
  try {
    const { referralId } = req.params;

    const referral = referralDatabase.get(referralId);
    if (!referral) {
      return res.status(404).json({
        error: 'Referral Not Found',
        message: `Referral ${referralId} not found`
      });
    }

    res.json({
      success: true,
      referral: {
        referralId: referral.referralId,
        referrerId: referral.referrerId,
        newUserId: referral.newUserId,
        userType: referral.userType,
        rewardAmount: referral.rewardAmount,
        status: referral.status,
        createdAt: referral.createdAt,
        eligibilityMet: referral.eligibilityMet,
        rewardPaid: referral.rewardPaid,
        ...(referral.completedAt && { completedAt: referral.completedAt })
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/user/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;

    const userReferrals = Array.from(referralDatabase.values()).filter(
      ref => ref.referrerId === userId
    );

    const totalRewards = rewardHistory
      .filter(reward => reward.referrerId === userId)
      .reduce((sum, reward) => sum + parseFloat(reward.rewardAmount), 0);

    res.json({
      success: true,
      userId,
      totalReferrals: userReferrals.length,
      completedReferrals: userReferrals.filter(ref => ref.status === 'completed').length,
      pendingReferrals: userReferrals.filter(ref => ref.status === 'pending').length,
      totalRewardsEarned: totalRewards.toString(),
      referrals: userReferrals.map(ref => ({
        referralId: ref.referralId,
        newUserId: ref.newUserId,
        userType: ref.userType,
        rewardAmount: ref.rewardAmount,
        status: ref.status,
        createdAt: ref.createdAt,
        ...(ref.completedAt && { completedAt: ref.completedAt })
      }))
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;