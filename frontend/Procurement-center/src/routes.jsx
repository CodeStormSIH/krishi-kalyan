import React from 'react';
import { commonRoutes } from '@shared/routing/commonRoutes';
import Dashboard from './pages/Dashboard';
import Management from './pages/Management';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Stages from './pages/Stages';
import './styles/tailwind.css';
import './styles/portal.css';

export default [
  ...commonRoutes('operator'),
  { path: 'dashboard', element: <Dashboard /> },
  { path: 'reports', element: <Reports /> },
  { path: 'settings', element: <Settings /> },
  { path: 'stages', element: <Stages /> },
  ...['farmers', 'queue', 'procurement', 'payments'].map(page => ({
    path: page,
    element: <Management key={page} page={page} />,
  })),
];
