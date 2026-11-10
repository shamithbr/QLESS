import React, { useState, useEffect } from 'react';
import { User } from './types/index.ts';
import { api, getStoredToken } from './services/api.ts';
import { LoginPage } from './components/LoginPage.tsx';
import { StudentFacultyPanel } from './components/StudentFacultyPanel.tsx';
import { RestaurantOwnerPanel } from './components/RestaurantOwnerPanel.tsx';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Check existing session on initial load
  useEffect(() => {
    const checkSession = async () => {
      const token = getStoredToken();
      if (!token) {
        setIsInitializing(false);
        return;
      }

      try {
        const res = await api.getCurrentUser();
        if (res.user) {
          setCurrentUser(res.user);
        }
      } catch (err) {
        console.warn('Existing session invalid or expired. Prompting login.');
      } finally {
        setIsInitializing(false);
      }
    };

    checkSession();
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-3 border-orange-200 border-t-orange-600 rounded-full animate-spin mb-3" />
        <p className="text-xs font-semibold text-slate-500 tracking-wide uppercase font-mono">
          Loading QLESS Canteen...
        </p>
      </div>
    );
  }

  // FIRST PAGE MUST BE THE LOGIN PAGE (Section 3 Requirement)
  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // ROLE-BASED PANEL ROUTING: ONLY TWO APPLICATION PANELS (Section 4 Requirement)
  // Panel A: Student and Faculty Panel
  if (currentUser.role === 'student' || currentUser.role === 'faculty') {
    return <StudentFacultyPanel user={currentUser} onLogout={handleLogout} />;
  }

  // Panel B: Restaurant Owner Panel
  if (currentUser.role === 'restaurant_owner') {
    return <RestaurantOwnerPanel user={currentUser} onLogout={handleLogout} />;
  }

  // Fallback to login if unexpected role
  return <LoginPage onLoginSuccess={handleLoginSuccess} />;
}
