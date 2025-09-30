"use client";

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Auth as SupabaseAuth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import Layout from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const Auth: React.FC = () => {
  const { session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (session) {
      navigate('/events');
    }
  }, [session, navigate]);

  return (
    <Layout>
      <div className="flex items-center justify-center min-h-[calc(100vh-128px)]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">Bem-vindo ao TatamiPro</CardTitle>
            <CardDescription>Acesse sua conta ou crie uma nova para continuar</CardDescription>
          </CardHeader>
          <CardContent>
            <SupabaseAuth
              supabaseClient={supabase}
              appearance={{ theme: ThemeSupa }}
              providers={[]}
              theme="light"
              localization={{
                variables: {
                  sign_in: {
                    email_label: 'Endereço de e-mail',
                    password_label: 'Senha',
                    email_input_placeholder: 'Seu endereço de e-mail',
                    password_input_placeholder: 'Sua senha',
                    button_label: 'Entrar',
                    social_provider_text: 'Entrar com {{provider}}',
                    link_text: 'Já tem uma conta? Entre',
                  },
                  sign_up: {
                    email_label: 'Endereço de e-mail',
                    password_label: 'Crie uma senha',
                    email_input_placeholder: 'Seu endereço de e-mail',
                    password_input_placeholder: 'Sua senha',
                    button_label: 'Registrar',
                    social_provider_text: 'Registrar com {{provider}}',
                    link_text: 'Não tem uma conta? Registre-se',
                    user_details_label: 'Por favor, insira seus detalhes abaixo',
                  },
                  forgotten_password: {
                    email_label: 'Endereço de e-mail',
                    email_input_placeholder: 'Seu endereço de e-mail',
                    button_label: 'Enviar instruções',
                    link_text: 'Esqueceu sua senha?',
                  },
                },
              }}
            />
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Auth;