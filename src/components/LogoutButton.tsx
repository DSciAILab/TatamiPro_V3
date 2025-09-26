"use client";

import React from 'react';
import { Button } from '@/components/ui/button'; // Caminho correto para o Button do shadcn/ui
import { useNavigate } from 'react-router-dom'; // Importar useNavigate

export default function LogoutButton() {
  const navigate = useNavigate(); // Usar useNavigate para redirecionamento

  const handleLogout = () => {
    // Lógica de logout: remover informações do usuário do localStorage
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userClub');
    console.log('User logged out');
    navigate('/auth'); // Redireciona para a página de autenticação
  };

  return (
    <Button variant="outline" onClick={handleLogout} className="mt-4">
      Logout
    </Button>
  );
}