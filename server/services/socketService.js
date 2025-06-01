const { admin, db } = require('../config/firebase');
const chatService = require('./chatService');

const initializeSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('joinRoom', ({ userId, role }) => {
      if (role === 'admin') {
        socket.join('admin');
      } else {
        socket.join(userId);
      }
      console.log(`User ${userId} (${role}) joined their room`);
    });

    socket.on('sendMessage', async ({ chatId, message, receiverId }) => {
      try {
        await chatService.saveMessage({ chatId, message });

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
};

module.exports = {
  initializeSocketHandlers
}; 