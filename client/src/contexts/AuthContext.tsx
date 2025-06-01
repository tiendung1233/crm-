import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { auth } from '../firebaseConfig';

interface User {
  uid: string;
  role: 'admin' | 'user';
  email?: string;
  phoneNumber?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser: FirebaseUser | null) => {
      const userDataStr = localStorage.getItem('pendingUserData');
      const isCheck = userDataStr ? JSON.parse(userDataStr) : null;

      if (firebaseUser || isCheck) {
        const userDataAdmin = localStorage.getItem('pendingUserDataAdmin');

        let userData;
        if (userDataStr) {
          userData = JSON.parse(userDataStr);
        } else if (userDataAdmin) {
          userData = JSON.parse(userDataAdmin);
        }

        if (userData) {
          console.log('userData', userData);
          setUser({
            uid: firebaseUser?.uid ? firebaseUser.uid : isCheck.id,
            role: userData.role,
            email: userData.email,
            phoneNumber: userData.phoneNumber,
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}; 