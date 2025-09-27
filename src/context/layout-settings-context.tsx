"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface LayoutSettingsContextType {
  isWideLayout: boolean;
  setIsWideLayout: (value: boolean) => void;
}

const LayoutSettingsContext = createContext<LayoutSettingsContextType | undefined>(undefined);

export const LayoutSettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isWideLayout, setIsWideLayout] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const storedValue = localStorage.getItem('app-wide-layout');
      return storedValue ? JSON.parse(storedValue) : false;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('app-wide-layout', JSON.stringify(isWideLayout));
    }
  }, [isWideLayout]);

  return (
    <LayoutSettingsContext.Provider value={{ isWideLayout, setIsWideLayout }}>
      {children}
    </LayoutSettingsContext.Provider>
  );
};

export const useLayoutSettings = () => {
  const context = useContext(LayoutSettingsContext);
  if (context === undefined) {
    throw new Error('useLayoutSettings must be used within a LayoutSettingsProvider');
  }
  return context;
};