import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '../firebaseConfig';

interface LocationState {
  phoneNumber: string;
}

const Verify = () => {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { phoneNumber } = location.state as LocationState;

  useEffect(() => {
    // Check if user is already logged in
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        navigate('/admin');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const confirmationResult = window.confirmationResult;
      const result = await confirmationResult.confirm(otp);

      if (result.user) {
        const uid = result.user.uid;

        // Lưu UID vào localStorage
        localStorage.setItem('token', uid);

        // Gọi API để cập nhật trường idAdmin trong Firestore
        await fetch('http://localhost:3000/api/update-admin-id', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phone: phoneNumber,
            uid: uid,
          }),
        });

        // Tiếp tục xử lý đăng nhập với custom token
        const userDataStr = localStorage.getItem('pendingUserData');
        if (!userDataStr) {
          throw new Error('No pending user data found');
        }

        const userData = JSON.parse(userDataStr);
        await signInWithCustomToken(auth, userData.customToken);

        localStorage.removeItem('pendingUserData');
        navigate('/admin');
      }
    } catch (error: unknown) {
      setError('Invalid OTP. Please try again.');
      console.error('Verification error:', error);
    } finally {
      setLoading(false);
    }
  };



  const handleBack = () => {
    localStorage.removeItem('pendingUserData');
    navigate('/login');
  };

  const handleResend = async () => {
    try {
      const confirmationResult = window.confirmationResult;
      await confirmationResult.confirm(otp);
      alert('Verification code resent!');
    } catch (error: unknown) {
      setError('Failed to resend code. Please try again.');
      console.error('Resend error:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <button
            onClick={handleBack}
            className="text-blue-600 hover:text-blue-500 mb-4"
            disabled={loading}
          >
            ← Back
          </button>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Verify Your Phone
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter the verification code sent to {phoneNumber}
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                type="text"
                required
                disabled={loading}
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm disabled:bg-gray-100"
                placeholder="Enter verification code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </div>

          <div className="text-sm text-center">
            <button
              type="button"
              onClick={handleResend}
              disabled={loading}
              className="font-medium text-blue-600 hover:text-blue-500 disabled:text-blue-400"
            >
              Didn't receive code? Send again
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Verify; 