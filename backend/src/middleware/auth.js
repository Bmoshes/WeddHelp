'use strict';

const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * JWT auth middleware.
 * Decodes the Bearer token and attaches `req.weddingId` (string).
 * All private routes must use this middleware.
 */
module.exports = function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.weddingId = decoded.weddingId; // string — used in every tenant-scoped query
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};
