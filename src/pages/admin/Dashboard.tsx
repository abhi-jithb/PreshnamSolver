import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where, updateDoc, doc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Users, MessageSquare, AlertTriangle, Search, MoreVertical, Ban, CheckCircle, Trash2, Edit2, Save, X } from 'lucide-react';

interface User {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  address?: string;
  lastActive?: string;
  status: 'active' | 'suspended' | 'pending';
  role?: 'admin' | 'user';
  createdAt?: string;
}

interface Feedback {
  id: string;
  userId: string;
  message: string;
  createdAt: string;
  userEmail?: string;
}

export const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [emergencyAlerts, setEmergencyAlerts] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch users
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const usersData = usersSnapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data(),
          status: doc.data().status || 'active'
        } as User));

        // Fetch feedback with user emails
        const feedbackSnapshot = await getDocs(query(
          collection(db, 'feedback'),
          orderBy('createdAt', 'desc')
        ));
        
        const feedbackData = await Promise.all(
          feedbackSnapshot.docs.map(async (doc) => {
            const feedbackDoc = { id: doc.id, ...doc.data() } as Feedback;
            if (feedbackDoc.userId) {
              const userDoc = await getDocs(query(
                collection(db, 'users'),
                where('__name__', '==', feedbackDoc.userId)
              ));
              if (!userDoc.empty) {
                feedbackDoc.userEmail = userDoc.docs[0].data().email;
              }
            }
            return feedbackDoc;
          })
        );

        // Fetch active emergency alerts
        const alertsSnapshot = await getDocs(
          query(collection(db, 'emergencyAlerts'), where('status', '==', 'active'))
        );

        setUsers(usersData);
        setFeedback(feedbackData);
        setEmergencyAlerts(alertsSnapshot.size);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleUserAction = async (userId: string, action: 'suspend' | 'activate' | 'delete' | 'edit') => {
    try {
      if (action === 'delete') {
        await deleteDoc(doc(db, 'users', userId));
        setUsers(users.filter(user => user.id !== userId));
      } else if (action === 'edit') {
        const user = users.find(u => u.id === userId);
        if (user) {
          setEditingUser(user);
        }
      } else {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          status: action === 'suspend' ? 'suspended' : 'active',
          lastUpdated: new Date().toISOString()
        });
        setUsers(users.map(user => 
          user.id === userId 
            ? { ...user, status: action === 'suspend' ? 'suspended' : 'active' }
            : user
        ));
      }
      setSelectedUser(null);
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const handleSaveUserEdit = async () => {
    if (!editingUser) return;

    try {
      const userRef = doc(db, 'users', editingUser.id);
      await updateDoc(userRef, {
        name: editingUser.name,
        phone: editingUser.phone,
        address: editingUser.address,
        lastUpdated: new Date().toISOString()
      });

      setUsers(users.map(user => 
        user.id === editingUser.id ? editingUser : user
      ));
      setEditingUser(null);
    } catch (error) {
      console.error('Error saving user edit:', error);
    }
  };

  const handleDeleteFeedback = async (feedbackId: string) => {
    try {
      await deleteDoc(doc(db, 'feedback', feedbackId));
      setFeedback(feedback.filter(f => f.id !== feedbackId));
    } catch (error) {
      console.error('Error deleting feedback:', error);
    }
  };

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">
          Admin Dashboard
        </h1>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-blue-500 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Total Users
                </h3>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {users.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center">
              <MessageSquare className="w-8 h-8 text-green-500 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Total Feedback
                </h3>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {feedback.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center">
              <AlertTriangle className="w-8 h-8 text-red-500 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Active Alerts
                </h3>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {emergencyAlerts}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Users Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-8">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Users Management
            </h2>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b dark:border-gray-700">
                    <th className="text-left py-3 px-4">Name</th>
                    <th className="text-left py-3 px-4">Email</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Role</th>
                    <th className="text-left py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b dark:border-gray-700">
                      <td className="py-3 px-4">
                        {editingUser?.id === user.id ? (
                          <input
                            type="text"
                            value={editingUser.name || ''}
                            onChange={(e) => setEditingUser({...editingUser, name: e.target.value})}
                            className="p-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                          />
                        ) : (
                          user.name
                        )}
                      </td>
                      <td className="py-3 px-4">{user.email}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          user.status === 'active' ? 'bg-green-100 text-green-800' :
                          user.status === 'suspended' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {user.role || 'user'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          {editingUser?.id === user.id ? (
                            <>
                              <button
                                onClick={handleSaveUserEdit}
                                className="text-green-600 hover:text-green-800"
                              >
                                <Save className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => setEditingUser(null)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleUserAction(user.id, 'edit')}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <Edit2 className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleUserAction(user.id, user.status === 'active' ? 'suspend' : 'activate')}
                                className={user.status === 'active' ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'}
                              >
                                {user.status === 'active' ? <Ban className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                              </button>
                              <button
                                onClick={() => handleUserAction(user.id, 'delete')}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Feedback Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              User Feedback
            </h2>
            <div className="space-y-4">
              {feedback.map((item) => (
                <div key={item.id} className="border-b dark:border-gray-700 pb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        From: {item.userEmail || 'Unknown User'}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-500">
                        {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteFeedback(item.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="mt-2 text-gray-900 dark:text-white">
                    {item.message}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};