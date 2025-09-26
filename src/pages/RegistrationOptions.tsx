"use client";

import React from 'react';
import { Link, useParams } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, Upload } from 'lucide-react';

const RegistrationOptions: React.FC = () => {
  const { id: eventId } = useParams<{ id: string }>();

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-128px)] text-center">
        <h1 className="text-4xl font-bold mb-6 text-primary">Opções de Inscrição</h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl">
          Selecione como você gostaria de registrar atletas para o evento {eventId ? `#${eventId}` : 'selecionado'}.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-3xl">
          <Card className="flex flex-col items-center p-6">
            <CardHeader>
              <UserPlus className="h-16 w-16 text-primary mb-4" />
              <CardTitle className="text-2xl">Inscrição Individual</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <CardDescription className="mb-6 text-center">
                Registre um atleta por vez, preenchendo todos os detalhes manualmente.
              </CardDescription>
              <Link to={`/events/${eventId}/register-athlete`}>
                <Button size="lg">
                  <UserPlus className="mr-2 h-5 w-5" /> Inscrição Individual
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="flex flex-col items-center p-6">
            <CardHeader>
              <Upload className="h-16 w-16 text-primary mb-4" />
              <CardTitle className="text-2xl">Importar em Lote</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <CardDescription className="mb-6 text-center">
                Faça upload de um arquivo CSV para registrar múltiplos atletas de uma vez.
              </CardDescription>
              <Link to={`/events/${eventId}/import-athletes`}>
                <Button size="lg" variant="secondary">
                  <Upload className="mr-2 h-5 w-5" /> Importar em Lote
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default RegistrationOptions;