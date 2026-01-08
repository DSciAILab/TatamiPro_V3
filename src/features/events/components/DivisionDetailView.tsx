"use client";

import React from 'react';
import { Event, Division } from '@/types/index';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft } from 'lucide-react';
import AthleteListTable from '@/components/AthleteListTable';
import BracketView from '@/components/BracketView';
import FightList from '@/components/FightList';

interface DivisionDetailViewProps {
  event: Event;
  division: Division;
  onBack: () => void;
  /** Custom base path for fight navigation (for staff pages) */
  baseFightPath?: string;
}

const DivisionDetailView: React.FC<DivisionDetailViewProps> = ({ event, division, onBack, baseFightPath }) => {
  // Consider moved_to_division_id for athletes who were moved to this division
  const athletesInDivision = (event.athletes || []).filter(a => {
    const effectiveDivisionId = a.moved_to_division_id || a._division?.id;
    return effectiveDivisionId === division.id;
  });
  const bracket = event.brackets?.[division.id];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">{division.name}</h3>
          <p className="text-muted-foreground">{athletesInDivision.length} athletes</p>
        </div>
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Mat Control
        </Button>
      </div>

      <Tabs defaultValue="fight_order" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="fight_order" disabled={!bracket}>Fight Order</TabsTrigger>
          <TabsTrigger value="bracket" disabled={!bracket}>Bracket View</TabsTrigger>
          <TabsTrigger value="athletes">Athlete List</TabsTrigger>
        </TabsList>
        <TabsContent value="fight_order" className="mt-4">
          {bracket ? (
            <FightList
              event={event}
              selectedMat="all-mats"
              selectedCategoryKey={division.id}
              selectedDivisionId={division.id}
              onUpdateBracket={() => {}} // Read-only view
              fightViewMode="grid1"
              baseFightPath={baseFightPath}
            />
          ) : (
            <p className="text-muted-foreground text-center py-8">Fight order not available.</p>
          )}
        </TabsContent>
        <TabsContent value="bracket" className="mt-4">
          {bracket ? (
            <BracketView
              bracket={bracket}
              allAthletes={event.athletes || []}
              division={division}
              eventId={event.id}
            />
          ) : (
            <p className="text-muted-foreground text-center py-8">Bracket not generated for this division.</p>
          )}
        </TabsContent>
        <TabsContent value="athletes" className="mt-4">
          <AthleteListTable athletes={athletesInDivision} divisions={event.divisions || []} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DivisionDetailView;