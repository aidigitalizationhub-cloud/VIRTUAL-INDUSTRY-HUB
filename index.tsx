import React from 'react';
import ReactDOM from 'react-dom/client';
import './src/i18n';
import App from './App';
import './index.css';

// Prevent and silence development-only HMR WebSocket errors/rejections from showing as crashes or overlays
if (typeof window !== 'undefined') {
  const isWsError = (err: any): boolean => {
    if (!err) return false;
    const msg = String(err.message || err.reason || err.description || err).toLowerCase();
    const stack = err.stack ? String(err.stack).toLowerCase() : '';
    return (
      msg.includes('websocket') || 
      msg.includes('ws://') || 
      msg.includes('wss://') || 
      msg.includes('closed without opened') ||
      msg.includes('connection reset') ||
      stack.includes('websocket')
    );
  };

  window.addEventListener('unhandledrejection', (event) => {
    if (isWsError(event.reason)) {
      event.preventDefault();
      event.stopPropagation();
    }
  });

  window.addEventListener('error', (event) => {
    if (isWsError(event.error) || isWsError(event.message)) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);