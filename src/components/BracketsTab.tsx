"use client";

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Event } from '@/types/index';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LayoutGrid, Swords } from 'lucide-react';
import BracketView from '@/components/BracketView';
import { cn } from '@/lib/utils'; // Importar cn para utilitários de classe

interface BracketsTabProps {
  event: Event;
  userRole?: 'admin' | 'coach' | 'staff' | 'athlete';
  handleUpdateMatAssignments: (assignments: Record<string, string[]>) => void;
}

const BracketsTab: React.FC<BracketsTabProps> = ({
  event,
  userRole,
}) => {
  const navigate = useNavigate();
  const [activeBracketAction, setActiveBracketAction] = useState<'distribute' | 'generate' | 'manage' | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Brackets</CardTitle>
        <CardDescription>Gere e visualize os brackets do evento.</CardDescription>
      </CardHeader>
      <CardContent>
        {userRole && (
          <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-2 border-b border-input"> {/* Mimic TabsList container */}
            <Button
              variant="ghost" // Use ghost variant as a base for styling
              className={cn(
                "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                activeBracketAction === 'distribute'
                  ? "bg-background text-foreground shadow-sm" // Active state styles
                  : "text-muted-foreground hover:bg-muted hover:text-foreground" // Inactive state styles
              )}
              onClick={() => {
                navigate(`/events/${event.id}/distribute-mats`); // NOVO: Navegar para a página
                setActiveBracketAction('distribute');
              }}
            >
              Distribuição dos Mats
            </Button>
            <Button
              variant="ghost"
              className={cn(
                "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                activeBracketAction === 'generate'
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              onClick={() => {
                navigate(`/events/${event.id}/generate-brackets`);
                setActiveBracketAction('generate');
              }}
            >
              <LayoutGrid className="mr-2 h-4 w-4" /> Gerar Brackets
            </Button>
            <Button
              variant="ghost"
              className={cn(
                "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                activeBracketAction === 'manage'
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              onClick={() => {
                navigate(`/events/${event.id}/manage-fights`);
                setActiveBracketAction('manage');
              }}
            >
              <Swords className="mr-2 h-4 w-4" /> Gerenciar Lutas
            </Button>
          </div>
        )}

        {event.brackets && Object.keys(event.brackets).length > 0 ? (
          <div className="space-y-4 mt-6">
            <h3 className="text-xl font-semibold">Brackets Gerados</h3>
            {Object.values(event.brackets).map(bracket => {
              const division = event.divisions.find(d => d.id === bracket.divisionId);
              if (!division) return null;
              return (
                <BracketView
                  key={bracket.id}
                  bracket={bracket}
                  allAthletes={event.athletes}
                  division={division}
                  eventId={event.id}
                />
              );
            })}
          </div>
        ) : (
          <p className="text-muted-foreground mt-4">Nenhum bracket gerado ainda. {userRole && 'Clique em "Gerar Brackets" para começar.'}</p>
        )}
      </CardContent>
    </Card>
  );
};

export default BracketsTab;