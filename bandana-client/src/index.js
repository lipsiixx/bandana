import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './shared/styles/fonts.css';
import './shared/styles/tokens.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
