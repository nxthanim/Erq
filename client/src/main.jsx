import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { KindeProvider } from '@kinde-oss/kinde-auth-react';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { CurrencyProvider } from './utils/currency';
import './index.css';

const kindeClientId = import.meta.env.VITE_KINDE_CLIENT_ID || 'e30a11dcf9fe4d88ac2adf279da6cd1c';
const kindeDomain = import.meta.env.VITE_KINDE_DOMAIN || 'https://erqmarketplace.kinde.com';
const appOrigin = import.meta.env.VITE_APP_URL || 'https://erq.cc.cd';

const appProviders = (
  <KindeProvider
    clientId={kindeClientId}
    domain={kindeDomain}
    scope="openid profile email offline"
    redirectUri={appOrigin}
    logoutUri={appOrigin}
  >
    <CurrencyProvider>
      <AuthProvider>
        <LanguageProvider>
          <ThemeProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </ThemeProvider>
        </LanguageProvider>
      </AuthProvider>
    </CurrencyProvider>
  </KindeProvider>
);

const rootElement = document.getElementById('root');
const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <BrowserRouter>{appProviders}</BrowserRouter>
  </React.StrictMode>
);
