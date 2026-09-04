import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './styles/common.css';
import App from './App';

export function mountPortal(initialRole = 'farmer') {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <BrowserRouter>
        <App initialRole={initialRole} />
      </BrowserRouter>
    </React.StrictMode>,
  );
}
