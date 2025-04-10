import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, User, UserPlus, Search, Bell, Plus, X, AlertCircle, MapPin, Phone, Mail, Eye, EyeOff, Coffee, Info, LogOut, Users } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query as firestoreQuery, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  getDoc, 
  query 
} from 'firebase/firestore';

interface EmergencyAlert {
  id: string;
  userId: string;
  userName: string;
  userUsername: string;
  type: 'sos';
  status: 'active' | 'resolved';
  createdAt: string;
  location: string;
  friends: {
    id: string;
    name: string;
    username: string;
  }[];
  resolvedAt?: string;
  resolvedBy?: string;
}

interface UserSearch {
  id: string;
  username: string;
  name: string;
  matchType: 'username' | 'name';
}

interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  fromUserName: string;
  toUserName: string;
  fromUserUsername: string;
  toUserUsername: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  createdAt: string;
}

interface Friend {
  id: string;
  friendId: string;
  friendName: string;
  friendUsername: string;
  status: 'pending' | 'accepted';
  createdAt: string;
}

interface UserData {
  username: string;
  name: string;
}

// Add debounce function
const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const [showSosModal, setShowSosModal] = useState(false);
  const [activeAlerts, setActiveAlerts] = useState<EmergencyAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearch[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [alertAudio, setAlertAudio] = useState<HTMLAudioElement | null>(null);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);

  // Fetch active alerts
  useEffect(() => {
    if (!auth.currentUser) return;

    const alertsRef = collection(db, 'alerts');
    const q = firestoreQuery(
      alertsRef,
      where('status', '==', 'active')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const alertsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as EmergencyAlert[];
      setActiveAlerts(alertsData);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    fetchSentRequests();
  }, []);

  const fetchSentRequests = async () => {
    if (!auth.currentUser) return;

    try {
      const requestsRef = collection(db, 'friendRequests');
      const q = query(
        requestsRef,
        where('fromUserId', '==', auth.currentUser.uid),
        where('status', '==', 'pending')
      );

      const querySnapshot = await getDocs(q);
      const requests = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toISOString() || new Date().toISOString()
      })) as FriendRequest[];

      setSentRequests(requests);
    } catch (err) {
      console.error('Error fetching sent requests:', err);
    }
  };

  // Fetch friend requests
  useEffect(() => {
    if (!auth.currentUser) return;

    const requestsRef = collection(db, 'friendRequests');
    const q = firestoreQuery(
      requestsRef,
      where('toUserId', '==', auth.currentUser.uid),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FriendRequest[];
      setFriendRequests(requests);
    });

    return () => unsubscribe();
  }, [auth.currentUser]);

  // Debounced search function
  const debouncedSearch = React.useCallback(
    debounce(async (query: string) => {
      if (!query.trim() || !auth.currentUser) return;

      setIsSearching(true);
      setError(null);

      try {
        const usersRef = collection(db, 'users');
        const searchTerm = query.toLowerCase();

        // Query for username matches
        const usernameQuery = firestoreQuery(
          usersRef,
          where('username', '>=', searchTerm),
          where('username', '<=', searchTerm + '\uf8ff')
        );

        // Query for name matches
        const nameQuery = firestoreQuery(
          usersRef,
          where('name', '>=', searchTerm),
          where('name', '<=', searchTerm + '\uf8ff')
        );

        const [usernameSnapshot, nameSnapshot] = await Promise.all([
          getDocs(usernameQuery),
          getDocs(nameQuery)
        ]);

        // Combine and deduplicate results
        const results = new Map();
        
        [...usernameSnapshot.docs, ...nameSnapshot.docs].forEach(doc => {
          const userData = doc.data() as UserData;
          if (!results.has(doc.id) && doc.id !== auth.currentUser?.uid) {
            results.set(doc.id, {
              id: doc.id,
              username: userData.username,
              name: userData.name,
              matchType: userData.username.toLowerCase().includes(searchTerm) 
                ? 'username' 
                : 'name'
            });
          }
        });

        const searchResults = Array.from(results.values());
        
        // Sort results by relevance (exact matches first, then partial matches)
        searchResults.sort((a, b) => {
          const aExactMatch = a.username.toLowerCase() === searchTerm || 
            a.name.toLowerCase() === searchTerm;
          const bExactMatch = b.username.toLowerCase() === searchTerm || 
            b.name.toLowerCase() === searchTerm;
          
          if (aExactMatch && !bExactMatch) return -1;
          if (!aExactMatch && bExactMatch) return 1;
          
          // If both are exact matches or both are partial matches, sort by name
          return a.name.localeCompare(b.name);
        });

        setSearchResults(searchResults);
      } catch (err) {
        console.error('Error searching users:', err);
        setError('Failed to search users');
      } finally {
        setIsSearching(false);
      }
    }, 300),
    []
  );

  // Update search query and trigger search
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    debouncedSearch(query);
  };

  const handleAddFriend = async (userId: string) => {
    if (!auth.currentUser) return;

    try {
      // Get current user data
      const currentUserDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (!currentUserDoc.exists()) {
        setError('Your profile data not found');
        return;
      }
      const currentUserData = currentUserDoc.data();

      // Get target user data
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        setError('User not found');
        return;
      }
      const userData = userDoc.data();

      // Check for existing request
      const existingRequest = await getDocs(query(
        collection(db, 'friendRequests'),
        where('fromUserId', '==', auth.currentUser.uid),
        where('toUserId', '==', userId),
        where('status', '==', 'pending')
      ));

      if (!existingRequest.empty) {
        setError('Friend request already sent');
        return;
      }

      // Create friend request
      const requestRef = await addDoc(collection(db, 'friendRequests'), {
        fromUserId: auth.currentUser.uid,
        toUserId: userId,
        fromUserName: currentUserData.name || currentUserData.username || 'Unknown User',
        toUserName: userData.name || userData.username || 'Unknown User',
        fromUserUsername: currentUserData.username || 'unknown',
        toUserUsername: userData.username || 'unknown',
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      // Update local state
      if (auth.currentUser) {
        setSentRequests(prev => [...prev, {
          id: requestRef.id,
          fromUserId: auth.currentUser.uid,
          toUserId: userId,
          fromUserName: currentUserData.name || currentUserData.username || 'Unknown User',
          toUserName: userData.name || userData.username || 'Unknown User',
          fromUserUsername: currentUserData.username || 'unknown',
          toUserUsername: userData.username || 'unknown',
          status: 'pending',
          createdAt: new Date().toISOString()
        }]);
      }

      setSuccess('Friend request sent successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error sending friend request:', err);
      setError('Failed to send friend request');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      await updateDoc(doc(db, 'friendRequests', requestId), {
        status: 'cancelled',
        updatedAt: new Date()
      });

      setSentRequests(prev => prev.filter(req => req.id !== requestId));
      setSuccess('Friend request cancelled');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error cancelling friend request:', err);
      setError('Failed to cancel friend request');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleSOS = async () => {
    if (!auth.currentUser) return;

    try {
      setIsLoading(true);
      setError(null);

      // Check if user has any friends
      const friendsRef = collection(db, 'friends');
      const friendsQuery = firestoreQuery(
        friendsRef,
        where('userId', '==', auth.currentUser.uid),
        where('status', '==', 'accepted')
      );
      const friendsSnapshot = await getDocs(friendsQuery);
      const friends = friendsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Friend[];

      if (friends.length === 0) {
        setError('Please add at least one friend before sending SOS');
        setTimeout(() => setError(null), 5000);
        return;
      }

      // Check if user already has an active alert
      const alertsRef = collection(db, 'alerts');
      const activeAlertQuery = firestoreQuery(
        alertsRef,
        where('userId', '==', auth.currentUser.uid),
        where('status', '==', 'active')
      );
      const activeAlertSnapshot = await getDocs(activeAlertQuery);

      if (!activeAlertSnapshot.empty) {
        setError('You already have an active SOS alert');
        setTimeout(() => setError(null), 5000);
        return;
      }

      // Get user's data
      const userDoc = await getDocs(firestoreQuery(
        collection(db, 'users'),
        where('userId', '==', auth.currentUser.uid)
      ));

      if (userDoc.empty) {
        setError('User data not found');
        return;
      }

      const userData = userDoc.docs[0].data();

      // Create alert
      const alertRef = await addDoc(collection(db, 'alerts'), {
        userId: auth.currentUser.uid,
        userName: userData.name || auth.currentUser.displayName || 'Unknown User',
        userUsername: userData.username || auth.currentUser.displayName?.split(' ')[0] || 'unknown',
        type: 'sos',
        status: 'active',
        createdAt: new Date().toISOString(),
        location: userData.location || 'Location not available',
        friends: friends.map(friend => ({
          id: friend.friendId,
          name: friend.friendName,
          username: friend.friendUsername
        }))
      });

      // Play alert sound only for the sender
      const audio = new Audio('/sos-alert.mp3');
      audio.loop = true;
      await audio.play();
      setAlertAudio(audio);

      // Show success message
      setSuccess('SOS alert sent! Your friends have been notified.');
      setTimeout(() => setSuccess(null), 5000);

    } catch (err) {
      console.error('Error sending SOS:', err);
      setError('Failed to send SOS alert');
    } finally {
      setIsLoading(false);
    }
  };

  // Listen for SOS alerts from friends
  useEffect(() => {
    if (!auth.currentUser) return;

    const alertsRef = collection(db, 'alerts');
    const q = firestoreQuery(
      alertsRef,
      where('status', '==', 'active'),
      where('friends', 'array-contains', {
        id: auth.currentUser.uid,
        name: auth.currentUser.displayName || '',
        username: auth.currentUser.displayName?.split(' ')[0] || 'User'
      })
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const alert = change.doc.data();
          // Play alert sound for friends
          const audio = new Audio('/sos-alert.mp3');
          audio.loop = true;
          audio.play();
          setAlertAudio(audio);
        } else if (change.type === 'modified') {
          const alert = change.doc.data();
          if (alert.status === 'resolved') {
            // Stop alert sound when resolved
            if (alertAudio) {
              alertAudio.pause();
              alertAudio.currentTime = 0;
              setAlertAudio(null);
            }
          }
        }
      });
    });

    return () => {
      unsubscribe();
      if (alertAudio) {
        alertAudio.pause();
        alertAudio.currentTime = 0;
      }
    };
  }, [auth.currentUser, alertAudio]);

  const handleResolveAlert = async (alertId: string) => {
    if (!auth.currentUser) return;

    try {
      const alertRef = doc(db, 'alerts', alertId);
      await updateDoc(alertRef, {
        status: 'resolved',
        resolvedAt: new Date().toISOString(),
        resolvedBy: auth.currentUser.uid
      });

      // Stop the alert sound if it's playing
      if (alertAudio) {
        alertAudio.pause();
        alertAudio.currentTime = 0;
        setAlertAudio(null);
      }

      setSuccess('Alert resolved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error resolving alert:', err);
      setError('Failed to resolve alert');
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/login');
    } catch (err) {
      console.error('Error logging out:', err);
      setError('Failed to logout');
    }
  };

  // Memoize the SOS button component
  const SosButton = React.memo(() => (
    <button
      onClick={() => setShowSosModal(true)}
      className="fixed bottom-6 left-1/2 transform -translate-x-1/2 w-16 h-16 md:w-20 md:h-20 bg-red-600 rounded-full 
        shadow-lg hover:bg-red-700 transition-colors flex items-center justify-center
        animate-pulse z-50"
      aria-label="Send SOS Alert"
    >
      <div className="relative">
        <AlertTriangle className="w-8 h-8 md:w-10 md:h-10 text-white" />
        <span className="absolute -top-2 -right-2 w-4 h-4 md:w-5 md:h-5 bg-white rounded-full 
          animate-ping opacity-75"></span>
      </div>
    </button>
  ));

  // Memoize the active alerts section
  const ActiveAlerts = React.memo(() => (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm mb-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center text-red-600">
        <AlertTriangle className="w-5 h-5 mr-2" />
        Active Alerts
      </h2>
      <div className="space-y-4">
        {activeAlerts.map((alert) => (
          <div key={alert.id} className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg 
            animate-pulse">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-white shadow-sm">
                    <img 
                      src="/logo.png" 
                      alt="User Avatar" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-red-700 dark:text-red-300">
                      SOS Alert!
                    </h3>
                    <p className="text-lg font-medium text-red-600 dark:text-red-400">
                      From: {alert.userName}
                    </p>
                    <p className="text-sm text-red-500 dark:text-red-400">
                      @{alert.userUsername}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <MapPin className="w-5 h-5" />
                    <p>Location: {alert.location}</p>
                  </div>
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <Bell className="w-5 h-5" />
                    <p>Sent at: {new Date(alert.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleResolveAlert(alert.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 
                    transition-colors flex items-center gap-2"
                >
                  <AlertTriangle className="w-5 h-5" />
                  Resolve
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  ));

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-white shadow-sm">
                <img 
                  src="/logo.png" 
                  alt="Preshnam Solver Logo" 
                  className="w-full h-full object-cover"
                />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Preshnam Solver
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/friends')}
                className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 
                  dark:hover:text-white relative"
              >
                <Users className="w-6 h-6" />
                {friendRequests.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs 
                    rounded-full w-5 h-5 flex items-center justify-center">
                    {friendRequests.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => navigate('/profile')}
                className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 
                  dark:hover:text-white"
              >
                <User className="w-6 h-6" />
              </button>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 
                  dark:hover:text-white"
              >
                <LogOut className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {isLoading && !activeAlerts.length ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-200 dark:border-blue-900 rounded-full animate-spin">
                <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-500 dark:border-blue-400 rounded-full border-t-transparent animate-spin"></div>
              </div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="w-8 h-8 border-4 border-blue-500 dark:border-blue-400 rounded-full animate-ping"></div>
              </div>
            </div>
            <p className="mt-4 text-lg font-medium text-gray-600 dark:text-gray-400 animate-pulse">
              Loading...
            </p>
          </div>
        ) : (
          <>
            {/* Search Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm mb-6">
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 
                    text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder="Search by username or name..."
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 
                      dark:border-gray-600 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
                  {searchResults.map((user) => {
                    const hasPendingRequest = sentRequests.some(
                      req => req.toUserId === user.id && req.status === 'pending'
                    );

                    return (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-3 bg-gray-50 
                          dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                      >
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {user.name}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            @{user.username}
                          </p>
                        </div>
                        {hasPendingRequest ? (
                          <button
                            onClick={() => handleCancelRequest(
                              sentRequests.find(req => req.toUserId === user.id)?.id || ''
                            )}
                            className="px-3 py-1 text-sm text-red-600 hover:text-red-700 
                              dark:text-red-400 dark:hover:text-red-300 flex items-center gap-2"
                          >
                            <X className="w-4 h-4" />
                            Cancel Request
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAddFriend(user.id)}
                            className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 
                              dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-2"
                          >
                            <UserPlus className="w-4 h-4" />
                            Add Friend
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Active Alerts */}
            <ActiveAlerts />
          </>
        )}
      </main>

      {/* SOS Button */}
      <SosButton />

      {/* SOS Modal */}
      {showSosModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-white shadow-sm">
                <img 
                  src="/logo.png" 
                  alt="Preshnam Solver Logo" 
                  className="w-full h-full object-cover"
                />
              </div>
              <h2 className="text-xl font-semibold">Send SOS Alert</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to send an SOS alert to your friends?
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowSosModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 
                  dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSOS}
                disabled={isLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 
                  transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Sending...' : 'Send SOS'}
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed bottom-4 right-4 p-4 bg-red-50 dark:bg-red-900/20 
          text-red-600 dark:text-red-400 rounded-lg shadow-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="fixed bottom-4 right-4 p-4 bg-green-50 dark:bg-green-900/20 
          text-green-600 dark:text-green-400 rounded-lg shadow-lg">
          {success}
        </div>
      )}
    </div>
  );
}; 