import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Search, User, X, Check, AlertTriangle, UserCheck, UserX, Loader2, Home, Users } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { collection, addDoc, doc, getDoc, onSnapshot, query, where, updateDoc, arrayUnion, arrayRemove, getDocs, deleteDoc } from 'firebase/firestore';

interface UserData {
  userId: string;
  name: string;
  username: string;
}

interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  timestamp: Date;
  senderName: string;
  senderUsername: string;
}

interface Friend {
  id: string;
  userId: string;
  friendId: string;
  friendName: string;
  friendUsername: string;
  status: 'pending' | 'accepted';
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
      setIsSearching(true);
      setError(null);

      // Get pending requests
      const requestsRef = collection(db, 'friendRequests');
      const q = query(
        requestsRef,
        where('toUserId', '==', auth.currentUser?.uid),
        where('status', '==', 'pending')
      );
      const querySnapshot = await getDocs(q);
      
      // Get all sender IDs
      const senderIds = querySnapshot.docs.map(doc => doc.data().fromUserId);
      
      // Get user data for all senders
      const usersRef = collection(db, 'users');
      const userPromises = senderIds.map(async (senderId) => {
        const userDoc = await getDocs(query(
          usersRef,
          where('userId', '==', senderId)
        ));
        return userDoc.docs[0]?.data() as UserData | null;
      });
      
      const userDataList = await Promise.all(userPromises);
      
      // Combine request data with user data
      const requestsData = querySnapshot.docs.map((doc, index) => {
        const requestData = doc.data();
        const userData = userDataList[index];
        return {
          id: doc.id,
          fromUserId: requestData.fromUserId,
          toUserId: requestData.toUserId,
          status: requestData.status,
          timestamp: requestData.createdAt,
          senderName: userData?.name || 'Unknown User',
          senderUsername: userData?.username || 'unknown'
        } as FriendRequest;
      });

      setFriendRequests(requestsData);
    } catch (err) {
      console.error('Error fetching friend requests:', err);
      setError('Failed to fetch friend requests');
    } finally {
      setIsSearching(false);
    }
  };

  const fetchFriends = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get accepted friends
      const friendsRef = collection(db, 'friends');
      const q = query(
        friendsRef,
        where('userId', '==', auth.currentUser?.uid),
        where('status', '==', 'accepted')
      );
      const querySnapshot = await getDocs(q);
      
      // Get all friend IDs
      const friendIds = querySnapshot.docs.map(doc => doc.data().friendId);
      
      // Get user data for all friends
      const usersRef = collection(db, 'users');
      const userPromises = friendIds.map(async (friendId) => {
        const userDoc = await getDocs(query(
          usersRef,
          where('userId', '==', friendId)
        ));
        return userDoc.docs[0]?.data() || null;
      });
      
      const userDataList = await Promise.all(userPromises);
      
      // Combine friend data with user data
      const friendsData = querySnapshot.docs.map((doc, index) => {
        const friendData = doc.data();
        const userData = userDataList[index];
        return {
          id: doc.id,
          userId: auth.currentUser?.uid || '',
          friendId: friendData.friendId,
          friendName: userData?.name || friendData.friendName || 'Unknown User',
          friendUsername: userData?.username || friendData.friendUsername || 'unknown',
          status: friendData.status,
          createdAt: friendData.createdAt
        };
      });

      setFriends(friendsData);
    } catch (err) {
      console.error('Error fetching friends:', err);
      setError('Failed to fetch friends');
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
      // Get current user's data
      const currentUserDoc = await getDocs(query(
        collection(db, 'users'),
        where('userId', '==', auth.currentUser.uid)
      ));

      if (currentUserDoc.empty) {
        setError('User data not found');
        return;
      }

      const currentUserData = currentUserDoc.docs[0].data();

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
        fromUserName: currentUserData.name,
        fromUserUsername: currentUserData.username,
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

  const handleAcceptRequest = async (requestId: string) => {
    if (!auth.currentUser) return;

    try {
      const request = friendRequests.find(req => req.id === requestId);
      if (!request) {
        setError('Friend request not found');
        return;
      }

      // Get current user's data
      const currentUserDoc = await getDocs(query(
        collection(db, 'users'),
        where('userId', '==', auth.currentUser.uid)
      ));

      if (currentUserDoc.empty) {
        setError('User data not found');
        return;
      }

      const currentUserData = currentUserDoc.docs[0].data();

      // Update request status
      const requestRef = doc(db, 'friendRequests', requestId);
      await updateDoc(requestRef, {
        status: 'accepted',
        updatedAt: new Date()
      });

      // Add to current user's friends list
      await addDoc(collection(db, 'friends'), {
        userId: auth.currentUser.uid,
        friendId: request.fromUserId,
        friendName: request.senderName,
        friendUsername: request.senderUsername,
        status: 'accepted',
        createdAt: new Date().toISOString()
      });

      // Add to requester's friends list
      await addDoc(collection(db, 'friends'), {
        userId: request.fromUserId,
        friendId: auth.currentUser.uid,
        friendName: currentUserData.name,
        friendUsername: currentUserData.username,
        status: 'accepted',
        createdAt: new Date().toISOString()
      });

      // Update local state
      setFriendRequests(prev => prev.filter(req => req.id !== requestId));
      await fetchFriends(); // Refresh friends list

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
    try {
      // Remove from current user's friends list
      const currentUserFriendsRef = collection(db, 'friends');
      const currentUserFriendsQuery = query(
        currentUserFriendsRef,
        where('userId', '==', auth.currentUser?.uid),
        where('friendId', '==', friendId)
      );
      const currentUserFriendsSnapshot = await getDocs(currentUserFriendsQuery);
      currentUserFriendsSnapshot.docs.forEach(doc => {
        deleteDoc(doc.ref);
      });

      // Remove from friend's friends list
      const friendFriendsRef = collection(db, 'friends');
      const friendFriendsQuery = query(
        friendFriendsRef,
        where('userId', '==', friendId),
        where('friendId', '==', auth.currentUser?.uid)
      );
      const friendFriendsSnapshot = await getDocs(friendFriendsQuery);
      friendFriendsSnapshot.docs.forEach(doc => {
        deleteDoc(doc.ref);
      });

      setFriends(prev => prev.filter(friend => friend.friendId !== friendId));
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

            {/* Friend Requests */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm mb-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center text-blue-600">
                <UserPlus className="w-5 h-5 mr-2" />
                Friend Requests
              </h2>
              <div className="space-y-4">
                {friendRequests.map((request) => (
                  <div key={request.id} className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-blue-700 dark:text-blue-300">
                          {request.senderName}
                        </p>
                        <p className="text-sm text-blue-600 dark:text-blue-400">
                          @{request.senderUsername}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAcceptRequest(request.id)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                            transition-colors"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleRejectRequest(request.id)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 
                            transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {friendRequests.length === 0 && (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                    No pending friend requests
                  </p>
                )}
              </div>
            </div>

            {/* Friends List */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4 flex items-center text-green-600">
                <User className="w-5 h-5 mr-2" />
                Friends
              </h2>
              <div className="space-y-4">
                {friends.map((friend) => (
                  <div key={friend.id} className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-green-700 dark:text-green-300">
                          {friend.friendName}
                        </p>
                        <p className="text-sm text-green-600 dark:text-green-400">
                          @{friend.friendUsername}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveFriend(friend.friendId)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 
                          transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
                {friends.length === 0 && (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                    No friends yet
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}; 