"use client";

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Layout from '@/components/Layout';
import { showSuccess, showError } from '@/utils/toast';

const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    // For MVP, a very simplified "admin" user check.
    // In a real app, this would involve a backend call.
    if (isLogin) {
      if (email === 'admin@tatamipro.com' && password === 'admin123') {
        showSuccess('Login realizado com sucesso!');
        localStorage.setItem('userRole', 'admin'); // Store role for basic RBAC
        navigate('/events');
      } else {
        showError('Credenciais inválidas. Tente admin@tatamipro.com / admin123');
      }
    } else {
      // Simplified registration: just "creates" the admin user if it doesn't exist
      // In a real app, this would create a new user in the backend.
      if (email === 'admin@tatamipro.com' && password === 'admin123') {
        showSuccess('Registro realizado com sucesso! Faça login.');
        setIsLogin(true);
      } else {
        showError('Para o MVP, apenas o registro do admin@tatamipro.com / admin123 é suportado.');
      }
    }
  };

  return (
    <Layout>
      <div className="flex items-center justify-center min-h-[calc(100vh-128px)]">
        <Card className="w-[350px]">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">{isLogin ? 'Entrar' : 'Registrar'}</CardTitle>
            <CardDescription>
              {isLogin ? 'Acesse sua conta TatamiPro' : 'Crie sua conta TatamiPro'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth}>
              <div className="grid w-full items-center gap-4">
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full mt-4">
                  {isLogin ? 'Entrar' : 'Registrar'}
                </Button>
              </div>
            </form>
            <div className="mt-4 text-center text-sm">
              {isLogin ? (
                <>
                  Não tem uma conta?{' '}
                  <Button variant="link" onClick={() => setIsLogin(false)} className="p-0 h-auto">
                    Registre-se
                  </Button>
                </>
              ) : (
                <>
                  Já tem uma conta?{' '}
                  <Button variant="link" onClick={() => setIsLogin(true)} className="p-0 h-auto">
                    Entrar
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Auth;