"use client";

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { showError, showSuccess } from '@/utils/toast';
import BiometricLogin from '@/components/BiometricLogin';
import { Loader2, LogIn } from 'lucide-react';

const Auth: React.FC = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session) {
      navigate('/events');
    }
  }, [session, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier || !password) {
      showError("Por favor, preencha todos os campos.");
      return;
    }

    setLoading(true);

    try {
      // Call Edge Function to handle Username -> Email resolution if needed
      const { data, error } = await supabase.functions.invoke('login', {
        body: { login: loginIdentifier, password: password }
      });

      if (error) throw new Error(error.message || 'Falha ao conectar com o servidor.');
      if (data?.error) throw new Error(data.error || 'Credenciais inválidas.');

      if (data?.session) {
        // Set the session in the client
        const { error: sessionError } = await supabase.auth.setSession(data.session);
        if (sessionError) throw sessionError;

        showSuccess("Bem-vindo de volta!");
        navigate('/events');
      } else {
        throw new Error('Falha ao obter sessão de login.');
      }

    } catch (error: any) {
      console.error(error);
      showError(error.message || "Erro ao fazer login.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="flex items-center justify-center min-h-[calc(100vh-128px)]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">TatamiPro</CardTitle>
            <CardDescription>Entre com seu E-mail ou Nome de Usuário</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login">E-mail ou Usuário</Label>
                <Input
                  id="login"
                  type="text"
                  placeholder="ex: nome.sobrenome ou email@exemplo.com"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  autoCapitalize="none"
                  autoCorrect="off"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                Entrar
              </Button>
            </form>

            <BiometricLogin />
            
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Auth;