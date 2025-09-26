"use client";

import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/mode-toggle'; // Assuming a mode-toggle component will be created

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
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