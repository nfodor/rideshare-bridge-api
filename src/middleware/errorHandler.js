const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  if (err.isJoi) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid request data',
      details: err.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message
    });
  }

  if (err.code === 'BLOCKCHAIN_ERROR') {
    return res.status(500).json({
      error: 'Blockchain Error',
      message: 'Failed to interact with blockchain',
      details: err.message
    });
  }

  if (err.code === 'INSUFFICIENT_FUNDS') {
    return res.status(400).json({
      error: 'Insufficient Funds',
      message: 'Not enough funds for this transaction'
    });
  }

  if (err.code === 'ESCROW_NOT_FOUND') {
    return res.status(404).json({
      error: 'Escrow Not Found',
      message: 'The requested escrow does not exist'
    });
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    error: statusCode >= 500 ? 'Internal Server Error' : 'Client Error',
    message: statusCode >= 500 ? 'An unexpected error occurred' : message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = { errorHandler };