'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validate = require('../middleware/validate');
const { registerSchema, loginSchema } = require('../validators/wedding.validator');
const Wedding = require('../models/Wedding');
const Task = require('../models/Task');
const env = require('../config/env');
const { generateTasksForWedding } = require('../services/taskTemplateService');

const router = express.Router();

// POST /api/auth/register
router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const { coupleName, weddingDate, venue, email, password } = req.body;

    const passwordHash = await bcrypt.hash(password, 12);
    const wedding = await Wedding.create({
      coupleName,
      weddingDate: new Date(weddingDate),
      venue,
      email,
      passwordHash,
    });

    // Auto-generate Israeli task checklist
    const tasks = generateTasksForWedding(wedding._id, wedding.weddingDate);
    await Task.insertMany(tasks);

    const token = jwt.sign({ weddingId: wedding._id.toString() }, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
    });

    res.status(201).json({
      token,
      wedding: {
        id:          wedding._id,
        coupleName:  wedding.coupleName,
        weddingDate: wedding.weddingDate,
        venue:       wedding.venue,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const wedding = await Wedding.findOne({ email });
    if (!wedding) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, wedding.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ weddingId: wedding._id.toString() }, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
    });

    res.json({
      token,
      wedding: {
        id:          wedding._id,
        coupleName:  wedding.coupleName,
        weddingDate: wedding.weddingDate,
        venue:       wedding.venue,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
