import type { ConfirmationResult } from 'firebase/auth';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebaseConfig';

declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier;
    confirmationResult: ConfirmationResult;
  }
}

const Login = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user && isVerified) {
        navigate('/admin');
      }
    });

    setupRecaptcha();
    return () => unsubscribe();
  }, [navigate, isVerified]);

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'normal',
        'callback': () => {
        }
      });
    }
  };

  const checkUserExists = async (formattedPhone: string) => {
    try {
      const response = await fetch('http://localhost:3000/api/check-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber: formattedPhone }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check user');
      }

      return data;
    } catch (error) {
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const formattedPhone = phoneNumber.startsWith('+')
        ? phoneNumber
        : `+84${phoneNumber.replace(/^0+/, '')}`;

      const userData = await checkUserExists(formattedPhone);

      const confirmationResult = await signInWithPhoneNumber(
        auth,
        formattedPhone,
        window.recaptchaVerifier
      );

      window.confirmationResult = confirmationResult;

      localStorage.setItem('pendingUserDataAdmin', JSON.stringify(userData));

      // Set isVerified to true after successful verification
      setIsVerified(true);

      navigate('/verify', {
        state: {
          phoneNumber: formattedPhone
        }
      });
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed to send verification code');
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in with your phone
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your phone number to receive a verification code
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                type="tel"
                required
                disabled={loading}
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm disabled:bg-gray-100"
                placeholder="Phone number (e.g., 0987654321)"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}

          <div id="recaptcha-container"></div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
            >
              {loading ? 'Checking...' : 'Send Code'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login; 