import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { registerSW } from 'virtual:pwa-register';
import App from './App.jsx';
import { AuthProvider } from './hooks/useAuth.jsx';
import './index.css';
import { initGlobalFormNavigation } from './utils/formNavigation';

initGlobalFormNavigation();

// Safely register PWA Service Worker with auto-updates without interrupting app bootstrap
try {
  registerSW({ immediate: true });
} catch (error) {
  console.warn('PWA service worker registration failed:', error);
}

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
