'use strict';

/**
 * Global Express error handler.
 * Controllers throw errors directly; no try/catch needed in each handler.
 * Usage: app.use(errorHandler) — must be the LAST middleware registered.
 */
module.exports = function errorHandler(err, req, res, _next) {
  const status = err.status || err.statusCode || 500;

  // Mongoose validation errors → 400
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: err.message });
  }

  // Mongoose duplicate key → 409
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({ message: `Duplicate value for ${field}` });
  }

  // JWT errors handled in auth middleware, but catch here just in case
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  // Log server errors
  if (status >= 500) {
    console.error('[Server Error]', err);
  }

  // Don't leak internals to client in production
  const message = status < 500 ? err.message : 'Internal Server Error';
  res.status(status).json({ message });
};
