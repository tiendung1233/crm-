const express = require('express');
const router = express.Router();
const { verifyUser } = require('../middleware/auth');
const taskService = require('../services/taskService');

router.get('/:userId/tasks', verifyUser, async (req, res) => {
  try {
    const result = await taskService.getUserTasks(req.params.userId);
    res.json(result);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

router.put('/:userId/tasks/:taskId', verifyUser, async (req, res) => {
  try {
    const { status } = req.body;
    const result = await taskService.updateTask(req.params.userId, req.params.taskId, { status });
    res.json(result);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

module.exports = router; 