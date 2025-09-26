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

const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'coach' | 'staff' | 'athlete'>('athlete');
  const [club, setClub] = useState(''); // Not directly used in MVP login logic, but kept for consistency
  const navigate = useNavigate();

  useEffect(() => {
    const userRole = localStorage.getItem('userRole');
    if (userRole) {
      // If already logged in, redirect to events page
      navigate('/events');
    }
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    let loggedInUserRole: 'admin' | 'coach' | 'staff' | 'athlete' | null = null;
    let loggedInUserName: string | null = null;
    let loggedInUserClub: string | null = null;

    if (isLogin) {
      if (email === 'admin@tatamipro.com' && password === 'admin123' && role === 'admin') {
        loggedInUserRole = 'admin';
        loggedInUserName = 'Administrador';
        loggedInUserClub = null;
      } else if (email === 'coach@tatamipro.com' && password === 'coach123' && role === 'coach') {
        loggedInUserRole = 'coach';
        loggedInUserName = 'Coach';
        loggedInUserClub = 'Gracie Barra';
      } else if (email === 'staff@tatamipro.com' && password === 'staff123' && role === 'staff') {
        loggedInUserRole = 'staff';
        loggedInUserName = 'Staff';
        loggedInUserClub = 'Alliance';
      } else if (email === 'athlete@tatamipro.com' && password === 'athlete123' && role === 'athlete') {
        loggedInUserRole = 'athlete';
        loggedInUserName = 'Atleta';
        loggedInUserClub = 'Checkmat';
      }

      if (loggedInUserRole) {
        showSuccess(`Login de ${loggedInUserName} realizado com sucesso!`);
        localStorage.setItem('userRole', loggedInUserRole);
        localStorage.setItem('userName', loggedInUserName);
        if (loggedInUserClub) {
          localStorage.setItem('userClub', loggedInUserClub);
        } else {
          localStorage.removeItem('userClub');
        }
        navigate('/events');
      } else {
        showError('Credenciais ou papel inválidos. Tente as credenciais de demonstração.');
      }
    } else {
      // Registro simplificado: apenas "cria" o usuário admin/coach/staff/athlete se não existir
      if (email === 'admin@tatamipro.com' && password === 'admin123' && role === 'admin') {
        showSuccess('Registro de Admin realizado com sucesso! Faça login.');
        setIsLogin(true);
      } else if (email === 'coach@tatamipro.com' && password === 'coach123' && role === 'coach') {
        showSuccess('Registro de Coach realizado com sucesso! Faça login.');
        setIsLogin(true);
      } else if (email === 'staff@tatamipro.com' && password === 'staff123' && role === 'staff') {
        showSuccess('Registro de Staff realizado com sucesso! Faça login.');
        setIsLogin(true);
      } else if (email === 'athlete@tatamipro.com' && password === 'athlete123' && role === 'athlete') {
        showSuccess('Registro de Atleta realizado com sucesso! Faça login.');
        setIsLogin(true);
      }
      else {
        showError('Para o MVP, apenas o registro de usuários de demonstração é suportado.');
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
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="role">Papel</Label>
                  <Select value={role} onValueChange={(value: 'admin' | 'coach' | 'staff' | 'athlete') => setRole(value)}>
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Selecione seu papel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="coach">Coach</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="athlete">Atleta</SelectItem>
                    </SelectContent>
                  </Select>
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
            <div className="mt-6 text-center text-xs text-muted-foreground">
              <p className="font-semibold mb-2">Credenciais de Demonstração:</p>
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