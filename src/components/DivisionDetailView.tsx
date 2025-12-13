"use client";

import React, { useState, useMemo } from 'react';
import { Event, Division, Athlete } from '@/types/index';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft } from 'lucide-react';
import AthleteListTable from './AthleteListTable';
import BracketView from './BracketView';
import FightList from './FightList';
import { useTranslations } from '@/hooks/use-translations';

interface DivisionDetailViewProps {
  event: Event;
  division: Division;
  onBack: () => void;
  isPublic?: boolean;
}

const DivisionDetailView: React.FC<DivisionDetailViewProps> = ({ event, division, onBack, isPublic = false }) => {
  const { t } = useTranslations();
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'first_name', direction: 'asc' });

  const athletesInDivision = (event.athletes || []).filter(a => a._division?.id === division.id);
  const bracket = event.brackets?.[division.id];

  const handleSort = (key: string) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortedAthletes = useMemo(() => {
    const sortableItems = [...athletesInDivision];
    sortableItems.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      if (sortConfig.key === 'division_name') {
        aValue = a._division?.name || '';
        bValue = b._division?.name || '';
      } else {
        aValue = a[sortConfig.key as keyof Athlete];
        bValue = b[sortConfig.key as keyof Athlete];
      }

      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
    return sortableItems;
  }, [athletesInDivision, sortConfig]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">{division.name}</h3>
          <p className="text-muted-foreground">{athletesInDivision.length} athletes</p>
        </div>
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> {t('backToOverview')}
        </Button>
      </div>

      <Tabs defaultValue="athletes" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="athletes">{t('athleteList')}</TabsTrigger>
          <TabsTrigger value="bracket" disabled={!bracket}>{t('bracketView')}</TabsTrigger>
          <TabsTrigger value="fight_order" disabled={!bracket}>{t('fightOrder')}</TabsTrigger>
        </TabsList>
        <TabsContent value="athletes" className="mt-4">
          <AthleteListTable 
            athletes={sortedAthletes} 
            sortConfig={sortConfig}
            onSort={handleSort}
          />
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