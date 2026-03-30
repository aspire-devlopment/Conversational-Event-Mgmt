import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { APP_ROUTES, STORAGE_KEYS } from '../../constants/appConstants';

const hasAuthSession = () => {
  const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  const user = localStorage.getItem(STORAGE_KEYS.USER);
  return Boolean(token && user);
};

const ProtectedRoute = ({ redirectTo = APP_ROUTES.LOGIN, children }) => {
  const location = useLocation();

  if (!hasAuthSession()) {
    return (
      <Navigate to={redirectTo} replace state={{ from: location.pathname }} />
    );
  }

  if (children) return children;
  return <Outlet />;
};

export default ProtectedRoute;

