"use client";

import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, UserPlus } from 'lucide-react';
import { useAuth } from '@/context/auth-context';

const Welcome: React.FC = () => {
  const { session } = useAuth();
  const isLoggedIn = !!session;

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-128px)] text-center">
        <h1 className="text-5xl font-extrabold mb-6 text-primary">Bem-vindo ao TatamiPro</h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl">
          Sua plataforma completa para gerenciar campeonatos de Jiu-Jitsu de forma eficiente e organizada.
        </p>
        <div className={`grid grid-cols-1 ${isLoggedIn ? 'md:grid-cols-1 justify-center' : 'md:grid-cols-2'} gap-8 w-full max-w-3xl`}>
          <Link to="/events">
            <Card className="flex flex-col items-center p-6 h-full hover:bg-accent transition-colors">
              <CardHeader>
                <CalendarDays className="h-16 w-16 text-primary mb-4" />
                <CardTitle className="text-2xl">Visualizar Eventos</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <CardDescription className="mb-6 text-center">
                  Explore os campeonatos disponíveis, veja os inscritos e os brackets.
                </CardDescription>
              </CardContent>
            </Card>
          </Link>

          {!isLoggedIn && (
            <Link to="/auth">
              <Card className="flex flex-col items-center p-6 h-full hover:bg-accent transition-colors">
                <CardHeader>
                  <UserPlus className="h-16 w-16 text-primary mb-4" />
                  <CardTitle className="text-2xl">Fazer Login ou Cadastro</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center">
                  <CardDescription className="mb-6 text-center">
                    Acesse sua conta ou crie um novo perfil para participar e gerenciar eventos.
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Welcome;