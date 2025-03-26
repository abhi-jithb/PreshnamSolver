import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User, Lock, Mail, Eye, EyeOff } from 'lucide-react';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      // Check user role
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/');
        }
      } else {
        navigate('/');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl transform hover:scale-[1.02] transition-transform duration-300">
        <div className="flex flex-col items-center">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-white shadow-lg mb-4 ring-4 ring-blue-500/20 transform hover:scale-105 transition-transform duration-300">
            <img 
              src="/logo.png" 
              alt="Preshnam Solver Logo" 
              className="w-full h-full object-cover"
            />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Sign in to your account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 
              dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Email</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="w-5 h-5 text-blue-500 group-hover:text-blue-600 transition-colors" />
              </div>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full pl-10 p-3 rounded-lg border border-gray-300 dark:border-gray-600 
                  bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  transition-all duration-200"
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Password</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="w-5 h-5 text-blue-500 group-hover:text-blue-600 transition-colors" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full pl-10 pr-10 p-3 rounded-lg border border-gray-300 dark:border-gray-600 
                  bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  transition-all duration-200"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 
                  dark:hover:text-gray-300 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg 
              hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 transform hover:scale-[1.02]
              disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            Don't have an account?{' '}
            <button
              onClick={() => navigate('/signup')}
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 
                dark:hover:text-blue-300 font-medium transition-colors"
            >
              Sign up
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};