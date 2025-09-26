"use client";

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Layout from '@/components/Layout';
import { showSuccess, showError } from '@/utils/toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Auth as SupabaseAuth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useSession } from '@/components/SessionContextProvider'; // Import useSession

const Auth: React.FC = () => {
  const { session, isLoading } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && session) {
      navigate('/events'); // Redirect if already logged in
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
        <Card className="w-[400px] p-4">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">Autenticação</CardTitle>
            <CardDescription>
              Entre ou registre-se para acessar o TatamiPro
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SupabaseAuth
              supabaseClient={supabase}
              appearance={{ theme: ThemeSupa }}
              providers={[]} // No third-party providers for now
              theme="light"
              redirectTo={window.location.origin + '/events'} // Redirect to events page after auth
              localization={{
                variables: {
                  sign_in: {
                    email_label: 'Email',
                    password_label: 'Senha',
                    email_input_placeholder: 'Seu email',
                    password_input_placeholder: 'Sua senha',
                    button_label: 'Entrar',
                    social_provider_text: 'Ou entre com',
                    link_text: 'Já tem uma conta? Entrar',
                  },
                  sign_up: {
                    email_label: 'Email',
                    password_label: 'Criar Senha',
                    email_input_placeholder: 'Seu email',
                    password_input_placeholder: 'Sua senha',
                    button_label: 'Registrar',
                    social_provider_text: 'Ou registre-se com',
                    link_text: 'Não tem uma conta? Registre-se',
                  },
                  forgotten_password: {
                    email_label: 'Email',
                    password_label: 'Sua Senha',
                    email_input_placeholder: 'Seu email',
                    button_label: 'Enviar instruções de redefinição',
                    link_text: 'Esqueceu sua senha?',
                  },
                  update_password: {
                    password_label: 'Nova Senha',
                    password_input_placeholder: 'Sua nova senha',
                    button_label: 'Atualizar Senha',
                  },
                },
              }}
            />
            <div className="mt-6 text-center text-xs text-muted-foreground">
              <p className="font-semibold mb-2">Credenciais de Demonstração (para perfis existentes):</p>
              <p>Admin: admin@tatamipro.com / admin123</p>
              <p>Coach: coach@tatamipro.com / coach123</p>
              <p>Staff: staff@tatamipro.com / staff123</p>
              <p>Atleta: athlete@tatamipro.com / athlete123</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Auth;