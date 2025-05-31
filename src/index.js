import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // ESTA LINHA É ESSENCIAL E DEVE ESTAR AQUI!
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();