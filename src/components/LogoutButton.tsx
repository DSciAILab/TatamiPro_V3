"use client";

import React from 'react';
import { Button } from 'shadcn/ui/button';

export default function LogoutButton() {
  const handleLogout = () => {
    // Placeholder for logout logic
    console.log('User logged out');
  };

  return (
    <Button variant="outline" onClick={handleLogout} className="mt-4">
      Logout
    </Button>
  );
}