import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { auth } from '../../firebaseConfig';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: string;
  updatedAt: string;
}

const UserTasks = () => {
  const { userId } = useParams<{ userId: string }>();
  console.log('userId', userId);
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'pending' | 'in_progress' | 'completed'>('pending');

  const getCurrentUserToken = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      const auth = getAuth();
      onAuthStateChanged(auth, async (user: User | null) => {
        if (user) {
          const token = await user.getIdToken();
          resolve(token);
        } else {
          reject('User not logged in');
        }
      });
    });
  };
  const fetchUserAndTasks = async () => {
    try {
      const auth = getAuth();
      onAuthStateChanged(auth, async (user: User | null) => {
        if (user) {
          const idToken = await getCurrentUserToken();
          const tasksResponse = await axios.get(`http://localhost:3000/api/users/${userId}/tasks`, {
            headers: { Authorization: `Bearer ${idToken}` }
          })
          setTasks(tasksResponse.data.tasks);
        }
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserAndTasks();
  }, [userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (editingTask) {
        setLoadingTaskId(editingTask.id);
        await axios.put(
          `http://localhost:3000/api/users/${userId}/tasks/${editingTask.id}`,
          { title, description, status },
          { headers: { Authorization: `Bearer ${idToken}` } }
        );
      } else {
        // Create new task
        await axios.post(
          `http://localhost:3000/api/users/${userId}/tasks`,
          { title, description, status },
          { headers: { Authorization: `Bearer ${idToken}` } }
        );
      }
      setShowAddModal(false);
      setEditingTask(null);
      resetForm();
      await fetchUserAndTasks();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save task');
    } finally {
      setSubmitting(false);
      setLoadingTaskId(null);
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    setDeletingTaskId(taskId);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      await axios.delete(
        `http://localhost:3000/api/users/${userId}/tasks/${taskId}`,
        { headers: { Authorization: `Bearer ${idToken}` } }
      );
      await fetchUserAndTasks();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete task');
    } finally {
      setDeletingTaskId(null);
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description);
    setStatus(task.status);
    setShowAddModal(true);
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setStatus('pending');
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600">Loading tasks...</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <button
            onClick={() => navigate('/admin/tasks')}
            className="text-blue-600 hover:text-blue-900 mb-2"
          >
            ← Back to Users
          </button>
          <h1 className="text-2xl font-semibold text-gray-900">
          </h1>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingTask(null);
            setShowAddModal(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Add New Task
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {/* Tasks List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow relative ${(deletingTaskId === task.id || loadingTaskId === task.id) ? 'opacity-50' : ''
              }`}
          >
            {(deletingTaskId === task.id || loadingTaskId === task.id) && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-lg">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
              <span
                className={`px-2 py-1 text-xs font-semibold rounded-full ${task.status === 'completed'
                  ? 'bg-green-100 text-green-800'
                  : task.status === 'in_progress'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                  }`}
              >
                {task.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-gray-600 mb-4">{task.description}</p>
            <div className="flex justify-between items-center text-sm text-gray-500">
              <div>
                Created: {new Date(task.createdAt).toLocaleDateString()}
              </div>
              <div className="space-x-2">
                <button
                  onClick={() => handleEdit(task)}
                  disabled={deletingTaskId === task.id || loadingTaskId === task.id}
                  className={`text-blue-600 hover:text-blue-900 ${(deletingTaskId === task.id || loadingTaskId === task.id) ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(task.id)}
                  disabled={deletingTaskId === task.id || loadingTaskId === task.id}
                  className={`text-red-600 hover:text-red-900 ${(deletingTaskId === task.id || loadingTaskId === task.id) ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
            {submitting && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-lg">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}
            <h2 className="text-xl font-semibold mb-4">
              {editingTask ? 'Edit Task' : 'Add New Task'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Task['status'])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                    setEditingTask(null);
                  }}
                  disabled={submitting}
                  className={`px-4 py-2 text-gray-700 hover:text-gray-900 ${submitting ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 ${submitting ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                >
                  {editingTask ? 'Update Task' : 'Add Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserTasks; 