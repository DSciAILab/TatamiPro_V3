"use client";

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/auth-context';

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { profile, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>; // Or a spinner component
  }

  if (profile?.role !== 'admin') {
    // Redirect them to the home page if they are not an admin
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;