"use client";

import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, UserPlus } from 'lucide-react';

const Welcome: React.FC = () => {
  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-128px)] text-center">
        <h1 className="text-5xl font-extrabold mb-6 text-primary">Bem-vindo ao TatamiPro</h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl">
          Sua plataforma completa para gerenciar campeonatos de Jiu-Jitsu de forma eficiente e organizada.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-3xl">
          <Card className="flex flex-col items-center p-6">
            <CardHeader>
              <CalendarDays className="h-16 w-16 text-primary mb-4" />
              <CardTitle className="text-2xl">Visualizar Eventos</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <CardDescription className="mb-6 text-center">
                Explore os campeonatos disponíveis, veja os inscritos e os brackets.
              </CardDescription>
              <Link to="/events">
                <Button size="lg">
                  Visualizar Eventos
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="flex flex-col items-center p-6">
            <CardHeader>
              <UserPlus className="h-16 w-16 text-primary mb-4" />
              <CardTitle className="text-2xl">Fazer Cadastro</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <CardDescription className="mb-6 text-center">
                Registre-se como atleta ou importe inscrições em lote para um evento.
              </CardDescription>
              <Link to="/auth"> {/* Temporariamente para /auth, será ajustado para RegistrationOptions */}
                <Button size="lg" variant="secondary">
                  Fazer Cadastro
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Welcome;