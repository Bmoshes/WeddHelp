'use strict';

const path = require('path');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const env = require('./config/env');
const errorHandler = require('./middleware/errorHandler');

// Routes
const authRoutes       = require('./routes/auth.routes');
const weddingRoutes    = require('./routes/wedding.routes');
const invitationRoutes = require('./routes/invitation.routes');
const guestRoutes      = require('./routes/guest.routes');
const taskRoutes       = require('./routes/task.routes');
const budgetRoutes     = require('./routes/budget.routes');
const seatingRoutes    = require('./routes/seating.routes');
const rsvpRoutes       = require('./routes/rsvp.routes');

const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: env.FRONTEND_URL,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Body parsers ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false }));

// ── Multer (in-memory) for Excel uploads ─────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    cb(null, allowed.includes(file.mimetype));
  },
});

// Attach multer to the Excel import endpoint before the router
app.use('/api/seating/excel-import', upload.single('file'));

// ── Static uploads (proof images) ─────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',        authRoutes);
app.use('/api/wedding',     weddingRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/guests',      guestRoutes);
app.use('/api/tasks',       taskRoutes);
app.use('/api/budget',      budgetRoutes);
app.use('/api/seating',     seatingRoutes);
app.use('/api/rsvp',        rsvpRoutes);    // PUBLIC — no auth middleware

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ message: 'Not found' }));

// ── Global error handler (must be last) ──────────────────────────────────────
app.use(errorHandler);

module.exports = app;
