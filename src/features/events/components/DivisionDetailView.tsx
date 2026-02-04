"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Event, Division, Athlete } from '@/types/index';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft } from 'lucide-react';
import AthleteListTable from '@/components/AthleteListTable';
import BracketView from '@/components/BracketView';
import FightList from '@/components/FightList';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DivisionDetailViewProps {
  event: Event;
  division: Division;
  bracketId?: string;
  onBack: () => void;
  /** Custom base path for fight navigation (for staff pages) */
  baseFightPath?: string;
  isPublic?: boolean;
  initialTab?: string;
}

const DivisionDetailView: React.FC<DivisionDetailViewProps> = ({ event, division, bracketId, onBack, baseFightPath, isPublic = false, initialTab }) => {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'last_name', direction: 'asc' });
  const [showAllMatFights, setShowAllMatFights] = useState(false);
  const [groupBy, setGroupBy] = useState<'stage' | 'division' | 'order'>('order');

  // Consider moved_to_division_id for athletes who were moved to this division
  const athletesInDivision = (event.athletes || []).filter(a => {
    const effectiveDivisionId = a.moved_to_division_id || a._division?.id;
    return effectiveDivisionId === division.id;
  });

  // Lookup bracket by specific ID if provided, otherwise fallback to division ID
  const targetBracketId = bracketId || division.id;
  const bracket = event.brackets?.[targetBracketId];

  // Filter athletes if viewing a specific bracket
  const displayAthletes = useMemo(() => {
      if (bracket && bracket.participants) {
          // If we have a specific bracket (especially split), filter athletes to only those in the bracket
          return athletesInDivision.filter(a => 
              bracket.participants.some(p => p !== 'BYE' && p.id === a.id)
          );
      }
      return athletesInDivision;
  }, [athletesInDivision, bracket]);

  const [activeTab, setActiveTab] = useState(initialTab || "fight_order");
  
  // Update active tab when initialTab prop changes (e.g. navigation back)
  useEffect(() => {
    setActiveTab(initialTab || "fight_order");
  }, [initialTab]);

  // Find the mat assigned to this division
  const assignedMat = useMemo(() => {
    if (!event.mat_assignments) return null;
    return Object.keys(event.mat_assignments).find(mat => 
      event.mat_assignments![mat].includes(division.id) || (bracketId && event.mat_assignments![mat].includes(bracketId)) // Check bracketId assignment too
    );
  }, [event.mat_assignments, division.id, bracketId]);

  const handleSort = (key: string) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortedAthletes = useMemo(() => {
    const sortableItems = [...displayAthletes];
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
  }, [displayAthletes, sortConfig]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">{division.name}</h3>
          <p className="text-muted-foreground">{displayAthletes.length} athletes</p>
        </div>
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Mat Control
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="fight_order" disabled={!bracket}>Fight Order</TabsTrigger>
          <TabsTrigger value="bracket" disabled={!bracket}>Bracket View</TabsTrigger>
          <TabsTrigger value="athletes">Athlete List</TabsTrigger>
        </TabsList>
        <TabsContent value="fight_order" className="mt-4">
          <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
             {assignedMat && (
                 <div className="flex items-center space-x-4">
                     <div className="flex items-center space-x-2">
                        <Switch 
                            id="show-all-mat-fights" 
                            checked={showAllMatFights}
                            onCheckedChange={setShowAllMatFights}
                        />
                        <Label htmlFor="show-all-mat-fights">Show all fights on {assignedMat}</Label>
                     </div>

                     {showAllMatFights && (
                         <div className="flex items-center space-x-2">
                             <Label htmlFor="group-by" className="text-sm text-muted-foreground whitespace-nowrap">Group by:</Label>
                             <Select value={groupBy} onValueChange={(v: any) => setGroupBy(v)}>
                                <SelectTrigger className="w-[140px] h-8">
                                    <SelectValue placeholder="Select group" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="order">Schedule Order</SelectItem>
                                    <SelectItem value="division">Division</SelectItem>
                                    <SelectItem value="stage">Round / Stage</SelectItem>
                                </SelectContent>
                             </Select>
                         </div>
                     )}
                 </div>
             )}
          </div>
          {bracket ? (
            <FightList
              event={event}
              selectedMat={showAllMatFights && assignedMat ? assignedMat : "all-mats"}
              selectedCategoryKey={division.id}
              selectedDivisionId={division.id}
              bracketId={bracketId}
              onUpdateBracket={() => {}} // Read-only view
              fightViewMode="grid1"
              baseFightPath={baseFightPath}
              source="division-fight-order"
              showAllMatFights={showAllMatFights}
              groupBy={showAllMatFights ? groupBy : 'stage'} 
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
              isPublic={false}
              source="division-bracket-view"
              basePath={baseFightPath}
            />
          ) : (
            <p className="text-muted-foreground text-center py-8">Bracket not generated for this division.</p>
          )}
        </TabsContent>
        <TabsContent value="athletes" className="mt-4">
          <AthleteListTable 
            athletes={sortedAthletes} 
            divisions={event.divisions || []}
            sortConfig={sortConfig as any}
            onSort={handleSort}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DivisionDetailView;