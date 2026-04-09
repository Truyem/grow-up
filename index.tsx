import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { LiquidGlassProvider } from './components/ui/LiquidGlassContext';

// Suppress Recharts defaultProps warning
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  if (typeof args[0] === 'string' && /defaultProps will be removed from function components/.test(args[0])) {
    return;
  }
  originalConsoleError(...args);
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <LiquidGlassProvider>
      <App />
    </LiquidGlassProvider>
  </React.StrictMode>
);