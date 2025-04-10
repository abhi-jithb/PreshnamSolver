import React, { useState, useEffect } from 'react';
import { Moon, Sun, ArrowLeft, Settings, LogOut, Send, Save, Edit2, Mail, Calendar, Phone, MapPin, X, Check, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { auth, db } from '../lib/firebase';
import { signOut, updateProfile } from 'firebase/auth';
import { collection, doc, getDoc, updateDoc, addDoc, setDoc, getDocs, query, where } from 'firebase/firestore';
import TextareaAutosize from 'react-textarea-autosize';
import { motion, AnimatePresence } from 'framer-motion';

interface UserDetails {
  name: string;
  phone: string;
  address: string;
  email?: string;
  createdAt?: string;
  updatedAt?: string;
  isProfileComplete?: boolean;
  username?: string;
  role?: string;
  [key: string]: any;
}

export const Profile: React.FC = () => {
  const { darkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState('');
  const [feedbackStatus, setFeedbackStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showInitialSetup, setShowInitialSetup] = useState(false);
  const [userDetails, setUserDetails] = useState<UserDetails>({
    name: '',
    phone: '',
    address: '',
    email: auth.currentUser?.email || '',
    createdAt: new Date().toISOString(),
    isProfileComplete: false
  });
  const [newUsername, setNewUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: userDetails.name || '',
    phone: userDetails.phone || '',
    address: userDetails.address || '',
    username: userDetails.username || ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchUserDetails = async () => {
      if (auth.currentUser) {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data() as UserDetails;
          setUserDetails({
            ...data,
            email: auth.currentUser.email || '',
            username: data.username || '',
            role: data.role || ''
          });
          if (!data.isProfileComplete) {
            setShowInitialSetup(true);
          }
          setNewUsername(data.username || '');
        } else {
          // Create new user document
          const userRef = doc(db, 'users', auth.currentUser.uid);
          await setDoc(userRef, {
            ...userDetails,
            createdAt: new Date().toISOString()
          });
          setShowInitialSetup(true);
        }
      }
    };
    fetchUserDetails();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!feedback.trim()) return;

    setFeedbackStatus('sending');
    try {
      await addDoc(collection(db, 'feedback'), {
        userId: auth.currentUser?.uid,
        message: feedback.trim(),
        createdAt: new Date().toISOString(),
      });
      setFeedbackStatus('sent');
      setFeedback('');
      setTimeout(() => setFeedbackStatus('idle'), 3000);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setFeedbackStatus('error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate phone number
      if (formData.phone && !/^\d{10}$/.test(formData.phone)) {
        setError('Phone number must be exactly 10 digits');
        return;
      }

      // Validate address
      if (formData.address && formData.address.length < 6) {
        setError('Address must be at least 6 characters long');
        return;
      }

      if (!auth.currentUser) {
        setError('User not authenticated');
        return;
      }

      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        ...formData,
        updatedAt: new Date().toISOString(),
        isProfileComplete: true
      });

      // Update display name if changed
      if (formData.name && formData.name !== auth.currentUser.displayName) {
        await updateProfile(auth.currentUser, {
          displayName: formData.name
        });
      }

      setUserDetails(formData);
      setIsEditing(false);
      setSuccess('Profile updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile');
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUsername = async () => {
    if (!newUsername.trim()) {
      setError('Username cannot be empty');
      return;
    }

    try {
      // Check if username already exists
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', newUsername.trim()));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const existingUser = querySnapshot.docs[0];
        if (existingUser.id !== auth.currentUser?.uid) {
          setError('This username is already taken');
          setTimeout(() => setError(null), 3000);
          return;
        }
      }

      // Update username
      await updateDoc(doc(db, 'users', auth.currentUser?.uid || ''), {
        username: newUsername.trim()
      });
      setUserDetails({ ...userDetails, username: newUsername.trim() });
      setIsEditing(false);
      setSuccess('Username updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error updating username:', err);
      setError('Failed to update username');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
    setFormData({ ...formData, phone: value });
  };

  // Memoize the renderField function
  const renderField = React.useCallback((label: string, value: string, type: string = 'text') => {
    if (isEditing || showInitialSetup) {
      if (label.toLowerCase() === 'address') {
        return (
          <textarea
            value={value}
            onChange={(e) => setUserDetails({...userDetails, [label.toLowerCase()]: e.target.value})}
            className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600
              focus:ring-2 focus:ring-blue-500 min-h-[100px] resize-y"
            placeholder={`Enter your ${label.toLowerCase()}`}
          />
        );
      }
      if (label.toLowerCase() === 'phone') {
        return (
          <input
            type="tel"
            value={value}
            onChange={handlePhoneChange}
            className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600
              focus:ring-2 focus:ring-blue-500"
            placeholder={`Enter your ${label.toLowerCase()}`}
            maxLength={10}
          />
        );
      }
      return (
        <input
          type={type}
          value={value}
          onChange={(e) => setUserDetails({...userDetails, [label.toLowerCase()]: e.target.value})}
          className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600
            focus:ring-2 focus:ring-blue-500"
          placeholder={`Enter your ${label.toLowerCase()}`}
        />
      );
    }
    return (
      <p className="text-gray-700 dark:text-gray-300">
        {value || `No ${label.toLowerCase()} provided`}
      </p>
    );
  }, [isEditing, showInitialSetup, userDetails]);

  // Memoize the InitialSetupModal component
  const InitialSetupModal = React.memo(() => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Complete Your Profile</h2>
          <button
            onClick={() => setShowInitialSetup(false)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Please provide some basic information to complete your profile.
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Full Name</label>
            {renderField('name', userDetails.name)}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone Number</label>
            {renderField('phone', userDetails.phone, 'tel')}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Address</label>
            {renderField('address', userDetails.address)}
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSubmit}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save & Continue'}
          </button>
        </div>
      </div>
    </div>
  ));

  // Memoize the ProfileHeader component
  const ProfileHeader = React.memo(() => (
    <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 md:p-8 mb-6 md:mb-8 text-white">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          {isEditing ? (
            <input
              type="text"
              value={userDetails.name}
              onChange={(e) => setUserDetails({...userDetails, name: e.target.value})}
              className="text-2xl md:text-3xl font-bold bg-transparent border-b-2 border-white 
                focus:outline-none focus:border-white w-full md:w-auto"
              placeholder="Your name"
            />
          ) : (
            <h1 className="text-2xl md:text-3xl font-bold">{userDetails.name || 'User'}</h1>
          )}
          <p className="text-blue-100 mt-1">{userDetails.email}</p>
        </div>
        <button
          onClick={() => isEditing ? handleSubmit() : setIsEditing(true)}
          className="inline-flex items-center justify-center space-x-2 bg-white text-blue-600 px-4 py-2 
            rounded-lg hover:bg-blue-50 transition-colors w-full md:w-auto"
          disabled={isSubmitting}
        >
          {isEditing ? (
            <>
              <Save className="w-5 h-5 mr-2" />
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </>
          ) : (
            <>
              <Edit2 className="w-5 h-5 mr-2" />
              Edit Profile
            </>
          )}
        </button>
      </div>
    </div>
  ));

  if (showInitialSetup) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white p-4 md:p-6">
        <InitialSetupModal />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white p-4 md:p-6">
      <Link to="/" className="inline-flex items-center text-gray-600 dark:text-gray-400 mb-6">
        <ArrowLeft className="w-5 h-5 mr-2" />
        Back
      </Link>

      <div className="max-w-2xl mx-auto">
        <ProfileHeader />

        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 
            dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 text-green-600 
            dark:text-green-400 rounded-lg border border-green-200 dark:border-green-800">
            {success}
          </div>
        )}

        {/* Profile Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
          <AnimatePresence mode="wait">
            {isEditing ? (
              <motion.div
                key="edit-form"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg"
              >
                <motion.form
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  onSubmit={handleSubmit}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 }}
                      className="space-y-4"
                    >
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                            bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent
                            transition-all duration-200"
                          placeholder="Enter your full name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={handlePhoneChange}
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                            bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent
                            transition-all duration-200"
                          placeholder="Enter your phone number"
                          maxLength={10}
                        />
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      className="space-y-4"
                    >
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Username
                        </label>
                        <input
                          type="text"
                          value={formData.username}
                          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                            bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent
                            transition-all duration-200"
                          placeholder="Choose a username"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Address
                        </label>
                        <textarea
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                            bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent
                            transition-all duration-200 min-h-[100px] resize-y"
                          placeholder="Enter your address"
                        />
                      </div>
                    </motion.div>
                  </div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex justify-end space-x-4"
                  >
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-6 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                        text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700
                        transition-all duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700
                        disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200
                        flex items-center space-x-2"
                    >
                      {isSubmitting ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          >
                            <Loader2 className="w-5 h-5" />
                          </motion.div>
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5" />
                          <span>Save Changes</span>
                        </>
                      )}
                    </button>
                  </motion.div>
                </motion.form>
              </motion.div>
            ) : (
              <motion.div
                key="view-profile"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-gray-50 dark:bg-gray-800 p-4 md:p-6 rounded-lg"
              >
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <Mail className="w-5 h-5 mr-2" />
                  Contact Information
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Phone Number</label>
                    {renderField('phone', userDetails.phone, 'tel')}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-gray-50 dark:bg-gray-800 p-4 md:p-6 rounded-lg"
          >
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <MapPin className="w-5 h-5 mr-2" />
              Location
            </h2>
            <div>
              <label className="block text-sm font-medium mb-1">Address</label>
              {renderField('address', userDetails.address)}
            </div>
          </motion.div>
        </div>

        {/* Account Information */}
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Account Information
          </h2>
          <div className="space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Joined: {new Date(userDetails.createdAt || '').toLocaleDateString()}
            </p>
            {userDetails.updatedAt && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Last Updated: {new Date(userDetails.updatedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">
              <Settings className="w-5 h-5 inline mr-2" />
              Preferences
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">Theme</h3>
                <button
                  onClick={toggleDarkMode}
                  className="inline-flex items-center space-x-2 bg-gray-200 dark:bg-gray-700 
                    px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  {darkMode ? (
                    <>
                      <Sun className="w-5 h-5" />
                      <span>Light Mode</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-5 h-5" />
                      <span>Dark Mode</span>
                    </>
                  )}
                </button>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-2">Location Services</h3>
                <button
                  onClick={() => {
                    navigator.geolocation.getCurrentPosition(
                      position => console.log(position),
                      error => console.error(error)
                    );
                  }}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Update Location Permission
                </button>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">App Feedback</h2>
            <div className="space-y-4">
              <TextareaAutosize
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Share your thoughts about the app..."
                className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 
                  dark:bg-gray-700 min-h-[100px] resize-none focus:ring-2 focus:ring-blue-500"
                maxRows={5}
              />
              <div className="flex items-center justify-between">
                <button
                  onClick={handleFeedbackSubmit}
                  disabled={feedbackStatus === 'sending' || feedbackStatus === 'sent'}
                  className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 
                    rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {feedbackStatus === 'sending' ? 'Sending...' :
                     feedbackStatus === 'sent' ? 'Sent!' :
                     feedbackStatus === 'error' ? 'Try Again' :
                     'Send Feedback'}
                  </span>
                </button>
                {feedbackStatus === 'sent' && (
                  <span className="text-green-500 dark:text-green-400">
                    Thank you for your feedback!
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">
              <Edit2 className="w-5 h-5 inline mr-2" />
              Username
            </h2>
            <div className="flex items-center space-x-2">
              {isEditing ? (
                <>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                      bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleUpdateUsername}
                    className="p-2 text-green-600 hover:text-green-700 dark:text-green-400 
                      dark:hover:text-green-300 transition-colors"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setNewUsername(userDetails.username || '');
                      setError(null);
                    }}
                    className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 
                      dark:hover:text-red-300 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 p-2 text-gray-900 dark:text-white">
                    {userDetails.username}
                  </span>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 
                      dark:hover:text-blue-300 transition-colors"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full mt-8 inline-flex items-center justify-center space-x-2 bg-red-600 
              text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
};