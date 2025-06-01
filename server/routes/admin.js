const express = require('express');
const router = express.Router();
const { verifyAdmin } = require('../middleware/auth');
const userService = require('../services/userService');
const taskService = require('../services/taskService');

router.get('/users', verifyAdmin, async (req, res) => {
  try {
    const result = await userService.getAllUsers();
    res.json(result);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch users' });
  }
});

router.put('/users/:userId', verifyAdmin, async (req, res) => {
  try {
    const result = await userService.updateUser(req.params.userId, req.body);
    res.json(result);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

router.delete('/users/:userId', verifyAdmin, async (req, res) => {
  try {
    const result = await userService.deleteUser(req.params.userId);
    res.json(result);
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

router.get('/users/:userId/tasks', verifyAdmin, async (req, res) => {
  try {
    const result = await taskService.getUserTasks(req.params.userId);
    res.json(result);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

router.post('/users/:userId/tasks', verifyAdmin, async (req, res) => {
  try {
    const result = await taskService.createTask(req.params.userId, req.body);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

router.put('/users/:userId/tasks/:taskId', verifyAdmin, async (req, res) => {
  try {
    const result = await taskService.updateTask(req.params.userId, req.params.taskId, req.body);
    res.json(result);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

router.delete('/users/:userId/tasks/:taskId', verifyAdmin, async (req, res) => {
  try {
    const result = await taskService.deleteTask(req.params.userId, req.params.taskId);
    res.json(result);
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

module.exports = router; 