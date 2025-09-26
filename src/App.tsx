"use client";

import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './pages/Auth';
import Welcome from './pages/Welcome'; // Importar Welcome
import Events from './pages/Events'; // Importar Events
import EventDetail from './pages/EventDetail';
import RegistrationOptions from './pages/RegistrationOptions';
import RegisterAthletePage from './pages/RegisterAthletePage';
import BatchAthleteImport from './pages/BatchAthleteImport';
import DivisionImport from './pages/DivisionImport';
import { ThemeProvider } from './components/theme-provider';
import { User } from './types'; // Importar o tipo User
import { v4 as uuidv4 } from 'uuid';

const App: React.FC = () => {
  const isAuthenticated = localStorage.getItem('currentUser') !== null;

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

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Router>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          {isAuthenticated ? (
            <>
              <Route path="/" element={<Welcome />} /> {/* Rota raiz para Welcome se autenticado */}
              <Route path="/welcome" element={<Welcome />} />
              <Route path="/events" element={<Events />} /> {/* Página de listagem de eventos */}
              <Route path="/events/:id" element={<EventDetail />} />
              <Route path="/events/:id/registration-options" element={<RegistrationOptions />} />
              <Route path="/events/:id/register-athlete" element={<RegisterAthletePage />} />
              <Route path="/events/:id/import-athletes" element={<BatchAthleteImport />} />
              <Route path="/events/:id/import-divisions" element={<DivisionImport />} />
              {/* Catch-all para rotas não encontradas após login */}
              <Route path="*" element={<Navigate to="/" />} />
            </>
          ) : (
            // Redireciona qualquer rota para /auth se não autenticado
            <Route path="*" element={<Navigate to="/auth" />} />
          )}
        </Routes>
      </Router>
    </ThemeProvider>
  );
};

export default App;