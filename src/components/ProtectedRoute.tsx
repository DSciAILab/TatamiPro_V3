"use client";

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSession } from './SessionContextProvider';
import Layout from './Layout';

const ProtectedRoute: React.FC = () => {
  const { session, isLoading } = useSession();

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[calc(100vh-128px)]">
          <p>Carregando sessão...</p>
        </div>
      </Layout>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;