import React from 'react';
import { Navigate } from 'react-router-dom';
import { commonRoutes } from '@shared/routing/commonRoutes';
import Dashboard from './pages/Dashboard';
import BookToken from './pages/BookToken';
import QueueStatus from './pages/QueueStatus';
import ProcurementStatus from './pages/ProcurementStatus';
import PaymentStatus from './pages/PaymentStatus';
import History from './pages/History';
import './styles/tailwind.css';
import './styles/portal.css';

export default [
  ...commonRoutes('farmer'),
  { path: 'dashboard', element: <Dashboard /> },
  { path: 'book-token', element: <BookToken /> },
  { path: 'queue', element: <QueueStatus /> },
  { path: 'procurement', element: <ProcurementStatus /> },
  { path: 'payment', element: <PaymentStatus /> },
  { path: 'payments', element: <Navigate to="/farmer/payment" replace /> },
  { path: 'history', element: <History /> },
];
