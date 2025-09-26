import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { signIn, signUp, signOut, User } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, userData: {
    name: string;
    role: 'admin' | 'manager' | 'employee';
    department: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    const checkSession = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const userData = localStorage.getItem('user_data');
        
        if (token && userData) {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
          console.log('Restored user session:', parsedUser);
        }
      } catch (error) {
        console.error('Session check error:', error);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      console.log('AuthContext login called with:', email);
      
      const response = await signIn(email, password);
      console.log('SignIn response:', response);
      
      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.user) {
        // Handle both Supabase and local response formats
        let userData: User;
        
        if ('profile' in response && response.profile) {
          // Supabase format
          const profile = response.profile as any;
          userData = {
            id: profile.id,
            email: profile.email,
            name: profile.name,
            role: profile.role,
            department: profile.department,
            created_at: profile.created_at,
            updated_at: profile.updated_at
          };
        } else {
          // Local format - response.user is already the User object
          const userObj = response.user as any;
          userData = {
            id: userObj.id,
            email: userObj.email,
            name: userObj.name,
            role: userObj.role,
            department: userObj.department,
            created_at: userObj.created_at,
            updated_at: userObj.updated_at
          };
        }
        
        setUser(userData);
        
        // Store session info if available
        if ('session' in response && response.session) {
          const session = response.session as any;
          localStorage.setItem('auth_token', session.access_token);
        } else {
          localStorage.setItem('auth_token', 'local-token-' + Date.now());
        }
        localStorage.setItem('user_data', JSON.stringify(userData));
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, userData: {
    name: string;
    role: 'admin' | 'manager' | 'employee';
    department: string;
  }) => {
    setIsLoading(true);
    try {
      // Fix: Pass userData object directly as the third parameter
      const response = await signUp(email, password, userData);
      
      if ('success' in response && !response.success) {
        throw new Error('Registration failed');
      }

      // Auto-login after successful registration
      await login(email, password);
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await signOut();
      setUser(null);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};