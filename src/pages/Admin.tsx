import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { collection, query, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { User, Trash2, Shield, ShieldOff } from 'lucide-react';

interface UserData {
  id: string;
  name: string;
  email: string;
  username: string;
  role: 'admin' | 'user';
  createdAt: string;
}

export const Admin: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersRef = collection(db, 'users');
        const querySnapshot = await getDocs(usersRef);
        const usersData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as UserData[];
        setUsers(usersData);
      } catch (err) {
        console.error('Error fetching users:', err);
        setError('Failed to fetch users');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleToggleAdmin = async (userId: string, currentRole: string) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        role: currentRole === 'admin' ? 'user' : 'admin'
      });

      setUsers(users.map(user => 
        user.id === userId 
          ? { ...user, role: currentRole === 'admin' ? 'user' : 'admin' }
          : user
      ));
    } catch (err) {
      console.error('Error updating user role:', err);
      setError('Failed to update user role');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      await deleteDoc(doc(db, 'users', userId));
      setUsers(users.filter(user => user.id !== userId));
    } catch (err) {
      console.error('Error deleting user:', err);
      setError('Failed to delete user');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Admin Dashboard
          </h1>
          <button
            onClick={() => navigate('/')}
            className="text-gray-600 hover:text-gray-900 dark:text-gray-300 
              dark:hover:text-white"
          >
            Back to Home
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 
            dark:text-red-400 rounded-lg">
            {error}
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 
                    dark:text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 
                    dark:text-gray-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 
                    dark:text-gray-400 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 
                    dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 
                dark:divide-gray-700">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 
                            dark:bg-blue-900 flex items-center justify-center">
                            <User className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 
                            dark:text-white">
                            {user.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.role === 'admin'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 
                      dark:text-gray-400">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleToggleAdmin(user.id, user.role)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 
                          dark:hover:text-blue-300 mr-4"
                      >
                        {user.role === 'admin' ? (
                          <ShieldOff className="h-5 w-5" />
                        ) : (
                          <Shield className="h-5 w-5" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 
                          dark:hover:text-red-300"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}; 