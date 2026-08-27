import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import './index.css';

// Surface every runtime error in dev tools so nothing fails silently
// (React boundaries only catch render errors — this catches the rest)
window.addEventListener('error', (event) => {
  console.error('[Uncaught error]', event.error || event.message);
});
window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled rejection]', event.reason);
});

// Clerk is the identity provider when a publishable key is configured.
// Without a key the app falls back to the legacy JWT auth flow.
const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// NOTE: HeroUI v3 (React 19, Tailwind v4) needs NO provider wrapper —
// the v2 `HeroUIProvider` naming was removed in the v3 rewrite.
const appProviders = (
  <AuthProvider>
    <LanguageProvider>
      <ThemeProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </ThemeProvider>
    </LanguageProvider>
  </AuthProvider>
);

// Clerk's post-auth redirects must go through React Router (routerPush /
// routerReplace) instead of a full page reload. Otherwise after signing in
// the browser reloads, and combined with the AuthContext bridge re-syncing it
// causes a visible "glitch" / missed redirect. This wrapper must live inside
// <BrowserRouter> so it can use useNavigate().
function ClerkWithRouter({ children }) {
  const navigate = useNavigate();
  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      signInUrl="/login"
      signUpUrl="/signup"
      // Modern Clerk v5 props: afterSignInUrl/afterSignUpUrl are deprecated and
      // get silently overridden by the fallbackRedirectUrl family. Landing on
      // "/" lets the AuthContext bridge route by role (admin/choose-role/home).
      fallbackRedirectUrl="/"
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
      appearance={{
        variables: {
          colorPrimary: '#1f6f5c',
          colorBackground: '#ffffff',
          colorText: '#173a32',
          borderRadius: '12px',
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}

const rootElement = document.getElementById('root');
const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      {CLERK_PUBLISHABLE_KEY ? (
        <ClerkWithRouter>{appProviders}</ClerkWithRouter>
      ) : (
        appProviders
      )}
    </BrowserRouter>
  </React.StrictMode>
);
