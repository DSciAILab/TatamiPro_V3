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
import { User } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'coach' | 'staff' | 'athlete'>('athlete'); // Mantido para o registro
  const [club, setClub] = useState('');
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const storedUsersString = localStorage.getItem('users');
    const users: User[] = storedUsersString ? JSON.parse(storedUsersString) : [];

    if (isLogin) {
      // Encontra o usuário apenas por email e senha, e verifica se está ativo
      const foundUser = users.find(u => u.email === email && u.password === password && u.isActive);

      if (foundUser) {
        localStorage.setItem('currentUser', JSON.stringify(foundUser));
        localStorage.setItem('userName', foundUser.name);
        localStorage.setItem('userRole', foundUser.role); // Usa o papel do usuário encontrado
        localStorage.setItem('userClub', foundUser.club || '');
        window.dispatchEvent(new Event('authChange'));
        showSuccess(`Login de ${foundUser.name} (${foundUser.role}) realizado com sucesso!`);
        navigate('/events'); // Redireciona para a página de eventos após o login
      } else {
        showError('Credenciais inválidas ou usuário inativo. Tente as credenciais de demonstração.');
      }
    } else {
      const existingUser = users.find(u => u.email === email);
      if (existingUser) {
        showError('Já existe um usuário com este email.');
        return;
      }

      const newUserName = email.split('@')[0].replace('.', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

      const newUser: User = {
        id: uuidv4(),
        email,
        password,
        role, // Usa o papel selecionado para o registro
        club: club || (role === 'admin' ? 'Tatamipro HQ' : 'Novo Clube'),
        isActive: true,
        name: newUserName,
      };

      const updatedUsers = [...users, newUser];
      localStorage.setItem('users', JSON.stringify(updatedUsers));
      showSuccess('Registro realizado com sucesso! Por favor, faça login.');
      setIsLogin(true);
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
                {!isLogin && ( // A seleção de papel aparece apenas para o registro
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