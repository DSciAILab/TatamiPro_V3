"use client";

import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Layout from '@/components/Layout';

const Welcome: React.FC = () => {
  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-128px)] text-center">
        <h1 className="text-5xl font-extrabold mb-6 text-primary">Bem-vindo ao TatamiPro</h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl">
          Sua plataforma completa para gerenciar campeonatos de Jiu-Jitsu de forma eficiente e organizada.
        </p>
        <Link to="/auth">
          <Button size="lg" className="px-8 py-4 text-lg">
            Entrar aqui
          </Button>
        </Link>
      </div>
    </Layout>
  );
};

export default Welcome;