import { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Mock Google Sign-In
  const signInWithGoogle = async () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockUser = {
          uid: 'mock-google-123',
          displayName: 'Test User',
          email: 'test@example.com',
          phoneNumber: '+91 98765 00000'
        };
        setUser(mockUser);
        resolve(mockUser);
      }, 800);
    });
  };

  // Mock Phone OTP Setup
  const setupRecaptcha = (phoneNumber) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Return a mocked confirmationResult object
        resolve({
          confirm: async (otp) => {
            if (otp.length === 6) {
              const mockUser = {
                uid: 'mock-phone-456',
                displayName: 'Emergency Caller',
                email: '',
                phoneNumber: phoneNumber
              };
              setUser(mockUser);
              return mockUser;
            } else {
              throw new Error('Invalid OTP. Please enter any 6 digits.');
            }
          }
        });
      }, 1000);
    });
  };

  useEffect(() => {
    // Simulate auth state checking on boot
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, setupRecaptcha }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
