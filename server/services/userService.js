const { admin, db } = require('../config/firebase');
const { generatePasswordResetToken, hashPassword, comparePassword } = require('../utils/authService');
const { sendPasswordSetupEmail } = require('../utils/emailService');
const jwt = require('jsonwebtoken');

const createEmployee = async ({ name, email, phone, role, address }) => {
  const existingUser = await db.collection('users').where('email', '==', email).get();
  if (!existingUser.empty) {
    throw new Error('A user with this email already exists.');
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
      throw new Error('The email address is already in use by another account.');
    } else if (authError.code === 'auth/invalid-phone-number') {
      throw new Error('Invalid phone number format.');
    }
    throw new Error('Failed to create user in Firebase Auth.');
  }

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

  const token = generatePasswordResetToken(email);
  const emailSent = await sendPasswordSetupEmail(email, token);

  if (!emailSent) {
    await admin.auth().deleteUser(userRecord.uid);
    await userRef.delete();
    throw new Error('Failed to send password setup email. User creation has been rolled back.');
  }

  return { success: true, message: 'Employee created successfully. Password setup email sent.' };
};

const setPassword = async ({ token, newPassword }) => {
  const decoded = verifyPasswordResetToken(token);
  if (!decoded) {
    throw new Error('Invalid or expired token');
  }

  const { email } = decoded;
  const userSnapshot = await db.collection('users').where('email', '==', email).get();
  if (userSnapshot.empty) {
    throw new Error('User not found');
  }

  const userDoc = userSnapshot.docs[0];
  const userId = userDoc.id;
  const hashedPassword = await hashPassword(newPassword);

  await admin.auth().updateUser(userId, {
    password: newPassword,
    disabled: false
  });

  await userDoc.ref.update({
    status: 'active',
    password: hashedPassword,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return { success: true, message: 'Password set successfully' };
};

const login = async ({ email, password }) => {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  const userSnapshot = await db.collection('users').where('email', '==', email).get();
  if (userSnapshot.empty) {
    throw new Error('Invalid email or password');
  }

  const userDoc = userSnapshot.docs[0];
  const userData = userDoc.data();

  if (userData.status !== 'active') {
    throw new Error('Account is not active');
  }

  const isValidPassword = await comparePassword(password, userData.password);
  if (!isValidPassword) {
    throw new Error('Invalid email or password');
  }

  const token = jwt.sign(
    {
      uid: userDoc.id,
      email: userData.email,
      role: userData.role
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  return {
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
  };
};

const getAllUsers = async () => {
  const usersRef = db.collection('users');
  const snapshot = await usersRef.where('role', '==', 'user').get();

  const users = [];
  snapshot.forEach(doc => {
    users.push({
      id: doc.id,
      ...doc.data()
    });
  });

  return { users };
};

const updateUser = async (userId, { name, email, phone, role, address, status }) => {
  const userRef = db.collection('users').doc(userId);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    throw new Error('User not found');
  }

  const currentData = userDoc.data();
  if (email !== currentData.email) {
    await admin.auth().updateUser(userId, { email });
  }

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
  return { success: true, message: 'User updated successfully' };
};

const deleteUser = async (userId) => {
  const userRef = db.collection('users').doc(userId);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    throw new Error('User not found');
  }

  await userRef.delete();
  return { success: true, message: 'User deleted successfully' };
};

const updateAdminId = async ({ phone, uid }) => {
  if (!phone || !uid) {
    throw new Error('Missing phone or uid');
  }

  const usersRef = db.collection('users');
  const snapshot = await usersRef.where('phone', '==', phone).get();

  if (snapshot.empty) {
    throw new Error('User not found with that phone number');
  }

  const userDoc = snapshot.docs[0];
  await userDoc.ref.update({
    idAdmin: uid,
  });

  return { message: 'idAdmin updated successfully', idAdmin: uid };
};

const createAdminIfNotExists = async () => {
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
};

module.exports = {
  createEmployee,
  setPassword,
  login,
  getAllUsers,
  updateUser,
  deleteUser,
  updateAdminId,
  createAdminIfNotExists
}; 