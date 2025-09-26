"use client";

import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './pages/Auth';
import Welcome from './pages/Welcome';
import Events from './pages/Events';
import EventDetail from './pages/EventDetail';
import RegistrationOptions from './pages/RegistrationOptions';
import RegisterAthletePage from './pages/RegisterAthletePage';
import BatchAthleteImport from './pages/BatchAthleteImport';
import DivisionImport from './pages/DivisionImport';
import NotFound from './pages/NotFound'; // Importar NotFound
import { ThemeProvider } from './components/theme-provider';
import { User } from './types';
import { v4 as uuidv4 } from 'uuid';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Inicializa usuários de demonstração no localStorage se não existirem
  useEffect(() => {
    const storedUsers = localStorage.getItem('users');
    if (!storedUsers) {
      const defaultUsers: User[] = [
        { id: uuidv4(), email: 'admin@tatamipro.com', password: 'admin123', role: 'admin', club: 'Tatamipro HQ', isActive: true, name: 'Admin' },
        { id: uuidv4(), email: 'coach@tatamipro.com', password: 'coach123', role: 'coach', club: 'Gracie Barra', isActive: true, name: 'Coach' },
        { id: uuidv4(), email: 'staff@tatamipro.com', password: 'staff123', role: 'staff', club: 'Alliance', isActive: true, name: 'Staff' },
        { id: uuidv4(), email: 'athlete@tatamipro.com', password: 'athlete123', role: 'athlete', club: 'Checkmat', isActive: true, name: 'Atleta' },
      ];
      localStorage.setItem('users', JSON.stringify(defaultUsers));
    }
  }, []);

  // Efeito para verificar o status de autenticação e reagir a mudanças
  useEffect(() => {
    const checkAuthStatus = () => {
      const currentUser = localStorage.getItem('currentUser');
      setIsAuthenticated(currentUser !== null);
    };

    checkAuthStatus();
    window.addEventListener('authChange', checkAuthStatus);

    return () => {
      window.removeEventListener('authChange', checkAuthStatus);
    };
  }, []);

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Router>
        <Routes>
          <Route path="/" element={<Welcome />} /> {/* Welcome é sempre acessível */}
          <Route path="/auth" element={<Auth />} />

          {/* Rotas Protegidas */}
          <Route path="/events" element={isAuthenticated ? <Events /> : <Navigate to="/auth" />} />
          <Route path="/events/:id" element={isAuthenticated ? <EventDetail /> : <Navigate to="/auth" />} />
          <Route path="/events/:id/registration-options" element={isAuthenticated ? <RegistrationOptions /> : <Navigate to="/auth" />} />
          <Route path="/events/:id/register-athlete" element={isAuthenticated ? <RegisterAthletePage /> : <Navigate to="/auth" />} />
          <Route path="/events/:id/import-athletes" element={isAuthenticated ? <BatchAthleteImport /> : <Navigate to="/auth" />} />
          <Route path="/events/:id/import-divisions" element={isAuthenticated ? <DivisionImport /> : <Navigate to="/auth" />} />

          {/* Rota para páginas não encontradas */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
};

export default App;