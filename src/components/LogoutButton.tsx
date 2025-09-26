"use client";

import React from 'react';
import { Button } from '@/components/ui/button';

const LogoutButton = () => {
  const handleLogout = () => {
    // Placeholder logout logic
    console.log('User logged out');
  };

  return (
    <Button variant="outline" onClick={handleLogout}>
      Logout
    </Button>
  );
};

export default LogoutButton;