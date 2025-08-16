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

module.exports = {
  escrowInitiateSchema,
  escrowActionSchema,
  referralTrackSchema,
  validateEthereumAddress,
  validateAmount
};