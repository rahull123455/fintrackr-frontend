import React, { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: 'var(--panel)',
          color: 'var(--text)',
          border: '1px solid var(--border)',
        },
        success: {
          iconTheme: {
            primary: '#6ce3cf',
            secondary: '#1f1a16',
          },
        },
        error: {
          iconTheme: {
            primary: '#ff8570',
            secondary: '#1f1a16',
          },
        },
      }}
    />
  </StrictMode>,
);