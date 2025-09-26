"use client";

import React, { useState } from 'react';
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
  const [club, setClub] = useState(''); // This state is not used in the current mock logic, but kept for potential future use
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    let storedUserName = '';

    if (isLogin) {
      if (email === 'admin@tatamipro.com' && password === 'admin123' && role === 'admin') {
        showSuccess('Login de Admin realizado com sucesso!');
        localStorage.setItem('userRole', 'admin');
        localStorage.setItem('userClub', 'Tatamipro HQ');
        storedUserName = 'Admin';
        localStorage.setItem('userName', storedUserName);
        navigate('/events');
      } else if (email === 'coach@tatamipro.com' && password === 'coach123' && role === 'coach') {
        showSuccess('Login de Coach realizado com sucesso!');
        localStorage.setItem('userRole', 'coach');
        localStorage.setItem('userClub', 'Gracie Barra');
        storedUserName = 'Coach';
        localStorage.setItem('userName', storedUserName);
        navigate('/events');
      } else if (email === 'staff@tatamipro.com' && password === 'staff123' && role === 'staff') {
        showSuccess('Login de Staff realizado com sucesso!');
        localStorage.setItem('userRole', 'staff');
        localStorage.setItem('userClub', 'Alliance');
        storedUserName = 'Staff';
        localStorage.setItem('userName', storedUserName);
        navigate('/events');
      } else if (email === 'athlete@tatamipro.com' && password === 'athlete123' && role === 'athlete') {
        showSuccess('Login de Atleta realizado com sucesso!');
        localStorage.setItem('userRole', 'athlete');
        localStorage.setItem('userClub', 'Checkmat');
        storedUserName = 'Atleta';
        localStorage.setItem('userName', storedUserName);
        navigate('/events');
      }
      else {
        showError('Credenciais ou papel inválidos. Tente as credenciais de demonstração.');
      }
    } else {
      // Registro simplificado: apenas "cria" o usuário admin/coach/staff/athlete se não existir
      // For registration, we can derive a name from the email or use the role
      const baseName = email.split('@')[0];
      storedUserName = baseName.charAt(0).toUpperCase() + baseName.slice(1);

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
                {/* A seleção de papel só aparece para registro */}
                {!isLogin && (
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
                )}
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