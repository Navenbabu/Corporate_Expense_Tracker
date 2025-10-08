import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import apiClient from "@/lib/apiClient"; // we'll use centralized axios instance

// ======================
// User type definition
// ======================
export interface User {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "employee";
  department: string;
  createdAt?: string;
  updatedAt?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    userData: { name: string; role: "admin" | "manager" | "employee"; department: string }
  ) => Promise<void>;
  logout: () => void;
}

// ======================
// Context Setup
// ======================
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};

interface Props {
  children: ReactNode;
}

// ======================
// Auth Provider
// ======================
export const AuthProvider: React.FC<Props> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from localStorage
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    const storedUser = localStorage.getItem("user_data");
    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  // LOGIN
  const login = async (email: string, password: string) => {
  setIsLoading(true);
  try {
    // 🔹 Send login request to backend
    const res = await apiClient.post("/auth/login", { email, password });

    // 🔹 Extract token and user from response
    const { token, user } = res.data;

    // ✅ Save token so apiClient sends it automatically on every request
    localStorage.setItem("auth_token", token);

    // (optional) keep user info for session restore
    localStorage.setItem("user_data", JSON.stringify(user));

    // Update state
    setUser(user);
  } catch (err: any) {
    console.error("Login failed:", err.response?.data || err.message);
    throw new Error(err.response?.data?.message || "Login failed");
  } finally {
    setIsLoading(false);
  }
};


  // REGISTER + Auto Login
  const register = async (
    email: string,
    password: string,
    userData: { name: string; role: "admin" | "manager" | "employee"; department: string }
  ) => {
    setIsLoading(true);
    try {
      const res = await apiClient.post("/auth/register", {
        name: userData.name,
        email,
        password,
        role: userData.role,
        department: userData.department,
      });
      const { token, user } = res.data;
      localStorage.setItem("auth_token", token);
      localStorage.setItem("user_data", JSON.stringify(user));
      setUser(user);
    } catch (err: any) {
      console.error("Registration failed:", err.response?.data || err.message);
      throw new Error(err.response?.data?.message || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  // LOGOUT
  const logout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_data");
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
