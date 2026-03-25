'use strict';

const express = require('express');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createTaskSchema, updateTaskSchema } = require('../validators/task.validator');
const Task = require('../models/Task');

const router = express.Router();
router.use(auth);

// GET /api/tasks
router.get('/', async (req, res, next) => {
  try {
    const tasks = await Task.find({ weddingId: req.weddingId }).sort({ dueDate: 1 });
    res.json(tasks);
  } catch (err) { next(err); }
});

// POST /api/tasks
router.post('/', validate(createTaskSchema), async (req, res, next) => {
  try {
    const data = { ...req.body, weddingId: req.weddingId };
    if (data.dueDate) data.dueDate = new Date(data.dueDate);
    const task = await Task.create(data);
    res.status(201).json(task);
  } catch (err) { next(err); }
});

// PATCH /api/tasks/:id
router.patch('/:id', validate(updateTaskSchema), async (req, res, next) => {
  try {
    const updates = { ...req.body };
    if (updates.dueDate) updates.dueDate = new Date(updates.dueDate);

    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, weddingId: req.weddingId },
      { $set: updates },
      { new: true }
    );
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json(task);
  } catch (err) { next(err); }
});

// DELETE /api/tasks/:id — hard delete (tasks have no audit requirement)
router.delete('/:id', async (req, res, next) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, weddingId: req.weddingId });
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json({ message: 'Task deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
