import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/global.css';
import './index.css';
import { ClerkProvider } from '@clerk/clerk-react';

// const PUBLISHABLE_KEY = 'pk_live_Y2xlcmsudHJpZWRhbmR0cnVzdGVkLmFpJA';
const PUBLISHABLE_KEY = 'pk_test_dWx0aW1hdGUtdGlnZXItOTIuY2xlcmsuYWNjb3VudHMuZGV2JA';

if (!PUBLISHABLE_KEY) {
  throw new Error('Add your Clerk Publishable Key to the .env file');
}

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <App />
    </ClerkProvider>
  </React.StrictMode>
);