import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import { Toaster } from 'react-hot-toast';


ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    root.render(
  <StrictMode>
    <App />
    <Toaster 
      position="top-right"
      toastOptions={{
        style: {
          background: '#1f1a16',
          color: '#f5efe2',
          border: '1px solid rgba(255,255,255,0.1)',
        },
        success: {
          iconTheme: { primary: '#6ce3cf', secondary: '#1f1a16' },
        },
        error: {
          iconTheme: { primary: '#ff8570', secondary: '#1f1a16' },
        },
      }}
    />
  </StrictMode>
);
  </React.StrictMode>,
);
