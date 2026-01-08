"use client";

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/mode-toggle';
import { LanguageToggle } from '@/components/LanguageToggle';
import { showSuccess } from '@/utils/toast';
import { LogOut, User, Settings } from 'lucide-react';
import { useTranslations } from '@/hooks/use-translations';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/integrations/supabase/client';
import { useLayoutSettings } from '@/context/layout-settings-context';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import OfflineIndicator from '@/components/OfflineIndicator';
import ConnectionStatus from '@/components/ConnectionStatus';
import Breadcrumbs from '@/components/Breadcrumbs';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const { t } = useTranslations();
  const { session, profile } = useAuth();
  const { isWideLayout } = useLayoutSettings();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    showSuccess('Successfully logged out!');
    navigate('/auth');
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.[0] || '';
    const last = lastName?.[0] || '';
    return `${first}${last}`.toUpperCase();
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 w-full border-b bg-background">
        <div className="container flex h-16 items-center justify-between py-4">
          <div className="flex items-center space-x-4">
            <Link to="/" className="text-2xl font-bold text-primary">
              TatamiPro
            </Link>
            <nav className="hidden md:flex items-center space-x-2">
              {profile?.role !== 'staff' && (
                <Link to="/events">
                  <Button variant="ghost">{t('events')}</Button>
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center space-x-2">
            <ConnectionStatus />
            <OfflineIndicator />
            <LanguageToggle /> {/* Botão de idioma adicionado ao cabeçalho */}
            <ModeToggle />
            {session && profile ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile.avatar_url || undefined} alt={`${profile.first_name} ${profile.last_name}`} />
                      <AvatarFallback>{getInitials(profile.first_name, profile.last_name)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{profile.first_name} {profile.last_name}</p>
                      <p className="text-xs leading-none text-muted-foreground">{session.user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    <span>{t('profile')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/account-security')}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>{t('security')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{t('logOut')}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button onClick={() => navigate('/auth')}>{t('signIn')}</Button>
            )}
          </div>
        </div>
      </header>
      <main className={cn("flex-1 py-8", isWideLayout ? "px-4" : "container")}>
        {profile?.role !== 'staff' && <Breadcrumbs />}
        {children}
      </main>
    </div>
  );
};

export default Layout;