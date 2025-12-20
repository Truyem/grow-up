import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Import Inter font (Latin + Vietnamese subsets)
import "@fontsource/inter/vietnamese-300.css";
import "@fontsource/inter/latin-300.css";
import "@fontsource/inter/vietnamese-400.css";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/vietnamese-500.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/vietnamese-600.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/vietnamese-700.css";
import "@fontsource/inter/latin-700.css";

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
    <App />
  </React.StrictMode>
);