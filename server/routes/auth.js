const express = require('express');
const router = express.Router();
const userService = require('../services/userService');

router.post('/employees', async (req, res) => {
  try {
    const result = await userService.createEmployee(req.body);
    res.json(result);
  } catch (error) {
    console.error('Unhandled error creating employee:', error);
    res.status(500).json({
      error: error.message || 'An unexpected error occurred while creating the employee.',
    });
  }
});

router.post('/set-password', async (req, res) => {
  try {
    const result = await userService.setPassword(req.body);
    res.json(result);
  } catch (error) {
    console.error('Error setting password:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

router.post('/check-user', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('phone', '==', phoneNumber).get();

    if (snapshot.empty) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();

    if (userData.role !== 'admin' && userData.rule !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    const customToken = await admin.auth().createCustomToken(userDoc.id, {
      role: 'admin'
    });

    res.json({
      exists: true,
      isAdmin: true,
      customToken,
      userId: userDoc.id,
      name: userData.name,
      role: userData.role,
      phone: userData.phone,
    });
  } catch (error) {
    console.error('Error checking user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const result = await userService.login(req.body);
    res.json(result);
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

router.post('/update-admin-id', async (req, res) => {
  try {
    const result = await userService.updateAdminId(req.body);
    res.json(result);
  } catch (error) {
    console.error('Error updating idAdmin:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

module.exports = router; 