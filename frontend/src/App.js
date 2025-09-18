import React, { useState, useEffect } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";
import Landing from "./components/Landing";
import WidgetDemo from "./components/WidgetDemo";
import Dashboard from "./components/Dashboard";
import AdminPortal from "./components/AdminPortal";
import ErrorBoundary from "./components/ErrorBoundary";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Simple auth context
const AuthContext = React.createContext();

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);

  const login = async (userData) => {
    setCurrentUser(userData);
    localStorage.setItem('modq_user', JSON.stringify(userData));
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('modq_user');
  };

  const register = async (username, email, role = 'employee') => {
    try {
      setLoading(true);
      const response = await axios.post(`${API}/auth/register`, {
        username,
        email,
        role
      });
      await login(response.data);
      toast.success("Account created successfully!");
      return response.data;
    } catch (error) {
      toast.error(error.response?.data?.detail || "Registration failed");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem('modq_user');
    if (stored) {
      setCurrentUser(JSON.parse(stored));
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      currentUser,
      login,
      logout,
      register,
      loading
    }}>
      {children}
    </AuthContext.Provider>
  );
};

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/widget-demo" element={<WidgetDemo />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admin" element={<AdminPortal />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </div>
  );
}

export default App;