"use client";

import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils'; // Importar cn para utilitários de classe

const Events: React.FC = () => {
  // Mock data for events
  const events = [
    { id: '1', name: 'Campeonato Aberto de Verão', status: 'Aberto', date: '2024-12-01', isActive: true },
    { id: '2', name: 'Copa TatamiPro Inverno', status: 'Fechado', date: '2024-07-15', isActive: true },
    { id: '3', name: 'Desafio de Faixas Coloridas', status: 'Aberto', date: '2025-03-10', isActive: false }, // Evento inativo
  ];

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Eventos</h1>
        {localStorage.getItem('userRole') === 'admin' && (
          <Button>Criar Novo Evento</Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event) => (
          <Card key={event.id} className={cn({ 'opacity-50 grayscale': !event.isActive })}> {/* Aplicar estilo cinza se inativo */}
            <CardHeader>
              <CardTitle>{event.name}</CardTitle>
              <CardDescription>Status: {event.status} | Data: {event.date}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to={`/events/${event.id}`}>
                <Button className="w-full" disabled={!event.isActive}>Ver Detalhes</Button> {/* Desabilitar botão se inativo */}
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </Layout>
  );
};

export default Events;