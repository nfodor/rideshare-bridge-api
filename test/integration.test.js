const request = require('supertest');
const { expect } = require('chai');
const app = require('../src/index');

describe('API Integration Tests', () => {
  describe('Server Health and Basic Routes', () => {
    it('should respond to health check', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).to.have.property('status', 'healthy');
      expect(response.body).to.have.property('timestamp');
      expect(response.body).to.have.property('uptime');
    });

    it('should respond to root endpoint with API info', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body).to.include({
        name: 'Rideshare Bridge API',
        version: '0.1.0',
        status: 'running'
      });
      expect(response.body).to.have.property('endpoints');
      expect(response.body.endpoints).to.include({
        escrow: '/api/escrow',
        referral: '/api/referral',
        pool: '/api/pool'
      });
    });

    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/non-existent')
        .expect(404);

      expect(response.body).to.have.property('error', 'Not Found');
      expect(response.body).to.have.property('availableEndpoints');
    });
  });

  describe('Complete Ride Flow with Insurance', () => {
    const rideData = {
      rideId: 'integration_ride_001',
      riderWallet: '0x742d35Cc6e2c5e12A2B2C7b8B4F3E8A1F2c3d4e5',
      driverWallet: '0x853e46Dd7f3e6f23B3C3D8c9c5f4f9b2e3d4f5f6',
      amount: '35.75',
      currency: 'ETH',
      insuranceContribution: '2.0',
      referrerId: 'ref_integration_001'
    };

    const validSignature = '0x123456789abcdef123456789abcdef123456789abcdef123456789abcdef123456789abcdef123456789abcdef123456789abcdef123456789abcdef123456789ab';

    it('should complete full ride flow with escrow, insurance, and referral', async () => {
      // Step 1: Track referral
      const referralResponse = await request(app)
        .post('/api/referral/track')
        .send({
          referrerId: rideData.referrerId,
          newUserId: 'new_driver_integration',
          userType: 'driver'
        })
        .expect(201);

      expect(referralResponse.body.success).to.be.true;
      const referralId = referralResponse.body.referral.referralId;

      // Step 2: Check initial pool status
      const initialPoolResponse = await request(app)
        .get('/api/pool/status')
        .expect(200);

      const initialBalance = parseFloat(initialPoolResponse.body.pool.totalBalance);

      // Step 3: Create escrow with insurance contribution
      const escrowResponse = await request(app)
        .post('/api/escrow/initiate')
        .send(rideData)
        .expect(201);

      expect(escrowResponse.body.success).to.be.true;
      expect(escrowResponse.body.escrow.status).to.equal('active');
      expect(escrowResponse.body).to.have.property('insuranceContribution');
      expect(escrowResponse.body.referrerId).to.equal(rideData.referrerId);

      // Step 4: Verify insurance pool contribution
      const updatedPoolResponse = await request(app)
        .get('/api/pool/status')
        .expect(200);

      const updatedBalance = parseFloat(updatedPoolResponse.body.pool.totalBalance);
      expect(updatedBalance).to.equal(initialBalance + parseFloat(rideData.insuranceContribution));

      // Step 5: Check escrow status
      const statusResponse = await request(app)
        .get(`/api/escrow/status/${rideData.rideId}`)
        .expect(200);

      expect(statusResponse.body.escrow).to.include({
        rideId: rideData.rideId,
        status: 'active',
        amount: rideData.amount
      });

      // Step 6: Release escrow (complete ride)
      const releaseResponse = await request(app)
        .post('/api/escrow/release')
        .send({
          rideId: rideData.rideId,
          signature: validSignature
        })
        .expect(200);

      expect(releaseResponse.body.success).to.be.true;
      expect(releaseResponse.body.escrow.status).to.equal('released');

      // Step 7: Complete referral reward
      const completeReferralResponse = await request(app)
        .post('/api/referral/complete')
        .send({ referralId })
        .expect(200);

      expect(completeReferralResponse.body.success).to.be.true;
      expect(completeReferralResponse.body.referral.status).to.equal('completed');
      expect(completeReferralResponse.body).to.have.property('reward');

      // Step 8: Verify final states
      const finalEscrowStatus = await request(app)
        .get(`/api/escrow/status/${rideData.rideId}`)
        .expect(200);

      expect(finalEscrowStatus.body.escrow.status).to.equal('released');
      expect(finalEscrowStatus.body.escrow).to.have.property('releasedAt');

      const finalReferralStatus = await request(app)
        .get(`/api/referral/status/${referralId}`)
        .expect(200);

      expect(finalReferralStatus.body.referral).to.include({
        status: 'completed',
        eligibilityMet: true,
        rewardPaid: true
      });
    });

    it('should handle ride cancellation with insurance forfeiture', async () => {
      const cancelRideData = {
        ...rideData,
        rideId: 'cancel_integration_ride_002'
      };

      // Create escrow with insurance
      await request(app)
        .post('/api/escrow/initiate')
        .send(cancelRideData)
        .expect(201);

      // Check pool before cancellation
      const poolBeforeCancel = await request(app)
        .get('/api/pool/status')
        .expect(200);

      const balanceBeforeCancel = parseFloat(poolBeforeCancel.body.pool.totalBalance);

      // Cancel the ride
      const cancelResponse = await request(app)
        .post('/api/escrow/cancel')
        .send({
          rideId: cancelRideData.rideId,
          signature: validSignature
        })
        .expect(200);

      expect(cancelResponse.body.success).to.be.true;
      expect(cancelResponse.body.escrow.status).to.equal('cancelled');
      expect(cancelResponse.body.escrow).to.have.property('refundAmount');
      expect(cancelResponse.body.note).to.include('Insurance contributions are non-refundable');

      // Verify insurance contribution was retained
      const poolAfterCancel = await request(app)
        .get('/api/pool/status')
        .expect(200);

      const balanceAfterCancel = parseFloat(poolAfterCancel.body.pool.totalBalance);
      expect(balanceAfterCancel).to.equal(balanceBeforeCancel);
    });
  });

  describe('API Error Handling', () => {
    it('should handle validation errors gracefully', async () => {
      const response = await request(app)
        .post('/api/escrow/initiate')
        .send({
          rideId: 'test',
          riderWallet: 'invalid'
        })
        .expect(400);

      expect(response.body).to.have.property('error', 'Validation Error');
      expect(response.body).to.have.property('details');
      expect(response.body.details).to.be.an('array');
    });

    it('should handle content-type errors', async () => {
      const response = await request(app)
        .post('/api/escrow/initiate')
        .set('Content-Type', 'text/plain')
        .send('invalid data')
        .expect(400);

      expect(response.body).to.have.property('error');
    });

    it('should handle large payloads gracefully', async () => {
      const largeData = {
        rideId: 'large_test',
        riderWallet: '0x742d35Cc6e2c5e12A2B2C7b8B4F3E8A1F2c3d4e5',
        driverWallet: '0x853e46Dd7f3e6f23B3C3D8c9c5g4f9b2e3d4f5g6',
        amount: '25.0',
        largeField: 'x'.repeat(1000000) // 1MB of data
      };

      const response = await request(app)
        .post('/api/escrow/initiate')
        .send(largeData)
        .expect(201);

      expect(response.body.success).to.be.true;
    });
  });

  describe('CORS and Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.headers).to.have.property('x-content-type-options');
      expect(response.headers).to.have.property('x-frame-options');
    });

    it('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/api/escrow/initiate')
        .set('Origin', 'http://localhost:3001')
        .set('Access-Control-Request-Method', 'POST')
        .expect(204);

      expect(response.headers).to.have.property('access-control-allow-origin');
    });
  });
});