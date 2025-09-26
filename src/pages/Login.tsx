"use client";

import React, { useEffect } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useSupabaseSession } from '@/context/supabase-session-context';
import Layout from '@/components/Layout';

const Login: React.FC = () => {
  const { session, isLoading } = useSupabaseSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && session) {
      // User is logged in, redirect to events page
      navigate('/events');
    }
  }, [session, isLoading, navigate]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[calc(100vh-128px)]">
          <p>Carregando...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex items-center justify-center min-h-[calc(100vh-128px)]">
        <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg shadow-md">
          <h1 className="text-3xl font-bold text-center text-foreground">Entrar no TatamiPro</h1>
          <Auth
            supabaseClient={supabase}
            providers={[]} // No third-party providers for now
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: 'hsl(var(--primary))',
                    brandAccent: 'hsl(var(--primary-foreground))',
                    inputBackground: 'hsl(var(--input))',
                    inputBorder: 'hsl(var(--border))',
                    inputBorderHover: 'hsl(var(--ring))',
                    inputBorderFocus: 'hsl(var(--ring))',
                    inputText: 'hsl(var(--foreground))',
                    defaultButtonBackground: 'hsl(var(--primary))',
                    defaultButtonBackgroundHover: 'hsl(var(--primary-foreground))',
                    defaultButtonBorder: 'hsl(var(--primary))',
                    defaultButtonText: 'hsl(var(--primary-foreground))',
                  },
                },
              },
            }}
            theme="light" // Use light theme, can be dynamic with next-themes later
            redirectTo={window.location.origin + '/events'}
          />
        </div>
      </div>
    </Layout>
  );
};

export default Login;