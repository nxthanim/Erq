import { createContext, useContext, useEffect, useState } from 'react';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { authAPI } from '../utils/api';

const AuthContext = createContext(null);

function kindeProfile(user) {
  if (!user) return {};
  return {
    email: user.email,
    full_name: [user.given_name || user.givenName, user.family_name || user.familyName].filter(Boolean).join(' '),
    profile_picture: user.picture || '',
  };
}

export function AuthProvider({ children }) {
  const { user: kindeUser, isAuthenticated, isLoading: kindeLoading, getAccessToken, login: kindeLogin, register: kindeRegister, logout: kindeLogout } = useKindeAuth();
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('erq_user') || 'null'); } catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem('erq_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const sync = async () => {
      if (kindeLoading) return;
      if (!isAuthenticated || !kindeUser || !(kindeUser.id || kindeUser.userId || kindeUser.email)) {
        // Kinde can briefly report an unauthenticated state while restoring its
        // session. Keep a valid local marketplace session instead of showing a
        // false sign-in prompt on public pages.
        if (active) setLoading(false);
        return;
      }
      try {
        const accessToken = await getAccessToken();
        if (!accessToken) throw new Error('Kinde access token unavailable');
        const response = await authAPI.kindeSync(accessToken, kindeProfile(kindeUser));
        if (!active) return;
        const appToken = response.data.token;
        localStorage.setItem('erq_token', appToken);
        localStorage.setItem('erq_user', JSON.stringify(response.data.user));
        setToken(appToken); setUser(response.data.user);
      } catch (error) {
        // Do not destroy the last known marketplace session on a transient
        // provider/profile error. An explicit logout still clears both stores.
        console.error('Kinde marketplace session sync failed:', error);
      } finally {
        if (active) setLoading(false);
      }
    };
    sync();
    return () => { active = false; };
  }, [kindeLoading, isAuthenticated, kindeUser, getAccessToken]);

  const login = async () => { await kindeLogin({ lang: 'en' }); };
  const signup = async () => { await kindeRegister({ lang: 'en' }); };
  const logout = async () => { localStorage.removeItem('erq_token'); localStorage.removeItem('erq_user'); setToken(null); setUser(null); await kindeLogout({ redirectUrl: window.location.origin }); };
  const updateUser = (userData) => {
    setUser(prev => ({ ...prev, ...userData }));
    localStorage.setItem('erq_user', JSON.stringify({ ...JSON.parse(localStorage.getItem('erq_user') || '{}'), ...userData }));
  };

  return <AuthContext.Provider value={{ user, token, loading: loading || kindeLoading, login, signup, logout, updateUser }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
