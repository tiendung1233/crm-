import React, { useState, useEffect } from 'react';
import axios from 'axios';
import CreateEmployeeModal from '../../components/CreateEmployeeModal';
// import EditEmployeeModal from '../../components/EditEmployeeModal';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';

interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  address: string;
  status: string;
}

const Employees = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
  const fetchEmployees = async () => {

    const auth = getAuth();

    onAuthStateChanged(auth, async (user: User | null) => {
      if (user) {
        try {
          const idToken = await getCurrentUserToken();

          const response = await axios.get('http://localhost:3000/api/admin/users', {
            headers: {
              Authorization: `Bearer ${idToken}`
            }
          });

          setEmployees(response.data.users);
        } catch (err: any) {
          setError(err.response?.data?.error || 'Failed to fetch employees');
        } finally {
          setLoading(false);
        }
      } else {
        setError('User not logged in');
        setLoading(false);
      }
    });
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleEdit = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (employeeId: string) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) {
      return;
    }

    try {
      const idToken = await getCurrentUserToken();

      await axios.delete(`http://localhost:3000/api/admin/users/${employeeId}`, {
        headers: {
          Authorization: `Bearer ${idToken}`
        }
      });
      // Refresh the employee list
      fetchEmployees();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete employee');
    }
  };

  const handleEditSuccess = () => {
    setIsEditModalOpen(false);
    setSelectedEmployee(null);
    fetchEmployees();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-semibold text-gray-900">Manage Employee</h1>
          <span className="text-gray-600">{employees.length} Employees</span>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Create Employee
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {/* Table Section */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Employee Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Phone
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {employees.map((employee) => (
              <tr key={employee.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{employee.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{employee.phone}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{employee.role}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${employee.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : employee.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                    }`}>
                    {employee.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button
                    onClick={() => handleEdit(employee)}
                    className="bg-[#2C7BE5] text-white px-3 py-1 rounded-md hover:bg-[#2C7BE5]/90 mr-3"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(employee.id)}
                    className="bg-[#EA5656] text-white px-3 py-1 rounded-md hover:bg-[#EA5656]/90"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      <CreateEmployeeModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      // onSuccess={() => {
      //   setIsCreateModalOpen(false);
      //   fetchEmployees();
      // }}
      />

      {/* Edit Modal */}
      {selectedEmployee && (
        <div>
          <h1>Edit Employee</h1>
        </div>
        // <EditEmployeeModal
        //   isOpen={isEditModalOpen}
        //   onClose={() => {
        //     setIsEditModalOpen(false);
        //     setSelectedEmployee(null);
        //   }}
        //   employee={selectedEmployee}
        //   onSuccess={handleEditSuccess}
        // />
      )}
    </div>
  );
};

export default Employees;