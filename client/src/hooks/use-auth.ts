import { useState, useEffect } from 'react';
import { authManager, type User } from '@/lib/auth';

export function useAuth() {
  const [user, setUser] = useState<User | null>(authManager.getUser());
  const [isAuthenticated, setIsAuthenticated] = useState(authManager.isAuthenticated());

  useEffect(() => {
    const checkAuth = () => {
      setUser(authManager.getUser());
      setIsAuthenticated(authManager.isAuthenticated());
    };

    // Check auth status on mount
    checkAuth();

    // Listen for storage changes (multi-tab support)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_token' || e.key === 'auth_user') {
        checkAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const login = async (email: string, password: string) => {
    const result = await authManager.login(email, password);
    setUser(result.user);
    setIsAuthenticated(true);
    return result;
  };

  const register = async (email: string, password: string, name: string) => {
    const result = await authManager.register(email, password, name);
    setUser(result.user);
    setIsAuthenticated(true);
    return result;
  };

  const logout = () => {
    authManager.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  return {
    user,
    isAuthenticated,
    login,
    register,
    logout
  };
}
