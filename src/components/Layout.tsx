"use client";

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/mode-toggle';
import { useSupabaseSession } from '@/context/supabase-session-context'; // Import useSupabaseSession
import { supabase } from '@/integrations/supabase/client'; // Import supabase client
import { LogOut } from 'lucide-react'; // Import LogOut icon

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { session, isLoading } = useSupabaseSession(); // Get session and loading state
  const navigate = useNavigate();
  const userName = localStorage.getItem('userName'); // Keep for now, will be replaced by profile data

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error logging out:', error.message);
    } else {
      localStorage.removeItem('userRole');
      localStorage.removeItem('userName');
      localStorage.removeItem('userClub');
      navigate('/login'); // Redirect to login after logout
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 w-full border-b bg-background">
        <div className="container flex h-16 items-center justify-between py-4">
          <div className="flex items-center space-x-2">
            <Link to="/" className="text-2xl font-bold text-primary">
              TatamiPro
            </Link>
            {userName && (
              <span className="text-lg text-muted-foreground">({userName})</span>
            )}
          </div>
          <nav className="flex items-center space-x-4">
            <Link to="/events">
              <Button variant="ghost">Eventos</Button>
            </Link>
            <ModeToggle />
            {!isLoading && session ? (
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="h-[1.2rem] w-[1.2rem]" />
                <span className="sr-only">Sair</span>
              </Button>
            ) : (
              <Link to="/login">
                <Button variant="ghost">Entrar</Button>
              </Link>
            )}
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