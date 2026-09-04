import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { StoreProvider, useStore } from './services/store';
import { Login } from './pages/CommonPages';
import farmerRoutes from '../../Farmer-portal/src/routes';
import adminRoutes from '../../Admin-portal/src/routes';
import procurementRoutes from '../../Procurement-center/src/routes';

const portals = [
  { role: 'farmer', folder: 'Farmer-portal', routes: farmerRoutes },
  { role: 'admin', folder: 'Admin-portal', routes: adminRoutes },
  { role: 'operator', folder: 'Procurement-center', routes: procurementRoutes },
];

function Guard({ role }) {
  const { session } = useStore();
  if (!session) return <Navigate to="/login" replace />;
  if (session.role !== role) return <Navigate to={`/${session.role}/dashboard`} replace />;
  return <Layout />;
}

function Home() {
  const { session } = useStore();
  return <Navigate to={session ? `/${session.role}/dashboard` : '/login'} replace />;
}

export default function App({ initialRole }) {
  return (
    <StoreProvider>
      <Routes>
        <Route path="/login" element={<Login initialRole={initialRole} />} />
        <Route path="/" element={<Home />} />
        {portals.map(({ role, routes }) => (
          <Route key={role} path={role} element={<Guard role={role} />}>
            {routes.map(({ path, index, element }) => (
              <Route key={index ? 'index' : path} index={index} path={path} element={element} />
            ))}
          </Route>
        ))}
        {portals.flatMap(({ folder, role }) => ['', '/index.html'].map(suffix => (
          <Route key={folder + suffix} path={`/${folder}${suffix}`} element={<Navigate to={`/${role}/dashboard`} replace />} />
        )))}
        {['dashboard', 'profile', 'book-token', 'queue', 'procurement', 'payments', 'notifications', 'history', 'help', 'logout'].map(page => (
          <Route key={page} path={page} element={<Navigate to={`/farmer/${page === 'payments' ? 'payment' : page === 'help' ? 'support' : page}`} replace />} />
        ))}
        <Route path="*" element={<Home />} />
      </Routes>
    </StoreProvider>
  );
}
