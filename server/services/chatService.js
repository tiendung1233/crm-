const { admin, db } = require('../config/firebase');

const getMessages = async (chatId) => {
  const messagesRef = db.collection('chats').doc(chatId).collection('messages');
  const snapshot = await messagesRef.orderBy('timestamp', 'asc').get();

  const messages = [];
  snapshot.forEach(doc => {
    messages.push(doc.data());
  });

  return { messages };
};

const saveMessage = async ({ chatId, message }) => {
  const chatRef = db.collection('chats').doc(chatId);
  const messagesRef = chatRef.collection('messages');

  await messagesRef.add({
    ...message,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  await chatRef.set({
    participants: chatId.split('_').filter(id => id !== 'admin'),
    lastMessage: message,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  return { success: true };
};

module.exports = {
  getMessages,
  saveMessage
}; 