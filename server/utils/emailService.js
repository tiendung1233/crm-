const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendPasswordSetupEmail = async (email, token) => {
  const resetLink = `${process.env.FRONTEND_URL}/set-password?token=${token}`;

  const mailOptions = {
    from: `"Heni Admin" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Welcome to Heni - Set Your Password',
    html: `
      <h1>Welcome to Heni!</h1>
      <p>Your account has been created. Please click the link below to set your password:</p>
      <a href="${resetLink}" style="
        display: inline-block;
        padding: 10px 20px;
        background-color: #2C7BE5;
        color: white;
        text-decoration: none;
        border-radius: 5px;
        margin: 20px 0;
      ">Set Password</a>
      <p>This link will expire in 15 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

module.exports = {
  sendPasswordSetupEmail,
}; 