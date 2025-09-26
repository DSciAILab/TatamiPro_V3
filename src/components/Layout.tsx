"use client";

import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/mode-toggle';
import { useSession } from '@/components/SessionContextProvider'; // Import useSession
import { LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { userRole, isLoading } = useSession(); // Get userRole from session context

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showError('Erro ao fazer logout: ' + error.message);
    } else {
      showSuccess('Logout realizado com sucesso!');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 w-full border-b bg-background">
        <div className="container flex h-16 items-center justify-between py-4">
          <Link to="/" className="text-2xl font-bold text-primary">
            TatamiPro
          </Link>
          <nav className="flex items-center space-x-4">
            <Link to="/events">
              <Button variant="ghost">Eventos</Button>
            </Link>
            {userRole === 'admin' && (
              <Link to="/admin-dashboard"> {/* Exemplo de link para dashboard de admin */}
                <Button variant="ghost">Dashboard Admin</Button>
              </Link>
            )}
            {!isLoading && userRole && ( // Show logout button if user is logged in
              <Button variant="ghost" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" /> Sair
              </Button>
            )}
            <ModeToggle />
          </nav>
        </div>
      </header>
      <main className="flex-1 container py-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;