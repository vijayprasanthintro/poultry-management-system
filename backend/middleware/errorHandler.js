const notFound = (req, res, next) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });
};

const errorHandler = (err, req, res, next) => {
  let statusCode = err.status || err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);
  let message = err.message || 'Server error';

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ');
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid id format.';
  } else if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `Duplicate value for ${field}.`;
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Invalid or expired token.';
  }

  if (statusCode >= 500) {
    console.error('[ERROR]', req.method, req.originalUrl, err);
    message = 'Server error. Please try again later.';
  }

  if (res.headersSent) return next(err);
  res.status(statusCode).json({ success: false, message });
};

module.exports = { notFound, errorHandler };