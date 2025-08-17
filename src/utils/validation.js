const Joi = require('joi');

const escrowInitiateSchema = Joi.object({
  rideId: Joi.string().required().min(3).max(50),
  riderWallet: Joi.string().required().pattern(/^0x[a-fA-F0-9]{40}$/),
  driverWallet: Joi.string().required().pattern(/^0x[a-fA-F0-9]{40}$/),
  amount: Joi.string().required().pattern(/^\d+(\.\d{1,18})?$/),
  currency: Joi.string().valid('ETH', 'USDC', 'DAI').default('ETH'),
  insuranceContribution: Joi.string().pattern(/^\d+(\.\d{1,18})?$/).optional(),
  referrerId: Joi.string().optional()
});

const escrowActionSchema = Joi.object({
  rideId: Joi.string().required().min(3).max(50),
  signature: Joi.string().required()
});

const referralTrackSchema = Joi.object({
  referrerId: Joi.string().required().min(3).max(50),
  newUserId: Joi.string().required().min(3).max(50),
  userType: Joi.string().valid('rider', 'driver').required(),
  rewardAmount: Joi.string().pattern(/^\d+(\.\d{1,18})?$/).optional()
});

const ethereumAddressSchema = Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/);

const validateEthereumAddress = (address) => {
  const { error } = ethereumAddressSchema.validate(address);
  return !error;
};

const validateAmount = (amount) => {
  const amountRegex = /^\d+(\.\d{1,18})?$/;
  return amountRegex.test(amount) && parseFloat(amount) > 0;
};

// Insurance schemas
const insuranceQuoteSchema = Joi.object({
  rideAmount: Joi.string().required().pattern(/^\d+(\.\d{1,18})?$/),
  walletAddress: Joi.string().required().pattern(/^0x[a-fA-F0-9]{40}$/),
  userType: Joi.string().valid('rider', 'driver').default('rider')
});

const insurancePurchaseSchema = Joi.object({
  walletAddress: Joi.string().required().pattern(/^0x[a-fA-F0-9]{40}$/),
  rideId: Joi.string().required().min(3).max(50),
  coverageAmount: Joi.string().pattern(/^\d+(\.\d{1,18})?$/).optional(),
  premium: Joi.string().required().pattern(/^\d+(\.\d{1,18})?$/)
});

// Claims schemas
const claimCreateSchema = Joi.object({
  policyId: Joi.string().required().min(3).max(50),
  incidentType: Joi.string().valid('collision', 'injury', 'property_damage', 'theft', 'other').required(),
  incidentDate: Joi.date().iso().max('now').required(),
  claimAmount: Joi.string().required().pattern(/^\d+(\.\d{1,18})?$/),
  description: Joi.string().required().min(10).max(1000),
  claimantWallet: Joi.string().required().pattern(/^0x[a-fA-F0-9]{40}$/)
});

module.exports = {
  escrowInitiateSchema,
  escrowActionSchema,
  referralTrackSchema,
  insuranceQuoteSchema,
  insurancePurchaseSchema,
  claimCreateSchema,
  validateEthereumAddress,
  validateAmount
};