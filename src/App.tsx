"use client";

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Index from './pages/Index';
import Auth from './pages/Auth';
import EventDetail from './pages/EventDetail';
import RegistrationOptions from './pages/RegistrationOptions';
import RegisterAthletePage from './pages/RegisterAthletePage'; // Importar o novo componente
import BatchAthleteImport from './pages/BatchAthleteImport';
import DivisionImport from './pages/DivisionImport';
import { ThemeProvider } from './components/theme-provider';

const App: React.FC = () => {
  const isAuthenticated = localStorage.getItem('userRole') !== null;

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/auth" />} />
          <Route path="/auth" element={<Auth />} />
          {isAuthenticated ? (
            <>
              <Route path="/events" element={<Index />} />
              <Route path="/events/:id" element={<EventDetail />} />
              <Route path="/events/:id/registration-options" element={<RegistrationOptions />} />
              <Route path="/events/:id/register-athlete" element={<RegisterAthletePage />} /> {/* Usar o novo componente */}
              <Route path="/events/:id/import-athletes" element={<BatchAthleteImport />} />
              <Route path="/events/:id/import-divisions" element={<DivisionImport />} />
            </>
          ) : (
            <Route path="*" element={<Navigate to="/auth" />} />
          )}
        </Routes>
      </Router>
    </ThemeProvider>
  );
};

export default App;