'use strict';

const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for the public RSVP route.
 * 30 requests per minute per IP — prevents enumeration attacks.
 */
const rsvpLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
});

module.exports = { rsvpLimiter };
