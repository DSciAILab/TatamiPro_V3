"use client";

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { setTheme } = useTheme();
  const navigate = useNavigate();
  const [userName, setUserName] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const storedUserName = localStorage.getItem('userName');
    const storedUserRole = localStorage.getItem('userRole');
    setUserName(storedUserName);
    setUserRole(storedUserRole);
  }, []); // Executa uma vez ao montar o componente

  const handleLogout = () => {
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userClub');
    setUserName(null);
    setUserRole(null);
    navigate('/auth'); // Redireciona para a página de autenticação após o logout
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-primary text-primary-foreground p-4 shadow-md flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/" className="text-2xl font-bold">Tatamipro</Link>
          {userName && userRole && (
            <span className="text-lg ml-4">Olá, {userName} ({userRole})</span>
          )}
        </div>
        <div className="flex items-center space-x-4">
          {userName && userRole && ( // Mostra o botão de logout apenas se o usuário estiver logado
            <Button variant="ghost" onClick={handleLogout} className="text-primary-foreground hover:bg-primary-foreground/20">
              Sair
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/20">
                <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme("light")}>
                Light
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>
                Dark
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}>
                System
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <main className="flex-grow container mx-auto p-4">
        {children}
      </main>
    </div>
  );
};

export default Layout;