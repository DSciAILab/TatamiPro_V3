"use client";

import React from 'react';
import { Link } from 'react-router-dom';
import { ModeToggle } from '@/components/mode-toggle';
import { LanguageToggle } from '@/components/LanguageToggle';
import { cn } from '@/lib/utils';

interface PublicLayoutProps {
  children: React.ReactNode;
}

const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 w-full border-b bg-background">
        <div className="container flex h-16 items-center justify-between py-4">
          <Link to="/" className="text-2xl font-bold text-primary">
            TatamiPro
          </Link>
          <nav className="flex items-center space-x-2">
            <LanguageToggle />
            <ModeToggle />
          </nav>
        </div>
      </header>
      <main className={cn("flex-1 py-8 container")}>
        {children}
      </main>
    </div>
  );
};

export default PublicLayout;