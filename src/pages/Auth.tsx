"use client";

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Layout from '@/components/Layout';
import { showSuccess, showError } from '@/utils/toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<'admin' | 'coach' | 'staff' | 'athlete'>('athlete');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      showError(error.message);
    } else {
      showSuccess('Login successful!');
      navigate('/events');
    }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          role: role,
        },
      },
    });
    if (error) {
      showError(error.message);
    } else {
      showSuccess('Registration successful! Please check your email to verify your account.');
      setIsLogin(true);
    }
    setLoading(false);
  };

  return (
    <Layout>
      <div className="flex items-center justify-center min-h-[calc(100vh-128px)]">
        <Card className="w-[400px]">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">{isLogin ? 'Entrar' : 'Registrar'}</CardTitle>
            <CardDescription>
              {isLogin ? 'Acesse sua conta TatamiPro' : 'Crie sua conta TatamiPro'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={isLogin ? handleLogin : handleRegister}>
              <div className="grid w-full items-center gap-4">
                {!isLogin && (
                  <>
                    <div className="flex flex-col space-y-1.5">
                      <Label htmlFor="firstName">Primeiro Nome</Label>
                      <Input id="firstName" placeholder="Seu primeiro nome" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                    </div>
                    <div className="flex flex-col space-y-1.5">
                      <Label htmlFor="lastName">Sobrenome</Label>
                      <Input id="lastName" placeholder="Seu sobrenome" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                    </div>
                  </>
                )}
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="password">Senha</Label>
                  <Input id="password" type="password" placeholder="Sua senha" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                {!isLogin && (
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="role">Papel</Label>
                    <Select value={role} onValueChange={(value: 'admin' | 'coach' | 'staff' | 'athlete') => setRole(value)}>
                      <SelectTrigger id="role"><SelectValue placeholder="Selecione seu papel" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="coach">Coach</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="athlete">Atleta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Button type="submit" className="w-full mt-4" disabled={loading}>
                  {loading ? 'Carregando...' : (isLogin ? 'Entrar' : 'Registrar')}
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