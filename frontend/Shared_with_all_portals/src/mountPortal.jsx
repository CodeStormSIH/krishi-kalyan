import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './styles/common.css';
import './styles/theme.css';
import App from './App';
import { initializeTheme } from './hooks/useTheme';

initializeTheme();

export function mountPortal(initialRole = 'farmer') {
  const roleFromPath = { farmer: 'farmer', admin: 'admin', operator: 'operator' }[window.location.pathname.split('/')[1]];
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <BrowserRouter>
        <App initialRole={roleFromPath || initialRole} />
      </BrowserRouter>
    </React.StrictMode>,
  );
}
