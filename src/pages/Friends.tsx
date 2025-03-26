import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Search, User, X, Check, AlertTriangle, UserCheck, UserX, Loader2, Home, Users } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { collection, addDoc, doc, getDoc, onSnapshot, query, where, updateDoc, arrayUnion, arrayRemove, getDocs, deleteDoc } from 'firebase/firestore';

interface FriendRequest {
  id: string;
  fromUserId: string;
  fromUserName: string;
  fromUserUsername: string;
  toUserId: string;
  toUserName: string;
  toUserUsername: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  createdAt: string;
  updatedAt?: string;
}

interface Friend {
  id: string;
  userId: string;
  friendId: string;
  friendName: string;
  friendUsername: string;
  status: 'accepted';
  createdAt: string;
}

interface UserSearch {
  id: string;
  username: string;
  name: string;
}

export const Friends: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearch[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchFriendRequests();
    fetchFriends();
  }, []);

  const fetchFriendRequests = async () => {
    try {
      const requestsRef = collection(db, 'friendRequests');
      const q = query(
        requestsRef,
        where('toUserId', '==', auth.currentUser?.uid),
        where('status', '==', 'pending')
      );

      const querySnapshot = await getDocs(q);
      const requests = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FriendRequest[];

      setFriendRequests(requests);
    } catch (err) {
      console.error('Error fetching friend requests:', err);
      setError('Failed to load friend requests');
    }
  };

  const fetchFriends = async () => {
    try {
      const friendsRef = collection(db, 'friends');
      const q = query(
        friendsRef,
        where('userId', '==', auth.currentUser?.uid),
        where('status', '==', 'accepted')
      );

      const querySnapshot = await getDocs(q);
      const friends = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Friend[];

      setFriends(friends);
    } catch (err) {
      console.error('Error fetching friends:', err);
      setError('Failed to load friends');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || !auth.currentUser) return;

    setIsSearching(true);
    setError(null);

    try {
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        where('username', '>=', searchQuery),
        where('username', '<=', searchQuery + '\uf8ff')
      );

      const querySnapshot = await getDocs(q);
      const results = querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(user => user.id !== auth.currentUser?.uid) as UserSearch[];

      setSearchResults(results);
    } catch (err) {
      console.error('Error searching users:', err);
      setError('Failed to search users');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddFriend = async (friendId: string, friendName: string, friendUsername: string) => {
    if (!auth.currentUser) return;

    try {
      // Check if friend request already exists
      const requestsRef = collection(db, 'friendRequests');
      const existingRequest = await getDocs(query(
        requestsRef,
        where('fromUserId', '==', auth.currentUser.uid),
        where('toUserId', '==', friendId),
        where('status', '==', 'pending')
      ));

      if (!existingRequest.empty) {
        setError('Friend request already sent');
        setTimeout(() => setError(null), 3000);
        return;
      }

      // Create friend request
      await addDoc(collection(db, 'friendRequests'), {
        fromUserId: auth.currentUser.uid,
        fromUserName: auth.currentUser.displayName || '',
        fromUserUsername: auth.currentUser.displayName?.split(' ')[0] || 'User',
        toUserId: friendId,
        toUserName: friendName,
        toUserUsername: friendUsername,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      setSearchResults([]);
      setSearchQuery('');
      setSuccess('Friend request sent successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error adding friend:', err);
      setError('Failed to send friend request');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleAcceptRequest = async (requestId: string, fromUserId: string, fromUserName: string, fromUserUsername: string) => {
    try {
      // Update request status to accepted
      await updateDoc(doc(db, 'friendRequests', requestId), {
        status: 'accepted',
        updatedAt: new Date()
      });

      // Add to current user's friends list
      await addDoc(collection(db, 'friends'), {
        userId: auth.currentUser?.uid,
        friendId: fromUserId,
        friendName: fromUserName,
        friendUsername: fromUserUsername,
        status: 'accepted',
        createdAt: new Date().toISOString()
      });

      // Add to other user's friends list
      await addDoc(collection(db, 'friends'), {
        userId: fromUserId,
        friendId: auth.currentUser?.uid,
        friendName: auth.currentUser?.displayName || '',
        friendUsername: auth.currentUser?.displayName?.split(' ')[0] || 'User',
        status: 'accepted',
        createdAt: new Date().toISOString()
      });

      // Update local state
      setFriendRequests(prev => prev.filter(req => req.id !== requestId));
      setSuccess('Friend request accepted');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error accepting friend request:', err);
      setError('Failed to accept friend request');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await updateDoc(doc(db, 'friendRequests', requestId), {
        status: 'rejected',
        updatedAt: new Date()
      });

      setFriendRequests(prev => prev.filter(req => req.id !== requestId));
      setSuccess('Friend request rejected');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error rejecting friend request:', err);
      setError('Failed to reject friend request');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      await updateDoc(doc(db, 'friendRequests', requestId), {
        status: 'cancelled',
        updatedAt: new Date()
      });

      setFriendRequests(prev => prev.filter(req => req.id !== requestId));
      setSuccess('Friend request cancelled');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error cancelling friend request:', err);
      setError('Failed to cancel friend request');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!auth.currentUser) return;

    try {
      // Remove from current user's friends list
      const friendsRef = collection(db, 'friends');
      const currentUserFriends = await getDocs(query(
        friendsRef,
        where('userId', '==', auth.currentUser.uid),
        where('friendId', '==', friendId)
      ));

      // Remove from other user's friends list
      const otherUserFriends = await getDocs(query(
        friendsRef,
        where('userId', '==', friendId),
        where('friendId', '==', auth.currentUser.uid)
      ));

      // Delete both friend entries
      await Promise.all([
        ...currentUserFriends.docs.map(doc => deleteDoc(doc.ref)),
        ...otherUserFriends.docs.map(doc => deleteDoc(doc.ref))
      ]);

      setSuccess('Friend removed successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error removing friend:', err);
      setError('Failed to remove friend');
      setTimeout(() => setError(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

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
                Friends
              </h1>
            </div>
            <button
              onClick={() => navigate('/')}
              className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 
                dark:hover:text-white"
            >
              <Home className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <img 
              src="/loading.gif" 
              alt="Loading..." 
              className="w-32 h-32 mb-4"
            />
            <p className="text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 
                dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800">
                {error}
              </div>
            )}

            {success && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 text-green-600 
                dark:text-green-400 rounded-lg border border-green-200 dark:border-green-800">
                {success}
              </div>
            )}

            {/* Search Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4 flex items-center text-blue-600">
                <Search className="w-5 h-5 mr-2" />
                Add Friends
              </h2>
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 
                    text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Search by username..."
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 
                      dark:border-gray-600 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  disabled={isSearching}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                    transition-colors disabled:opacity-50"
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="mt-4 space-y-2">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 bg-gray-50 
                        dark:bg-gray-700 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          @{user.username}
                        </p>
                      </div>
                      <button
                        onClick={() => handleAddFriend(user.id, user.name, user.username)}
                        className="p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 
                          dark:hover:text-blue-300"
                      >
                        <UserPlus className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Friend Requests Section */}
            {friendRequests.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                <h2 className="text-xl font-semibold mb-4 flex items-center text-blue-600">
                  <UserPlus className="w-5 h-5 mr-2" />
                  Friend Requests
                </h2>
                <div className="space-y-4">
                  {friendRequests.map((request) => (
                    <div key={request.id} className="p-4 bg-gray-50 dark:bg-gray-700 
                      rounded-lg border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {request.fromUserName}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            @{request.fromUserUsername}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAcceptRequest(
                              request.id,
                              request.fromUserId,
                              request.fromUserName,
                              request.fromUserUsername
                            )}
                            className="px-3 py-1 text-sm text-green-600 hover:text-green-700 
                              dark:text-green-400 dark:hover:text-green-300"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleRejectRequest(request.id)}
                            className="px-3 py-1 text-sm text-red-600 hover:text-red-700 
                              dark:text-red-400 dark:hover:text-red-300"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Friends List Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4 flex items-center text-green-600">
                <Users className="w-5 h-5 mr-2" />
                Friends List
              </h2>
              {friends.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">
                  No friends yet. Add some friends to get started!
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {friends.map((friend) => (
                    <div key={friend.id} className="p-4 bg-gray-50 dark:bg-gray-700 
                      rounded-lg border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 
                            flex items-center justify-center">
                            <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {friend.friendName}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              @{friend.friendUsername}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveFriend(friend.friendId)}
                          className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 
                            dark:hover:text-red-300"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}; 