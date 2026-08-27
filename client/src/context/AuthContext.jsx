import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser, useAuth as useClerkAuth } from '@clerk/clerk-react';
import { authAPI, setAuthTokenProvider } from '../utils/api';

const AuthContext = createContext(null);

const CLERK_ENABLED = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

// ==========================================================================
// LEGACY JWT AUTH (fallback — used when Clerk is not configured)
// ==========================================================================
function LegacyAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('erq_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      authAPI.me()
        .then(res => setUser(res.data.user))
        .catch(() => {
          localStorage.removeItem('erq_token');
          localStorage.removeItem('gebeya_user');
          setToken(null);
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    localStorage.setItem('erq_token', res.data.token);
    localStorage.setItem('gebeya_user', JSON.stringify(res.data.user));
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const signup = async (data) => {
    const res = await authAPI.signup(data);
    localStorage.setItem('erq_token', res.data.token);
    localStorage.setItem('gebeya_user', JSON.stringify(res.data.user));
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('erq_token');
    localStorage.removeItem('gebeya_user');
    setToken(null);
    setUser(null);
  };

  const updateUser = (userData) => {
    setUser(prev => ({ ...prev, ...userData }));
    localStorage.setItem('gebeya_user', JSON.stringify({ ...JSON.parse(localStorage.getItem('gebeya_user') || '{}'), ...userData }));
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// ==========================================================================
// CLERK AUTH BRIDGE — identity comes from Clerk; app JWT comes from
// POST /api/auth/clerk/sync so all existing API routes work unchanged.
// Only rendered inside <ClerkProvider> (see main.jsx) when a key exists.
// ==========================================================================
function ClerkAuthBridge({ children }) {
  const { isLoaded, isSignedIn, user: clerkUser } = useUser();
  const { getToken, signOut: clerkSignOut } = useClerkAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState('');

  const sync = useCallback(async () => {
    if (!isSignedIn || !clerkUser) {
      setUser(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const sessionToken = await getToken();
      // Pass the real profile from Clerk's SDK so the backend can create the
      // user with the correct name even when CLERK_SECRET_KEY is not set.
      const profile = {
        full_name: clerkUser.fullName || clerkUser.username || '',
        email: clerkUser.primaryEmailAddress?.emailAddress || '',
        profile_picture: clerkUser.imageUrl || clerkUser.externalAccounts?.[0]?.avatarUrl || '',
      };
      const res = await authAPI.clerkSync(sessionToken, profile);
      let appUser = res.data.user;
      // If the backend fell back to the generic "Clerk User" placeholder
      // (no CLERK_SECRET_KEY, no name in token claims), overlay the real name
      // the client already knows so the UI never shows the placeholder.
      if ((!appUser.full_name || appUser.full_name === 'Clerk User') && profile.full_name) {
        appUser = { ...appUser, full_name: profile.full_name };
      }
      // Clerk remains the token issuer. Sync only upserts the profile in the
      // Supabase-backed API and returns the normalized application user.
      localStorage.removeItem('erq_token');
      localStorage.setItem('gebeya_user', JSON.stringify(appUser));
      setToken(sessionToken);
      setUser(appUser);
      setSyncError('');
    } catch (err) {
      console.error('❌ Clerk sync failed:', err?.response?.data || err.message);
      setSyncError(err?.response?.data?.error || 'Could not sync Clerk session');
      // Graceful fallback: derive a minimal user from Clerk's data so the
      // user is not stranded on the auth page even if the backend sync fails.
      // The backend user record (with full role, wallet, etc.) will sync on
      // next page load when the backend is reachable.
      const fallbackUser = {
        id: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress || '',
        full_name: clerkUser.fullName || clerkUser.username || 'Clerk User',
        role: 'client',
        profile_picture: clerkUser.imageUrl || clerkUser.externalAccounts?.[0]?.avatarUrl || '',
        verified: 1,
        rating: 0,
        review_count: 0,
      };
      localStorage.setItem('gebeya_user', JSON.stringify(fallbackUser));
      setUser(fallbackUser);
      // Do not persist Clerk session tokens. The provider below fetches a fresh
      // token for each request so Clerk can rotate sessions safely.
      localStorage.removeItem('erq_token');
      setToken(sessionToken || null);
    } finally {
      setLoading(false);
    }
  }, [isSignedIn, clerkUser, getToken]);

  useEffect(() => {
    setAuthTokenProvider(isSignedIn ? getToken : null);
    return () => setAuthTokenProvider(null);
  }, [isSignedIn, getToken]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      localStorage.removeItem('erq_token');
      localStorage.removeItem('gebeya_user');
      setAuthTokenProvider(null);
      setUser(null);
      setToken(null);
      setLoading(false);
      return;
    }
    sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn, clerkUser?.id]);

  // Single source of truth for post-login navigation (replaces the old
  // window.history.pushState hack that fought React Router, and the duplicate
  // redirects in Login/Signup). Clerk's fallbackRedirectUrl lands everyone on
  // "/" after sign-in, so we route by role here:
  //   - admin                              -> /admin
  //   - new Clerk user (default 'client', no role picked yet) -> /choose-role
  //   - signed-in user on /login or /signup -> their home
  // Existing users (erq_role_selected set) simply land on the homepage.
  useEffect(() => {
    if (!isLoaded || !user) return;
    const path = location.pathname;
    const needsRole = !localStorage.getItem('erq_role_selected') && user.role === 'client';
    if (path === '/login' || path === '/signup') {
      navigate(user.role === 'admin' ? '/admin' : needsRole ? '/choose-role' : '/', { replace: true });
      return;
    }
    if (path === '/' && user.role === 'admin') {
      navigate('/admin', { replace: true });
      return;
    }
    if (needsRole && path === '/') {
      navigate('/choose-role', { replace: true });
    }
  }, [isLoaded, user, location.pathname, navigate]);

  const login = () => { /* Clerk handles sign-in on /login */ };
  const signup = () => { /* Clerk handles sign-up on /signup */ };

  const logout = async () => {
    try { await clerkSignOut(); } catch {}
    localStorage.removeItem('erq_token');
    localStorage.removeItem('gebeya_user');
    setUser(null);
    setToken(null);
  };

  const updateUser = (userData) => {
    setUser(prev => ({ ...prev, ...userData }));
    localStorage.setItem('gebeya_user', JSON.stringify({ ...JSON.parse(localStorage.getItem('gebeya_user') || '{}'), ...userData }));
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout, updateUser, syncError }}>
      {children}
    </AuthContext.Provider>
  );
}

// ==========================================================================
// PUBLIC PROVIDER — picks Clerk bridge or legacy JWT
// ==========================================================================
export function AuthProvider({ children }) {
  return CLERK_ENABLED
    ? <ClerkAuthBridge>{children}</ClerkAuthBridge>
    : <LegacyAuthProvider>{children}</LegacyAuthProvider>;
}

export const useAuth = () => useContext(AuthContext);
