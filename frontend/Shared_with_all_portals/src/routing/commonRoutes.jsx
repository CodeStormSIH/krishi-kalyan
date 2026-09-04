import React from 'react';
import { Navigate } from 'react-router-dom';
import { Profile, Logout, Support, Notifications } from '../pages/CommonPages';

export function commonRoutes(role) {
  return [
    { index: true, element: <Navigate to="dashboard" replace /> },
    { path: 'profile', element: <Profile /> },
    { path: 'notifications', element: <Notifications /> },
    { path: 'support', element: <Support /> },
    { path: 'help', element: <Navigate to={`/${role}/support`} replace /> },
    { path: 'logout', element: <Logout /> },
    { path: '*', element: <Navigate to={`/${role}/dashboard`} replace /> },
  ];
}
