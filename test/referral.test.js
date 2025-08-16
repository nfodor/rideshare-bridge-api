const request = require('supertest');
const { expect } = require('chai');
const app = require('../src/index');

describe('Referral API', () => {
  const validReferralData = {
    referrerId: 'user_referrer_123',
    newUserId: 'user_new_456',
    userType: 'driver',
    rewardAmount: '25.0'
  };

  describe('POST /api/referral/track', () => {
    it('should successfully track a new referral', async () => {
      const response = await request(app)
        .post('/api/referral/track')
        .send(validReferralData)
        .expect(201);

      expect(response.body).to.have.property('success', true);
      expect(response.body).to.have.property('message');
      expect(response.body.referral).to.include({
        referrerId: validReferralData.referrerId,
        newUserId: validReferralData.newUserId,
        userType: validReferralData.userType,
        rewardAmount: validReferralData.rewardAmount,
        status: 'pending'
      });
      expect(response.body.referral).to.have.property('referralId');
      expect(response.body.referral).to.have.property('createdAt');
      expect(response.body).to.have.property('eligibilityCriteria');
    });

    it('should use default reward amounts when not specified', async () => {
      const dataWithoutReward = {
        referrerId: 'user_ref_default',
        newUserId: 'user_new_default',
        userType: 'rider'
      };

      const response = await request(app)
        .post('/api/referral/track')
        .send(dataWithoutReward)
        .expect(201);

      expect(response.body.referral.rewardAmount).to.equal('10.0');
    });

    it('should use driver default reward for driver referrals', async () => {
      const driverReferral = {
        referrerId: 'user_ref_driver',
        newUserId: 'user_new_driver',
        userType: 'driver'
      };

      const response = await request(app)
        .post('/api/referral/track')
        .send(driverReferral)
        .expect(201);

      expect(response.body.referral.rewardAmount).to.equal('25.0');
    });

    it('should reject duplicate user referrals', async () => {
      await request(app)
        .post('/api/referral/track')
        .send({
          referrerId: 'ref1',
          newUserId: 'duplicate_user',
          userType: 'rider'
        })
        .expect(201);

      const response = await request(app)
        .post('/api/referral/track')
        .send({
          referrerId: 'ref2',
          newUserId: 'duplicate_user',
          userType: 'rider'
        })
        .expect(409);

      expect(response.body).to.have.property('error', 'User Already Referred');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/referral/track')
        .send({ referrerId: 'test' })
        .expect(400);

      expect(response.body).to.have.property('error', 'Validation Error');
    });

    it('should validate userType enum', async () => {
      const invalidData = {
        ...validReferralData,
        newUserId: 'invalid_type_user',
        userType: 'invalid_type'
      };

      const response = await request(app)
        .post('/api/referral/track')
        .send(invalidData)
        .expect(400);

      expect(response.body).to.have.property('error', 'Validation Error');
    });
  });

  describe('GET /api/referral/status/:referralId', () => {
    let referralId;

    before(async () => {
      const response = await request(app)
        .post('/api/referral/track')
        .send({
          referrerId: 'status_test_ref',
          newUserId: 'status_test_user',
          userType: 'rider'
        });
      referralId = response.body.referral.referralId;
    });

    it('should return referral status', async () => {
      const response = await request(app)
        .get(`/api/referral/status/${referralId}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.referral).to.include({
        referralId: referralId,
        status: 'pending',
        eligibilityMet: false,
        rewardPaid: false
      });
    });

    it('should return 404 for non-existent referral', async () => {
      const response = await request(app)
        .get('/api/referral/status/non_existent_id')
        .expect(404);

      expect(response.body).to.have.property('error', 'Referral Not Found');
    });
  });

  describe('POST /api/referral/complete', () => {
    let referralId;

    before(async () => {
      const response = await request(app)
        .post('/api/referral/track')
        .send({
          referrerId: 'complete_test_ref',
          newUserId: 'complete_test_user',
          userType: 'driver'
        });
      referralId = response.body.referral.referralId;
    });

    it('should complete a referral and pay reward', async () => {
      const response = await request(app)
        .post('/api/referral/complete')
        .send({ referralId })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.referral).to.include({
        referralId: referralId,
        status: 'completed'
      });
      expect(response.body.referral).to.have.property('completedAt');
      expect(response.body).to.have.property('reward');
      expect(response.body.reward).to.have.property('transactionHash');
      expect(response.body.reward).to.have.property('paidAt');
    });

    it('should reject completion of already completed referral', async () => {
      const response = await request(app)
        .post('/api/referral/complete')
        .send({ referralId })
        .expect(409);

      expect(response.body).to.have.property('error', 'Referral Already Completed');
    });

    it('should reject completion with missing referralId', async () => {
      const response = await request(app)
        .post('/api/referral/complete')
        .send({})
        .expect(400);

      expect(response.body).to.have.property('error', 'Missing Required Field');
    });
  });

  describe('GET /api/referral/user/:userId', () => {
    before(async () => {
      await request(app)
        .post('/api/referral/track')
        .send({
          referrerId: 'user_stats_test',
          newUserId: 'referred_user_1',
          userType: 'rider'
        });

      await request(app)
        .post('/api/referral/track')
        .send({
          referrerId: 'user_stats_test',
          newUserId: 'referred_user_2',
          userType: 'driver'
        });

      const response = await request(app)
        .post('/api/referral/track')
        .send({
          referrerId: 'user_stats_test',
          newUserId: 'referred_user_3',
          userType: 'rider'
        });

      await request(app)
        .post('/api/referral/complete')
        .send({ referralId: response.body.referral.referralId });
    });

    it('should return user referral statistics', async () => {
      const response = await request(app)
        .get('/api/referral/user/user_stats_test')
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body).to.include({
        userId: 'user_stats_test',
        totalReferrals: 3,
        completedReferrals: 1,
        pendingReferrals: 2
      });
      expect(response.body).to.have.property('totalRewardsEarned');
      expect(response.body).to.have.property('referrals');
      expect(response.body.referrals).to.be.an('array').with.length(3);
    });

    it('should return empty stats for user with no referrals', async () => {
      const response = await request(app)
        .get('/api/referral/user/no_referrals_user')
        .expect(200);

      expect(response.body).to.include({
        totalReferrals: 0,
        completedReferrals: 0,
        pendingReferrals: 0,
        totalRewardsEarned: '0'
      });
    });
  });
});