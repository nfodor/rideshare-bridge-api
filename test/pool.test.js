const request = require('supertest');
const { expect } = require('chai');
const app = require('../src/index');

describe('Insurance Pool API', () => {
  const validContribution = {
    contributor: '0x742d35Cc6e2c5e12A2B2C7b8B4F3E8A1F2c3d4e5',
    amount: '5.0'
  };

  describe('GET /api/pool/status', () => {
    it('should return insurance pool status', async () => {
      const response = await request(app)
        .get('/api/pool/status')
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body).to.have.property('message');
      expect(response.body.pool).to.include({
        currency: 'ETH'
      });
      expect(response.body.pool).to.have.property('totalBalance');
      expect(response.body.pool).to.have.property('contributorCount');
      expect(response.body.pool).to.have.property('totalContributions');
      expect(response.body.pool).to.have.property('lastUpdated');
      expect(response.body).to.have.property('stats');
      expect(response.body.stats).to.have.property('averageContribution');
      expect(response.body.stats).to.have.property('poolHealthScore');
    });
  });

  describe('POST /api/pool/contribute', () => {
    it('should accept valid insurance pool contribution', async () => {
      const response = await request(app)
        .post('/api/pool/contribute')
        .send(validContribution)
        .expect(201);

      expect(response.body.success).to.be.true;
      expect(response.body).to.have.property('message');
      expect(response.body.contribution).to.include({
        contributor: validContribution.contributor,
        amount: validContribution.amount
      });
      expect(response.body.contribution).to.have.property('timestamp');
      expect(response.body.contribution).to.have.property('transactionHash');
      expect(response.body).to.have.property('poolStatus');
    });

    it('should reject contribution with invalid Ethereum address', async () => {
      const invalidContribution = {
        contributor: 'invalid_address',
        amount: '5.0'
      };

      const response = await request(app)
        .post('/api/pool/contribute')
        .send(invalidContribution)
        .expect(400);

      expect(response.body).to.have.property('error', 'Invalid Ethereum Address');
    });

    it('should reject contribution with invalid amount', async () => {
      const invalidContribution = {
        contributor: validContribution.contributor,
        amount: 'invalid_amount'
      };

      const response = await request(app)
        .post('/api/pool/contribute')
        .send(invalidContribution)
        .expect(400);

      expect(response.body).to.have.property('error', 'Invalid Amount');
    });

    it('should reject contribution with negative amount', async () => {
      const negativeContribution = {
        contributor: validContribution.contributor,
        amount: '-5.0'
      };

      const response = await request(app)
        .post('/api/pool/contribute')
        .send(negativeContribution)
        .expect(400);

      expect(response.body).to.have.property('error', 'Invalid Amount');
    });

    it('should reject contribution with missing fields', async () => {
      const response = await request(app)
        .post('/api/pool/contribute')
        .send({ contributor: validContribution.contributor })
        .expect(400);

      expect(response.body).to.have.property('error', 'Missing Required Fields');
    });
  });

  describe('GET /api/pool/contributions/:address', () => {
    const testAddress = '0x853e46Dd7f3e6f23B3C3D8c9c5f4f9b2e3d4f5f6';

    before(async () => {
      await request(app)
        .post('/api/pool/contribute')
        .send({
          contributor: testAddress,
          amount: '10.0'
        });

      await request(app)
        .post('/api/pool/contribute')
        .send({
          contributor: testAddress,
          amount: '15.0'
        });
    });

    it('should return user contribution history', async () => {
      const response = await request(app)
        .get(`/api/pool/contributions/${testAddress}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body).to.include({
        contributor: testAddress,
        totalContributions: 2,
        totalAmount: '25'
      });
      expect(response.body).to.have.property('contributions');
      expect(response.body.contributions).to.be.an('array').with.length(2);
      expect(response.body).to.have.property('poolShare');
    });

    it('should return empty history for address with no contributions', async () => {
      const emptyAddress = '0x742d35Cc6e2c5e12A2B2C7b8B4F3E8A1F2c3d999';
      
      const response = await request(app)
        .get(`/api/pool/contributions/${emptyAddress}`)
        .expect(200);

      expect(response.body).to.include({
        totalContributions: 0,
        totalAmount: '0',
        poolShare: '0.00%'
      });
      expect(response.body.contributions).to.be.an('array').with.length(0);
    });

    it('should reject invalid Ethereum address', async () => {
      const response = await request(app)
        .get('/api/pool/contributions/invalid_address')
        .expect(400);

      expect(response.body).to.have.property('error', 'Invalid Ethereum Address');
    });
  });

  describe('GET /api/pool/analytics', () => {
    before(async () => {
      await request(app)
        .post('/api/pool/contribute')
        .send({
          contributor: '0x111d35Cc6e2c5e12A2B2C7b8B4F3E8A1F2c3d4e1',
          amount: '100.0'
        });

      await request(app)
        .post('/api/pool/contribute')
        .send({
          contributor: '0x222d35Cc6e2c5e12A2B2C7b8B4F3E8A1F2c3d4e2',
          amount: '50.0'
        });
    });

    it('should return comprehensive pool analytics', async () => {
      const response = await request(app)
        .get('/api/pool/analytics')
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body).to.have.property('analytics');
      
      const analytics = response.body.analytics;
      expect(analytics).to.have.property('poolOverview');
      expect(analytics.poolOverview).to.have.property('totalBalance');
      expect(analytics.poolOverview).to.have.property('contributorCount');
      expect(analytics.poolOverview).to.have.property('totalContributions');

      expect(analytics).to.have.property('last30Days');
      expect(analytics.last30Days).to.have.property('contributionCount');
      expect(analytics.last30Days).to.have.property('totalAmount');
      expect(analytics.last30Days).to.have.property('dailyBreakdown');

      expect(analytics).to.have.property('topContributors');
      expect(analytics.topContributors).to.be.an('array');

      expect(analytics).to.have.property('trends');
      expect(analytics.trends).to.have.property('averageContribution');
      expect(analytics.trends).to.have.property('growthRate');
    });

    it('should include top contributors with proper structure', async () => {
      const response = await request(app)
        .get('/api/pool/analytics')
        .expect(200);

      const topContributors = response.body.analytics.topContributors;
      
      if (topContributors.length > 0) {
        expect(topContributors[0]).to.have.property('address');
        expect(topContributors[0]).to.have.property('contributionCount');
        expect(topContributors[0]).to.have.property('totalAmount');
      }
    });
  });
});