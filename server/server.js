const express = require('express');
const admin = require('firebase-admin');
const serviceAccount = require('./firebaseAdminConfig.json');
const bodyParser = require('body-parser');
const cors = require('cors');
const { sendPasswordSetupEmail } = require('./utils/emailService');
const { generatePasswordResetToken, verifyPasswordResetToken, hashPassword, comparePassword } = require('./utils/authService');
const jwt = require('jsonwebtoken');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

const port = 3000;

// Initialize Firebase Admin first
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Initialize Firestore after Firebase Admin is initialized
const db = admin.firestore();

app.use(cors());
app.use(bodyParser.json());

// Create new employee
app.post('/api/employees', async (req, res) => {
  try {
    const { name, email, phone, role, address } = req.body;

    const existingUser = await db.collection('users').where('email', '==', email).get();
    if (!existingUser.empty) {
      return res.status(400).json({ error: 'A user with this email already exists.' });
    }

    let userRecord;
    try {
      userRecord = await admin.auth().createUser({
        email,
        phoneNumber: phone,
        displayName: name,
        disabled: true,
      });
    } catch (authError) {
      if (authError.code === 'auth/email-already-exists') {
        return res.status(400).json({ error: 'The email address is already in use by another account.' });
      } else if (authError.code === 'auth/invalid-phone-number') {
        return res.status(400).json({ error: 'Invalid phone number format.' });
      } else {
        console.error('Firebase Auth error:', authError);
        return res.status(500).json({ error: 'Failed to create user in Firebase Auth.' });
      }
    }

    // Create Firestore user document
    const userRef = db.collection('users').doc(userRecord.uid);
    await userRef.set({
      name,
      email,
      phone,
      address,
      role: role || 'employee',
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Generate password setup token
    const token = generatePasswordResetToken(email);

    // Send password setup email
    const emailSent = await sendPasswordSetupEmail(email, token);
    if (!emailSent) {
      // If email fails, clean up user
      await admin.auth().deleteUser(userRecord.uid);
      await userRef.delete();
      return res.status(500).json({ error: 'Failed to send password setup email. User creation has been rolled back.' });
    }

    res.json({
      success: true,
      message: 'Employee created successfully. Password setup email sent.',
    });

  } catch (error) {
    console.error('Unhandled error creating employee:', error);

    // Optional: Show more detailed message in dev, generic in prod
    res.status(500).json({
      error: error.message || 'An unexpected error occurred while creating the employee.',
    });
  }
});


// Set password endpoint
app.post('/api/set-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Verify token
    const decoded = verifyPasswordResetToken(token);
    if (!decoded) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    const { email } = decoded;

    // Find user by email
    const userSnapshot = await db.collection('users').where('email', '==', email).get();
    if (userSnapshot.empty) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userDoc = userSnapshot.docs[0];
    const userId = userDoc.id;

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update user in Firebase Auth
    await admin.auth().updateUser(userId, {
      password: newPassword,
      disabled: false
    });

    // Update user in Firestore
    await userDoc.ref.update({
      status: 'active',
      password: hashedPassword,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({
      success: true,
      message: 'Password set successfully'
    });
  } catch (error) {
    console.error('Error setting password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/check-user', async (req, res) => {
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

// Login endpoint for regular users
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user by email in Firestore
    const userSnapshot = await db.collection('users').where('email', '==', email).get();

    if (userSnapshot.empty) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const userDoc = userSnapshot.docs[0];
    const userData = userDoc.data();

    // Check if user is active
    if (userData.status !== 'active') {
      return res.status(401).json({ error: 'Account is not active' });
    }

    // Verify password
    const isValidPassword = await comparePassword(password, userData.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Create JWT token
    const token = jwt.sign(
      {
        uid: userDoc.id,
        email: userData.email,
        role: userData.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return user data and token
    res.json({
      success: true,
      user: {
        id: userDoc.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        phone: userData.phone,
        address: userData.address
      },
      token
    });

  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Middleware to verify admin role
const verifyAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Xác thực token bằng Firebase Admin SDK
    const decodedToken = await admin.auth().verifyIdToken(token);
    const uid = decodedToken.uid;
    const userDoc = await db.collection('users').where('idAdmin', '==', uid).get();

    if (userDoc.empty) {
      return res.status(403).json({ error: 'Unauthorized: Admin access required (user not found)' });
    }

    const userData = userDoc.docs[0].data();

    if (userData.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized: Admin access required (not admin)' });
    }

    // Gắn thông tin user vào request để middleware/phía sau sử dụng
    req.user = { uid, ...userData };
    next();
  } catch (error) {
    console.error('Error verifying admin:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

const verifyUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];


    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    const uid = decodedToken.uid;
    const userDoc = await db.collection('users').where('idAdmin', '==', uid).get();

    if (userDoc.empty) {
      return res.status(403).json({ error: 'Unauthorized: User access required (user not found)' });
    }

    const userData = userDoc.docs[0].data();

    if (userData.role !== 'user') {
      return res.status(403).json({ error: 'Unauthorized: User access required (not user)' });
    }

    req.user = { uid, ...userData };
    next();
  } catch (error) {
    console.error('Error verifying user:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};


// Get all users (admin only)
app.get('/api/admin/users', verifyAdmin, async (req, res) => {
  try {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('role', '==', 'user').get();

    const users = [];
    snapshot.forEach(doc => {
      users.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update user (admin only)
app.put('/api/admin/users/:userId', verifyAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, email, phone, role, address, status } = req.body;

    // Check if user exists
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user in Firebase Auth if email changed
    const currentData = userDoc.data();
    if (email !== currentData.email) {
      await admin.auth().updateUser(userId, { email });
    }

    // Update user in Firestore
    const updateData = {
      ...(name && { name }),
      ...(email && { email }),
      ...(phone && { phone }),
      ...(role && { role }),
      ...(address && { address }),
      ...(status && { status }),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await userRef.update(updateData);

    res.json({
      success: true,
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user (admin only)
app.delete('/api/admin/users/:userId', verifyAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('userId', userId);

    // Check if user exists
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete user from Firestore
    await userRef.delete();

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/update-admin-id', async (req, res) => {
  try {
    const { phone, uid } = req.body;

    console.log('phone', phone);
    console.log('uid', uid);

    if (!phone || !uid) {
      return res.status(400).json({ error: 'Missing phone or uid' });
    }

    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('phone', '==', phone).get();

    if (snapshot.empty) {
      return res.status(404).json({ error: 'User not found with that phone number' });
    }

    const userDoc = snapshot.docs[0];

    await userDoc.ref.update({
      idAdmin: uid,
    });

    res.json({ message: 'idAdmin updated successfully', idAdmin: uid });
  } catch (error) {
    console.error('Error updating idAdmin:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/users/:userId/tasks', async (req, res) => {
  try {
    const { userId } = req.params;

    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const tasksSnapshot = await db.collection('users').doc(userId).collection('tasks').get();
    const tasks = tasksSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({ tasks });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
app.put('/api/users/:userId/tasks/:taskId', async (req, res) => {
  try {
    const { userId, taskId } = req.params;
    const { status } = req.body;

    const taskRef = db.collection('users').doc(userId).collection('tasks').doc(taskId);
    const taskDoc = await taskRef.get();

    if (!taskDoc.exists) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await taskRef.update({
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({
      success: true,
      message: 'Task updated successfully'
    });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function createAdminIfNotExists() {
  try {
    const adminUid = '04jwIQlfSadz69Fp3LDX7QRuQxo1';
    const adminPhone = '+84123456789';
    const adminName = 'Admin User';

    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('uid', '==', adminUid).get();

    if (!snapshot.empty) {
      console.log('Admin user already exists.');
      return;
    }

    await usersRef.add({
      uid: adminUid,
      phone: adminPhone,
      name: adminName,
      role: 'admin',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('Admin user created successfully.');
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
}

// Gọi hàm khi server start
createAdminIfNotExists();

// Get all tasks for a specific user (admin only)
app.get('/api/users/:userId/tasks', verifyAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user exists
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get all tasks for the user
    const tasksSnapshot = await db.collection('users').doc(userId).collection('tasks').get();
    const tasks = tasksSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({ tasks });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new task for a user (admin only)
app.post('/api/users/:userId/tasks', verifyAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { title, description, status } = req.body;

    // Validate required fields
    if (!title || !description || !status) {
      return res.status(400).json({ error: 'Title, description and status are required' });
    }

    // Validate status
    const validStatuses = ['pending', 'in_progress', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    // Check if user exists
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create new task
    const taskRef = await db.collection('users').doc(userId).collection('tasks').add({
      title,
      description,
      status,
    });

    // Get the created task
    const taskDoc = await taskRef.get();

    res.status(201).json({
      success: true,
      task: {
        id: taskDoc.id,
        ...taskDoc.data()
      }
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a task (admin only)
app.put('/api/users/:userId/tasks/:taskId', verifyAdmin, async (req, res) => {
  try {
    const { userId, taskId } = req.params;
    const { title, description, status } = req.body;

    // Validate required fields
    if (!title || !description || !status) {
      return res.status(400).json({ error: 'Title, description and status are required' });
    }

    // Validate status
    const validStatuses = ['pending', 'in_progress', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    // Check if user exists
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if task exists
    const taskRef = db.collection('users').doc(userId).collection('tasks').doc(taskId);
    const taskDoc = await taskRef.get();
    if (!taskDoc.exists) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Update task
    await taskRef.update({
      title,
      description,
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Get updated task
    const updatedTaskDoc = await taskRef.get();

    res.json({
      success: true,
      task: {
        id: updatedTaskDoc.id,
        ...updatedTaskDoc.data()
      }
    });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a task (admin only)
app.delete('/api/users/:userId/tasks/:taskId', verifyAdmin, async (req, res) => {
  try {
    const { userId, taskId } = req.params;

    // Check if user exists
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if task exists
    const taskRef = db.collection('users').doc(userId).collection('tasks').doc(taskId);
    const taskDoc = await taskRef.get();
    if (!taskDoc.exists) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Delete task
    await taskRef.delete();

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Join user's room
  socket.on('joinRoom', ({ userId, role }) => {
    if (role === 'admin') {
      socket.join('admin'); // Admin joins 'admin' room
    } else {
      socket.join(userId); // User joins their own room
    }
    console.log(`User ${userId} (${role}) joined their room`);
  });

  // Handle sending messages
  socket.on('sendMessage', async ({ chatId, message, receiverId }) => {
    try {
      // Save message to Firestore
      const chatRef = db.collection('chats').doc(chatId);
      await chatRef.set({
        participants: chatId.split('_').filter(id => id !== 'admin'),
        lastMessage: message,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      const messagesRef = chatRef.collection('messages');
      await messagesRef.add({
        ...message,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Emit to receiver based on their role
      if (receiverId === 'admin') {
        io.to('admin').emit('receiveMessage', { chatId, message });
      } else {
        io.to(receiverId).emit('receiveMessage', { chatId, message });
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Get messages for a chat
app.get('/api/messages/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params;
    const messagesRef = db.collection('chats').doc(chatId).collection('messages');
    const snapshot = await messagesRef.orderBy('timestamp', 'asc').get();

    const messages = [];
    snapshot.forEach(doc => {
      messages.push(doc.data());
    });

    res.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Save a new message
app.post('/api/messages', async (req, res) => {
  try {
    const { chatId, message } = req.body;
    const chatRef = db.collection('chats').doc(chatId);
    const messagesRef = chatRef.collection('messages');

    // Save message
    await messagesRef.add({
      ...message,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Update chat metadata
    await chatRef.set({
      participants: chatId.split('_').filter(id => id !== 'admin'),
      lastMessage: message,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving message:', error);
    res.status(500).json({ error: 'Failed to save message' });
  }
});

// Change app.listen to server.listen
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});