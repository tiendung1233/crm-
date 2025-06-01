const { admin, db } = require('../config/firebase');

const verifyAdmin = async (req, res, next) => {
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
      return res.status(403).json({ error: 'Unauthorized: Admin access required (user not found)' });
    }

    const userData = userDoc.docs[0].data();

    if (userData.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized: Admin access required (not admin)' });
    }

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

module.exports = {
  verifyAdmin,
  verifyUser
}; 