import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { ArrowLeft, User, Mail, Phone, MapPin } from 'lucide-react';

interface SignUpForm {
  name: string;
  email: string;
  password: string;
  phone: string;
  address: string;
}

export const Signup: React.FC = () => {
  const [formData, setFormData] = useState<SignUpForm>({
    name: '',
    email: '',
    password: '',
    phone: '',
    address: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Create user account
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      // Create user document in Firestore
      const userRef = doc(db, 'users', userCredential.user.uid);
      const userData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        createdAt: new Date().toISOString(),
        isProfileComplete: true,
        status: 'active',
        role: formData.email === 'admin@gmail.com' ? 'admin' : 'user'
      };

      try {
        console.log('Attempting to save user data to Firestore...');
        console.log('User ID:', userCredential.user.uid);
        console.log('User Data:', userData);
        console.log('User Role:', userData.role);
        console.log('Is Admin Email:', formData.email === 'admin@gmail.com');
        
        await setDoc(userRef, userData);
        console.log('Successfully saved user data to Firestore');

        // If admin user, redirect to admin dashboard
        if (userData.role === 'admin') {
          console.log('Admin user detected, redirecting to /admin');
          navigate('/admin', { replace: true });
        } else {
          console.log('Regular user detected, redirecting to /');
          navigate('/', { replace: true });
        }
      } catch (firestoreError: any) {
        console.error('Detailed Firestore error:', {
          code: firestoreError.code,
          message: firestoreError.message,
          stack: firestoreError.stack
        });
        
        // If Firestore fails, delete the auth account
        try {
          await userCredential.user.delete();
          console.log('Successfully deleted auth account after Firestore error');
        } catch (deleteError) {
          console.error('Error deleting auth account:', deleteError);
        }
        
        // Provide more specific error message based on the error code
        let errorMessage = 'Failed to save user data. ';
        switch (firestoreError.code) {
          case 'permission-denied':
            errorMessage += 'You do not have permission to create this document.';
            break;
          case 'unavailable':
            errorMessage += 'Firestore service is currently unavailable.';
            break;
          case 'not-found':
            errorMessage += 'The database was not found.';
            break;
          default:
            errorMessage += 'Please try again.';
        }
        throw new Error(errorMessage);
      }

      // Request location permission
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            console.log('Location obtained:', position.coords);
          },
          (error) => {
            console.error('Location error:', error);
          }
        );
      }
    } catch (err: any) {
      console.error('Signup error:', {
        message: err.message,
        code: err.code,
        stack: err.stack
      });
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
      <div className="w-full max-w-md p-8">
        <h1 className="text-4xl font-bold mb-8 text-center text-gray-900 dark:text-white">
          Create Account
        </h1>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full pl-10 p-3 rounded-lg border border-gray-300 dark:border-gray-600 
                  dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500"
                required
                placeholder="Enter your full name"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full pl-10 p-3 rounded-lg border border-gray-300 dark:border-gray-600 
                  dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500"
                required
                placeholder="Enter your email"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full pl-10 p-3 rounded-lg border border-gray-300 dark:border-gray-600 
                  dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500"
                required
                placeholder="Enter your phone number"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Address
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full pl-10 p-3 rounded-lg border border-gray-300 dark:border-gray-600 
                  dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500"
                required
                placeholder="Enter your address"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 
                dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500"
              required
              placeholder="Create a password"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 
              transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
};