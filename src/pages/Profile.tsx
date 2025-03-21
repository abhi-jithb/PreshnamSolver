import React, { useState, useEffect } from 'react';
import { Moon, Sun, ArrowLeft, UserPlus, Settings, LogOut, Send, Save, Edit2, Mail, Calendar, Phone, MapPin, Heart, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { auth, db } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { collection, doc, getDoc, updateDoc, addDoc, setDoc } from 'firebase/firestore';
import TextareaAutosize from 'react-textarea-autosize';

interface UserDetails {
  name: string;
  phone: string;
  emergencyContact: string;
  address: string;
  medicalInfo: string;
  email?: string;
  createdAt?: string;
  updatedAt?: string;
  isProfileComplete?: boolean;
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
    emergencyContact: '',
    address: '',
    medicalInfo: '',
    email: auth.currentUser?.email || '',
    createdAt: new Date().toISOString(),
    isProfileComplete: false
  });

  useEffect(() => {
    const fetchUserDetails = async () => {
      if (auth.currentUser) {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data() as UserDetails;
          setUserDetails({
            ...data,
            email: auth.currentUser.email || ''
          });
          if (!data.isProfileComplete) {
            setShowInitialSetup(true);
          }
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

  const handleSaveDetails = async () => {
    if (!auth.currentUser) return;
    
    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        ...userDetails,
        updatedAt: new Date().toISOString(),
        isProfileComplete: true
      });
      setIsEditing(false);
      setShowInitialSetup(false);
    } catch (error) {
      console.error('Error saving user details:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const renderField = (label: string, value: string, type: string = 'text', isTextArea: boolean = false) => {
    if (isEditing || showInitialSetup) {
      if (isTextArea) {
        return (
          <textarea
            value={value}
            onChange={(e) => setUserDetails({...userDetails, [label.toLowerCase()]: e.target.value})}
            className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600
              min-h-[100px] focus:ring-2 focus:ring-blue-500"
            placeholder={`Enter your ${label.toLowerCase()}`}
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
  };

  // Initial Setup Modal
  const InitialSetupModal = () => (
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
            onClick={handleSaveDetails}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save & Continue'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white p-6">
      {showInitialSetup && <InitialSetupModal />}
      
      <Link to="/" className="inline-flex items-center text-gray-600 dark:text-gray-400 mb-6">
        <ArrowLeft className="w-5 h-5 mr-2" />
        Back
      </Link>

      <div className="max-w-2xl mx-auto">
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-8 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              {isEditing ? (
                <input
                  type="text"
                  value={userDetails.name}
                  onChange={(e) => setUserDetails({...userDetails, name: e.target.value})}
                  className="text-3xl font-bold bg-transparent border-b-2 border-white focus:outline-none focus:border-white"
                  placeholder="Your name"
                />
              ) : (
                <h1 className="text-3xl font-bold">{userDetails.name || 'User'}</h1>
              )}
              <p className="text-blue-100 mt-1">{userDetails.email}</p>
            </div>
            <button
              onClick={() => isEditing ? handleSaveDetails() : setIsEditing(true)}
              className="inline-flex items-center space-x-2 bg-white text-blue-600 px-4 py-2 
                rounded-lg hover:bg-blue-50 transition-colors"
              disabled={isSaving}
            >
              {isEditing ? (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
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

        {/* Profile Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Mail className="w-5 h-5 mr-2" />
              Contact Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Phone Number</label>
                {renderField('phone', userDetails.phone, 'tel')}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Emergency Contact</label>
                {renderField('emergencyContact', userDetails.emergencyContact, 'tel')}
              </div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <MapPin className="w-5 h-5 mr-2" />
              Location
            </h2>
            <div>
              <label className="block text-sm font-medium mb-1">Address</label>
              {renderField('address', userDetails.address)}
            </div>
          </div>
        </div>

        {/* Medical Information */}
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Heart className="w-5 h-5 mr-2" />
            Medical Information
          </h2>
          <div>
            <label className="block text-sm font-medium mb-1">Medical Details</label>
            {renderField('medicalInfo', userDetails.medicalInfo, 'text', true)}
          </div>
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
            <h2 className="text-xl font-semibold mb-4">Emergency Contacts</h2>
            <button className="inline-flex items-center text-blue-600 dark:text-blue-400">
              <UserPlus className="w-5 h-5 mr-2" />
              Add Emergency Contact
            </button>
          </div>

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