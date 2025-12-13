"use client";

import React from 'react';
import { Event, Division } from '@/types/index';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft } from 'lucide-react';
import AthleteListTable from './AthleteListTable';
import BracketView from './BracketView';
import FightList from './FightList';

interface DivisionDetailViewProps {
  event: Event;
  division: Division;
  onBack: () => void;
  isPublic?: boolean;
}

const DivisionDetailView: React.FC<DivisionDetailViewProps> = ({ event, division, onBack, isPublic = false }) => {
  const athletesInDivision = (event.athletes || []).filter(a => a._division?.id === division.id);
  const bracket = event.brackets?.[division.id];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">{division.name}</h3>
          <p className="text-muted-foreground">{athletesInDivision.length} athletes</p>
        </div>
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Visão Geral
        </Button>
      </div>

      <Tabs defaultValue="athletes" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="athletes">Lista de Atletas</TabsTrigger>
          <TabsTrigger value="bracket" disabled={!bracket}>Visão do Bracket</TabsTrigger>
          <TabsTrigger value="fight_order" disabled={!bracket}>Ordem das Lutas</TabsTrigger>
        </TabsList>
        <TabsContent value="athletes" className="mt-4">
          <AthleteListTable athletes={athletesInDivision} />
        </TabsContent>
        <TabsContent value="bracket" className="mt-4">
          {bracket ? (
            <BracketView
              bracket={bracket}
              allAthletes={event.athletes || []}
              division={division}
              eventId={event.id}
              isPublic={isPublic}
            />
          ) : (
            <p className="text-muted-foreground text-center py-8">Bracket não gerado para esta divisão.</p>
          )}
        </TabsContent>
        <TabsContent value="fight_order" className="mt-4">
          {bracket ? (
            <FightList
              event={event}
              selectedMat="all-mats"
              selectedCategoryKey={division.id}
              selectedDivisionId={division.id}
              onUpdateBracket={() => {}} // Read-only view
              fightViewMode="grid1"
              isPublic={isPublic}
            />
          ) : (
            <p className="text-muted-foreground text-center py-8">Ordem de lutas não disponível.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DivisionDetailView;