const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const generatePasswordResetToken = (email) => {
  return jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '15m' });
};

const verifyPasswordResetToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

const comparePassword = async (password, hashedPassword) => {
  return bcrypt.compare(password, hashedPassword);
};

module.exports = {
  generatePasswordResetToken,
  verifyPasswordResetToken,
  hashPassword,
  comparePassword,
}; 