"use client";

import React from 'react';
import LogoutButton from '@/components/LogoutButton';

interface PageHeaderProps {
  title: string;
}

export const PageHeader = ({ title }: PageHeaderProps) => {
  return (
    <header className="flex items-center justify-between p-4 bg-background">
      <h1 className="text-2xl font-bold">{title}</h1>
      <LogoutButton />
    </header>
  );
};