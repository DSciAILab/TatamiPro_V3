"use client";

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Event } from '@/types/index';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { LayoutGrid, Swords } from 'lucide-react';
import MatDistribution from '@/components/MatDistribution';
import BracketView from '@/components/BracketView';

interface BracketsTabProps {
  event: Event;
  userRole?: 'admin' | 'coach' | 'staff' | 'athlete';
  handleUpdateMatAssignments: (assignments: Record<string, string[]>) => void;
}

const BracketsTab: React.FC<BracketsTabProps> = ({
  event,
  userRole,
  handleUpdateMatAssignments,
}) => {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Brackets</CardTitle>
        <CardDescription>Gere e visualize os brackets do evento.</CardDescription>
      </CardHeader>
      <CardContent>
        {userRole && (
          <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button className="w-full">Distribuição dos Mats</Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Configurar Distribuição dos Mats</DialogTitle>
                </DialogHeader>
                <MatDistribution
                  event={event}
                  onUpdateMatAssignments={handleUpdateMatAssignments}
                  isBeltGroupingEnabled={event.isBeltGroupingEnabled ?? true}
                />
              </DialogContent>
            </Dialog>
            <Link to={`/events/${event.id}/generate-brackets`}>
              <Button className="w-full" variant="secondary">
                <LayoutGrid className="mr-2 h-4 w-4" /> Gerar Brackets
              </Button>
            </Link>
            <Button className="w-full" variant="outline" onClick={() => navigate(`/events/${event.id}/manage-fights`)}>
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