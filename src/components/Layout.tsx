"use client";

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/mode-toggle';
import { showSuccess } from '@/utils/toast';
import { LogOut } from 'lucide-react';
import { useTranslations } from '@/hooks/use-translations';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/integrations/supabase/client';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const { t } = useTranslations();
  const { session, profile } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    showSuccess('Logout realizado com sucesso!');
    navigate('/auth');
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 w-full border-b bg-background">
        <div className="container flex h-16 items-center justify-between py-4">
          <div className="flex items-center space-x-2">
            <Link to="/" className="text-2xl font-bold text-primary">
              TatamiPro
            </Link>
            {profile && (
              <span className="text-lg text-muted-foreground">({profile.first_name})</span>
            )}
          </div>
          <nav className="flex items-center space-x-2">
            <Link to="/events">
              <Button variant="ghost">{t('events')}</Button>
            </Link>
            {session && (
              <Link to="/account-security">
                <Button variant="ghost">Security</Button>
              </Link>
            )}
            <ModeToggle />
            {session && (
              <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Logout">
                <LogOut className="h-5 w-5" />
              </Button>
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