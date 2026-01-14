"use client";

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useTheme } from "next-themes";
import { useLanguage } from "@/context/language-context";
import { showSuccess } from '@/utils/toast';
import { LogOut, User, Settings, ArrowLeft, Moon, Sun, Languages } from 'lucide-react';
import { useTranslations } from '@/hooks/use-translations';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { version } from '../../package.json';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import OfflineIndicator from '@/components/OfflineIndicator';
import ConnectionStatus from '@/components/ConnectionStatus';

interface AppLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  title?: string;
  description?: string;
  backUrl?: string;
}

/**
 * AppLayout - Full-page app-style layout with optional sidebar
 * Used for event detail pages to provide native-like experience
 */
const AppLayout: React.FC<AppLayoutProps> = ({ 
  children, 
  sidebar, 
  title, 
  description,
  backUrl = '/events' 
}) => {
  const navigate = useNavigate();
  const { t } = useTranslations();
  const { session, profile } = useAuth();
  const { setTheme } = useTheme();
  const { setLanguage } = useLanguage();

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
    <div className="h-screen flex flex-col overflow-hidden bg-background text-foreground">
      {/* Top Header Bar */}
      <header className="h-14 flex-shrink-0 border-b bg-background z-50">
        <div className="h-full px-4 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1 overflow-hidden mr-4">
            {/* Back Button */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate(backUrl)}
              className="lg:hidden flex-shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            
            {/* Logo */}
            <Link to="/" className="text-xl font-bold text-primary flex items-baseline flex-shrink-0">
              TatamiPro
              <span className="text-xs font-normal text-muted-foreground ml-1">v{version}</span>
            </Link>

            {/* Event Title (desktop only) */}
            {title && (
              <div className="hidden md:flex items-center gap-2 ml-4 pl-4 border-l overflow-hidden">
                <span className="font-semibold truncate">{title}</span>
              </div>
            )}
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <ConnectionStatus />
            <OfflineIndicator />
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
                  
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Sun className="mr-2 h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                      <Moon className="absolute mr-2 h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                      <span className="ml-6">Theme</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem onClick={() => setTheme("light")}>
                          Light
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTheme("dark")}>
                          Dark
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTheme("system")}>
                          System
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>

                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Languages className="mr-2 h-4 w-4" />
                      <span>Language</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem onClick={() => setLanguage("pt")}>
                          Português
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setLanguage("en")}>
                          English
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>

                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{t('logOut')}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button size="sm" onClick={() => navigate('/auth')}>{t('signIn')}</Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Area: Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Desktop: shown as sidebar, Mobile: renders floating menu button */}
        {sidebar && (
          <>
            {/* Desktop sidebar */}
            <aside className="hidden lg:flex flex-shrink-0">
              {sidebar}
            </aside>
            {/* Mobile sidebar (renders its own FAB trigger) */}
            <div className="lg:hidden">
              {sidebar}
            </div>
          </>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          {/* Mobile Event Header */}
          {title && (
            <div className="lg:hidden px-4 py-3 border-b bg-muted/30">
              <h1 className="text-lg font-bold truncate">{title}</h1>
              {description && <p className="text-sm text-muted-foreground truncate">{description}</p>}
            </div>
          )}

          {/* Content */}
          <div className="p-4 lg:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
