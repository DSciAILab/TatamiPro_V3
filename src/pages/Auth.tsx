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
import { useSession } from '@/components/SessionContextProvider';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// Esquemas de validação
const loginSchema = z.object({
  email: z.string().email({ message: 'Email inválido.' }),
  password: z.string().min(6, { message: 'A senha deve ter pelo menos 6 caracteres.' }),
});

const signupSchema = z.object({
  firstName: z.string().min(2, { message: 'Nome é obrigatório.' }),
  lastName: z.string().min(2, { message: 'Sobrenome é obrigatório.' }),
  email: z.string().email({ message: 'Email inválido.' }),
  password: z.string().min(6, { message: 'A senha deve ter pelo menos 6 caracteres.' }),
  role: z.enum(['athlete', 'coach', 'staff', 'admin'], { required_error: 'Papel é obrigatório.' }),
});

const Auth: React.FC = () => {
  const { session, isLoading } = useSession();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loadingAuth, setLoadingAuth] = useState(false);

  const { register: registerLogin, handleSubmit: handleLoginSubmit, formState: { errors: loginErrors } } = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
  });

  const { register: registerSignup, handleSubmit: handleSignupSubmit, setValue: setSignupValue, watch: watchSignup, formState: { errors: signupErrors } } = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      role: 'athlete', // Default role
    },
  });

  const selectedRole = watchSignup('role');

  useEffect(() => {
    if (!isLoading && session) {
      navigate('/events'); // Redirect if already logged in
    }
  }, [session, isLoading, navigate]);

  const handleLogin = async (values: z.infer<typeof loginSchema>) => {
    setLoadingAuth(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      showError(error.message);
    } else {
      showSuccess('Login realizado com sucesso!');
    }
    setLoadingAuth(false);
  };

  const handleSignup = async (values: z.infer<typeof signupSchema>) => {
    setLoadingAuth(true);
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          first_name: values.firstName,
          last_name: values.lastName,
          role: values.role,
        },
      },
    });

    if (error) {
      showError(error.message);
    } else {
      showSuccess('Cadastro realizado com sucesso! Verifique seu email para confirmar a conta.');
      setIsLogin(true); // Switch to login after successful signup
    }
    setLoadingAuth(false);
  };

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
            <CardTitle className="text-3xl">{isLogin ? 'Entrar' : 'Registrar'}</CardTitle>
            <CardDescription>
              {isLogin ? 'Entre na sua conta TatamiPro' : 'Crie sua conta TatamiPro'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLogin ? (
              <form onSubmit={handleLoginSubmit(handleLogin)} className="space-y-4">
                <div>
                  <Label htmlFor="login-email">Email</Label>
                  <Input id="login-email" type="email" {...registerLogin('email')} />
                  {loginErrors.email && <p className="text-red-500 text-sm mt-1">{loginErrors.email.message}</p>}
                </div>
                <div>
                  <Label htmlFor="login-password">Senha</Label>
                  <Input id="login-password" type="password" {...registerLogin('password')} />
                  {loginErrors.password && <p className="text-red-500 text-sm mt-1">{loginErrors.password.message}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={loadingAuth}>
                  {loadingAuth ? 'Entrando...' : 'Entrar'}
                </Button>
                <Button variant="link" className="w-full" onClick={() => setIsLogin(false)} disabled={loadingAuth}>
                  Não tem uma conta? Registre-se
                </Button>
              </form>
            ) : (
              <form onSubmit={handleSignupSubmit(handleSignup)} className="space-y-4">
                <div>
                  <Label htmlFor="signup-firstName">Nome</Label>
                  <Input id="signup-firstName" {...registerSignup('firstName')} />
                  {signupErrors.firstName && <p className="text-red-500 text-sm mt-1">{signupErrors.firstName.message}</p>}
                </div>
                <div>
                  <Label htmlFor="signup-lastName">Sobrenome</Label>
                  <Input id="signup-lastName" {...registerSignup('lastName')} />
                  {signupErrors.lastName && <p className="text-red-500 text-sm mt-1">{signupErrors.lastName.message}</p>}
                </div>
                <div>
                  <Label htmlFor="signup-email">Email</Label>
                  <Input id="signup-email" type="email" {...registerSignup('email')} />
                  {signupErrors.email && <p className="text-red-500 text-sm mt-1">{signupErrors.email.message}</p>}
                </div>
                <div>
                  <Label htmlFor="signup-password">Criar Senha</Label>
                  <Input id="signup-password" type="password" {...registerSignup('password')} />
                  {signupErrors.password && <p className="text-red-500 text-sm mt-1">{signupErrors.password.message}</p>}
                </div>
                <div>
                  <Label htmlFor="signup-role">Papel</Label>
                  <Select onValueChange={(value) => setSignupValue('role', value as 'athlete' | 'coach' | 'staff' | 'admin')} value={selectedRole}>
                    <SelectTrigger id="signup-role">
                      <SelectValue placeholder="Selecione seu papel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="athlete">Atleta</SelectItem>
                      <SelectItem value="coach">Coach</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  {signupErrors.role && <p className="text-red-500 text-sm mt-1">{signupErrors.role.message}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={loadingAuth}>
                  {loadingAuth ? 'Registrando...' : 'Registrar'}
                </Button>
                <Button variant="link" className="w-full" onClick={() => setIsLogin(true)} disabled={loadingAuth}>
                  Já tem uma conta? Entrar
                </Button>
              </form>
            )}
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