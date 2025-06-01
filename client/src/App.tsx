import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Verify from './pages/Verify';
import Dashboard from './pages/admin/Dashboard';
import Employees from './pages/admin/Employees';
import Tasks from './pages/admin/Tasks';
import Messages from './pages/admin/Messages';
import './App.css';
import SetPassword from './pages/SetPassword';
import LoginUsers from './pages/users/Login';
import DashboardUsers from './pages/users/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import UserTasks from './pages/admin/UserTasks';
import Task from './pages/users/Task';
import MessagesUser from './pages/users/Messages';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <div className="min-h-screen bg-gray-100">
            <main className="mx-50 ">
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/verify" element={<Verify />} />
                <Route path="/set-password" element={<SetPassword />} />

                {/* Admin routes */}
                <Route path="/admin" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Dashboard />
                  </ProtectedRoute>
                }>
                  <Route path="employees" element={<Employees />} />
                  <Route path="tasks" element={<Tasks />} />
                  <Route path="messages" element={<Messages />} />
                  <Route path="tasks/:userId" element={<UserTasks />} />
                </Route>

                {/* User routes */}
                <Route path="/user" element={
                  <ProtectedRoute allowedRoles={['user']}>
                    <DashboardUsers />
                  </ProtectedRoute>
                }>
                  <Route path="tasks" element={<Task />} />
                  <Route path="messages" element={<MessagesUser />} />
                </Route>

                <Route path="/login-users" element={
                  <LoginUsers />
                } />
              </Routes>
            </main>
          </div>
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
