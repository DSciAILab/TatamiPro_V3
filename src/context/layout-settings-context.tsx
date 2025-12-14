"use client";

import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { useAuth } from './auth-context';

interface LayoutSettingsContextType {
  isWideLayout: boolean;
  setIsWideLayout: (value: boolean) => void;
}

const LayoutSettingsContext = createContext<LayoutSettingsContextType | undefined>(undefined);

export const LayoutSettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { profile, updateProfile } = useAuth();

  const isWideLayout = profile?.prefers_wide_layout || false;

  const setIsWideLayout = useCallback((value: boolean) => {
    if (profile) {
      updateProfile({ prefers_wide_layout: value });
    }
  }, [profile, updateProfile]);

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