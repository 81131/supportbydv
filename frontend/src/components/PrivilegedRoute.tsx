import React from 'react';
import { Navigate } from 'react-router-dom';

interface PrivilegedRouteProps {
  user: any;
  children: React.ReactNode;
}

const PrivilegedRoute: React.FC<PrivilegedRouteProps> = ({ user, children }) => {
  if (!user) return <Navigate to="/forbidden" replace />;
  if (user.role !== 'admin' && user.role !== 'noOne') {
      return <Navigate to="/forbidden" replace />;
  }
  return <>{children}</>;
};

export default PrivilegedRoute;
