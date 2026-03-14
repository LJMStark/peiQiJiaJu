'use client';

import { useState } from 'react';
import { ApiKeyGuard } from '@/components/ApiKeyGuard';
import { Login } from '@/components/Login';
import { Dashboard } from '@/components/Dashboard';

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [companyName, setCompanyName] = useState('');

  const handleLogin = (name: string) => {
    setCompanyName(name);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCompanyName('');
  };

  return (
    <ApiKeyGuard>
      {isLoggedIn ? (
        <Dashboard companyName={companyName} onLogout={handleLogout} />
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </ApiKeyGuard>
  );
}
