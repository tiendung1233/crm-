const { admin, db } = require('../config/firebase');

const getUserTasks = async (userId) => {
  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) {
    throw new Error('User not found');
  }

  const tasksSnapshot = await db.collection('users').doc(userId).collection('tasks').get();
  const tasks = tasksSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  return { tasks };
};

const createTask = async (userId, { title, description, status }) => {
  if (!title || !description || !status) {
    throw new Error('Title, description and status are required');
  }

  const validStatuses = ['pending', 'in_progress', 'completed'];
  if (!validStatuses.includes(status)) {
    throw new Error('Invalid status value');
  }

  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) {
    throw new Error('User not found');
  }

  const taskRef = await db.collection('users').doc(userId).collection('tasks').add({
    title,
    description,
    status,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  const taskDoc = await taskRef.get();
  return {
    success: true,
    task: {
      id: taskDoc.id,
      ...taskDoc.data()
    }
  };
};

const updateTask = async (userId, taskId, { title, description, status }) => {
  if (!title || !description || !status) {
    throw new Error('Title, description and status are required');
  }

  const validStatuses = ['pending', 'in_progress', 'completed'];
  if (!validStatuses.includes(status)) {
    throw new Error('Invalid status value');
  }

  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) {
    throw new Error('User not found');
  }

  const taskRef = db.collection('users').doc(userId).collection('tasks').doc(taskId);
  const taskDoc = await taskRef.get();
  if (!taskDoc.exists) {
    throw new Error('Task not found');
  }

  await taskRef.update({
    title,
    description,
    status,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  const updatedTaskDoc = await taskRef.get();
  return {
    success: true,
    task: {
      id: updatedTaskDoc.id,
      ...updatedTaskDoc.data()
    }
  };
};

const deleteTask = async (userId, taskId) => {
  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) {
    throw new Error('User not found');
  }

  const taskRef = db.collection('users').doc(userId).collection('tasks').doc(taskId);
  const taskDoc = await taskRef.get();
  if (!taskDoc.exists) {
    throw new Error('Task not found');
  }

  await taskRef.delete();
  return { success: true, message: 'Task deleted successfully' };
};

module.exports = {
  getUserTasks,
  createTask,
  updateTask,
  deleteTask
}; 