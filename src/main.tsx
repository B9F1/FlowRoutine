import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Default to dark theme to match new UI design
document.documentElement.classList.add('dark');

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
