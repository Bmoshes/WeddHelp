'use strict';

require('dotenv').config();
const { z } = require('zod');

const envSchema = z.object({
  PORT:          z.string().default('3001'),
  MONGODB_URI:   z.string().min(1, 'MONGODB_URI is required'),
  JWT_SECRET:    z.string().min(16, 'JWT_SECRET must be at least 16 chars'),
  JWT_EXPIRES_IN:z.string().default('7d'),
  FRONTEND_URL:  z.string().default('http://localhost:5173'),
  NODE_ENV:      z.enum(['development', 'production', 'test']).default('development'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

module.exports = parsed.data;
