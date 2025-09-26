"use client";

import React from 'react';
import { PageHeader } from '@/components/PageHeader';
import LogoutButton from '@/components/LogoutButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Index = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <PageHeader title="Welcome to the Event App" />
      <Card className="w-full max-w-2xl mt-8">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Home Page</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This is the main landing page. Use the navigation or the logout button below to manage your session.
          </p>
          <div className="mt-4 flex justify-end">
            <LogoutButton />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;