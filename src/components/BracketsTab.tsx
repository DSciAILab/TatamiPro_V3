"use client";

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Event, Bracket, Division } from '@/types/index';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { LayoutGrid, Swords, Printer } from 'lucide-react';
import MatDistribution from '@/components/MatDistribution';
import BracketView from '@/components/BracketView';
import { generateBracketForDivision } from '@/utils/bracket-generator';
import { generateMatFightOrder } from '@/utils/fight-order-generator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { showSuccess, showError } from '@/utils/toast';
import MatCategoryList from '@/components/MatCategory';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import FightOverview from '@/components/FightOverview';
import DivisionDetailView from '@/features/events/components/DivisionDetailView';
import MatControlCenter from '@/components/MatControlCenter';

interface BracketsTabProps {
  event: Event;
  userRole?: 'admin' | 'coach' | 'staff' | 'athlete';
  handleUpdateMatAssignments: (assignments: Record<string, string[]>) => void;
  onUpdateBrackets: (brackets: Record<string, Bracket>, matFightOrder: Record<string, string[]>, shouldSave?: boolean) => void;
  bracketsSubTab: string;
  setBracketsSubTab: (value: string) => void;
}

const BracketsTab: React.FC<BracketsTabProps> = ({
  event,
  userRole,
  handleUpdateMatAssignments,
  onUpdateBrackets,
  bracketsSubTab,
  setBracketsSubTab,
}) => {
  const navigate = useNavigate();

  const [selectedDivisionIdForBracket, setSelectedDivisionIdForBracket] = useState<string | 'all'>('all');
  const [showRegenerateConfirmDialog, setShowRegenerateConfirmDialog] = useState(false);
  const [divisionsToConfirmRegenerate, setDivisionsToConfirmRegenerate] = useState<Division[]>([]);
  const [showOngoingWarningDialog, setShowOngoingWarningDialog] = useState(false);
  const [divisionToRegenerateOngoing, setDivisionToRegenerateOngoing] = useState<Division | null>(null);
  const [selectedDivisionForDetail, setSelectedDivisionForDetail] = useState<Division | null>(null);
  const [includeOngoingBrackets, setIncludeOngoingBrackets] = useState<boolean>(false);
  const [divisionStatusFilter, setDivisionStatusFilter] = useState<'all' | 'active' | 'finished'>('all');

  // Use event.brackets directly instead of local state to ensure real-time updates
  const brackets = event.brackets || {};

  // Helper to get athlete count for a division (considering moved athletes)
  const getAthletesForDivision = (divisionId: string) => {
    return (event.athletes || []).filter(a => {
      if (a.registration_status !== 'approved' || a.check_in_status !== 'checked_in') {
        return false;
      }
      const effectiveDivisionId = a.moved_to_division_id || a._division?.id;
      return effectiveDivisionId === divisionId;
    });
  };

  const availableDivisionsForBracketGeneration = useMemo(() => {
    if (!event) return [];
    return (event.divisions || []).filter(div => {
      const athletesInDivision = getAthletesForDivision(div.id);
      return athletesInDivision.length >= 2;
    });
  }, [event]);

  // Divisions with exactly 1 athlete (for WO champion declaration)
  const singleAthleteDivisions = useMemo(() => {
    if (!event) return [];
    return (event.divisions || [])
      .map(div => ({
        division: div,
        athletes: getAthletesForDivision(div.id),
        hasExistingBracket: !!event.brackets?.[div.id]
      }))
      .filter(item => item.athletes.length === 1);
  }, [event]);

  // Function to declare champion by WO for single-athlete divisions
  const declareSingleAthleteChampion = (divisionId: string, athleteId: string) => {
    const division = event.divisions?.find(d => d.id === divisionId);
    if (!division) return;

    // Create a minimal bracket with the athlete as winner
    const woChampionBracket: Bracket = {
      id: divisionId,
      division_id: divisionId,
      rounds: [], // No rounds needed for WO
      bracket_size: 1,
      participants: [event.athletes?.find(a => a.id === athleteId)!],
      winner_id: athleteId,
      runner_up_id: undefined,
      third_place_winner_id: undefined,
    };

    const mergedBrackets = { ...event.brackets, [divisionId]: woChampionBracket };
    
    // Update brackets without regenerating fight order for WO brackets
    onUpdateBrackets(mergedBrackets, event.mat_fight_order || {}, true);
    showSuccess(`Champion declared by WO for ${division.name}!`);
  };

  const hasOngoingFights = (divisionId: string): boolean => {
    const bracket = event.brackets?.[divisionId];
    if (!bracket || !bracket.rounds) return false;
    return bracket.rounds.flat().some(match => match.winner_id !== undefined);
  };

  // Check if division is finished (has a declared winner)
  const isDivisionFinished = (divisionId: string): boolean => {
    const bracket = event.brackets?.[divisionId];
    return bracket?.winner_id !== undefined;
  };

  // Division status counts
  const divisionStatusCounts = useMemo(() => {
    const divisionsWithBrackets = (event.divisions || []).filter(div => event.brackets?.[div.id]);
    const finished = divisionsWithBrackets.filter(div => isDivisionFinished(div.id)).length;
    const active = divisionsWithBrackets.filter(div => hasOngoingFights(div.id) && !isDivisionFinished(div.id)).length;
    const pending = divisionsWithBrackets.length - finished - active;
    return {
      total: divisionsWithBrackets.length,
      finished,
      active,
      pending,
    };
  }, [event.brackets, event.divisions]);

  const executeBracketGeneration = (divisionsToGenerate: Division[]) => {
    if (!event) {
      showError("Event not loaded.");
      return;
    }

    const newBrackets: Record<string, Bracket> = {};
    const includeThirdPlaceFromEvent = event.include_third_place || false;

    try {
      divisionsToGenerate.forEach(div => {
        const bracket = generateBracketForDivision(div, event.athletes || [], { thirdPlace: includeThirdPlaceFromEvent });
        newBrackets[div.id] = bracket;
      });

      const mergedBrackets = { ...event.brackets, ...newBrackets };

      const { updatedBrackets: finalBrackets, matFightOrder: newMatFightOrder } = generateMatFightOrder({
        ...event,
        brackets: mergedBrackets,
      });

      onUpdateBrackets(finalBrackets, newMatFightOrder, true); // Auto-save after generation
      showSuccess(`${divisionsToGenerate.length} bracket(s) generated successfully!`);
    } catch (error: any) {
      console.error("Error generating brackets:", error);
      showError("Error generating brackets: " + error.message);
    }
  };

  const handleGenerateBrackets = () => {
    if (!event) {
      showError("Event not loaded.");
      return;
    }

    let divisionsToConsider: Division[] = [];
    if (selectedDivisionIdForBracket === 'all') {
      divisionsToConsider = availableDivisionsForBracketGeneration;
    } else {
      const division = availableDivisionsForBracketGeneration.find(d => d.id === selectedDivisionIdForBracket);
      if (division) {
        divisionsToConsider.push(division);
      } else {
        showError("Selected division not found or does not have enough athletes.");
        return;
      }
    }

    if (divisionsToConsider.length === 0) {
      showError("No division with enough athletes to generate brackets.");
      return;
    }

    const divisionsWithOngoingFights = divisionsToConsider.filter(div => hasOngoingFights(div.id));

    // Decide which divisions to generate based on toggle
    let divisionsToActuallyGenerate: Division[];
    
    if (includeOngoingBrackets) {
      // Include all divisions (user chose to regenerate even ongoing brackets)
      divisionsToActuallyGenerate = divisionsToConsider;
      
      // If there are ongoing fights and it's not admin, block
      if (divisionsWithOngoingFights.length > 0 && userRole !== 'admin') {
        showError("You do not have permission to regenerate brackets for categories in progress.");
        return;
      }
      
      // Warn admin about ongoing brackets
      if (divisionsWithOngoingFights.length > 0) {
        if (selectedDivisionIdForBracket !== 'all') {
          setDivisionToRegenerateOngoing(divisionsWithOngoingFights[0]);
          setShowOngoingWarningDialog(true);
          return;
        }
        // For 'all', will show in confirm dialog
      }
    } else {
      // Only non-ongoing divisions
      divisionsToActuallyGenerate = divisionsToConsider.filter(div => !hasOngoingFights(div.id));
      
      if (divisionsToActuallyGenerate.length === 0) {
        showError("All selected divisions already have fights in progress. Enable the toggle to regenerate them.");
        return;
      }
    }

    const divisionsThatWillBeRegenerated = divisionsToActuallyGenerate.filter(div => event.brackets?.[div.id]);

    if (divisionsThatWillBeRegenerated.length > 0) {
      setDivisionsToConfirmRegenerate(divisionsThatWillBeRegenerated);
      setShowRegenerateConfirmDialog(true);
    } else {
      executeBracketGeneration(divisionsToActuallyGenerate);
    }
  };

  const confirmRegenerateAction = () => {
    executeBracketGeneration(divisionsToConfirmRegenerate);
    setShowRegenerateConfirmDialog(false);
    setDivisionsToConfirmRegenerate([]);
  };

  const confirmRegenerateOngoingAction = () => {
    if (divisionToRegenerateOngoing) {
      executeBracketGeneration([divisionToRegenerateOngoing]);
    }
    setShowOngoingWarningDialog(false);
    setDivisionToRegenerateOngoing(null);
  };

  // Persist selectedMat to localStorage
  const [selectedMat, setSelectedMat] = useState<string | 'all-mats' | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`selectedMat_${event.id}`) || null;
    }
    return null;
  });

  // Save to localStorage when mat changes
  const handleMatChange = (mat: string | 'all-mats') => {
    setSelectedMat(mat);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`selectedMat_${event.id}`, mat);
    }
  };

  const matNames = useMemo(() => {
    if (!event?.num_fight_areas) return [];
    const names = Array.from({ length: event.num_fight_areas }, (_, i) => `Mat ${i + 1}`);
    return ['all-mats', ...names];
  }, [event?.num_fight_areas]);

  const handleSelectCategory = (_categoryKey: string, divisionId: string) => {
    const division = event.divisions?.find(d => d.id === divisionId);
    if (division) {
      setSelectedDivisionForDetail(division);
      setBracketsSubTab('fight-overview');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Brackets</CardTitle>
        <CardDescription>Generate and view the event brackets.</CardDescription>
      </CardHeader>
      <CardContent>
        {userRole && (
          <Tabs value={bracketsSubTab} onValueChange={setBracketsSubTab} className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="mat-distribution">Mat Distribution</TabsTrigger>
              <TabsTrigger value="generate-brackets">
                <LayoutGrid className="mr-2 h-4 w-4" /> Generate
              </TabsTrigger>
              <TabsTrigger value="wo-champions" className="relative">
                WO Champions
                {singleAthleteDivisions.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-orange-500 text-white rounded-full">
                    {singleAthleteDivisions.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="manage-fights">
                <Swords className="mr-2 h-4 w-4" /> Manage
              </TabsTrigger>
              <TabsTrigger value="mat-control">Mat Control</TabsTrigger>
              <TabsTrigger value="fight-overview">Overview</TabsTrigger>
            </TabsList>

            <TabsContent value="mat-distribution" className="mt-6">
              <MatDistribution
                event={event}
                onUpdateMatAssignments={handleUpdateMatAssignments}
                isBeltGroupingEnabled={event.is_belt_grouping_enabled ?? true}
              />
            </TabsContent>

            <TabsContent value="generate-brackets" className="mt-6">
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Generation Options</CardTitle>
                  <CardDescription>Select divisions and options to generate the brackets.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="division-select">Division</Label>
                    <Select value={selectedDivisionIdForBracket} onValueChange={(value: string | 'all') => setSelectedDivisionIdForBracket(value)}>
                      <SelectTrigger id="division-select">
                        <SelectValue placeholder="Select a division or all" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Divisions</SelectItem>
                        {availableDivisionsForBracketGeneration.map(div => (
                          <SelectItem key={div.id} value={div.id}>{div.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between space-x-2 p-3 border rounded-md bg-muted/50">
                    <div className="space-y-0.5">
                      <Label htmlFor="include-ongoing-toggle" className="font-medium">
                        Include brackets with results
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {includeOngoingBrackets 
                          ? "Will regenerate ALL brackets, including those with results (Admin)" 
                          : "Will regenerate ONLY brackets without results"}
                      </p>
                    </div>
                    <Switch 
                      id="include-ongoing-toggle"
                      checked={includeOngoingBrackets}
                      onCheckedChange={setIncludeOngoingBrackets}
                      disabled={userRole !== 'admin'}
                    />
                  </div>
                  <Button onClick={handleGenerateBrackets} className="w-full">
                    <LayoutGrid className="mr-2 h-4 w-4" /> Generate Bracket(s)
                  </Button>
                  {Object.keys(brackets).length > 0 && (
                    <Button className="w-full mt-2" variant="outline" onClick={() => navigate(`/events/${event.id}/print-brackets`)}>
                      <Printer className="mr-2 h-4 w-4" /> Print Brackets (PDF)
                    </Button>
                  )}
                </CardContent>
              </Card>


              <h2 className="text-2xl font-bold mt-8 mb-4">Generated Brackets</h2>
              {Object.keys(brackets).length === 0 ? (
                <p className="text-muted-foreground">No brackets generated yet. Use the options above to get started.</p>
              ) : (
                <div className="space-y-8">
                  {Object.values(brackets).map(bracket => {
                    const division = event?.divisions?.find(d => d.id === bracket.division_id);
                    if (!division) return null;
                    return (
                      <BracketView
                        key={bracket.id}
                        bracket={bracket}
                        allAthletes={event.athletes || []}
                        division={division}
                        eventId={event.id}
                      />
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="wo-champions" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-orange-600 dark:text-orange-400">Single-Athlete Divisions</CardTitle>
                  <CardDescription>These divisions have only 1 athlete. Declare them champion by WO (walkover) to count their points.</CardDescription>
                </CardHeader>
                <CardContent>
                  {singleAthleteDivisions.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No single-athlete divisions found. All divisions have 2+ checked-in athletes.</p>
                  ) : (
                    <div className="space-y-2">
                      {singleAthleteDivisions.map(item => {
                        const athlete = item.athletes[0];
                        const isAlreadyChampion = item.hasExistingBracket && event.brackets?.[item.division.id]?.winner_id === athlete.id;
                        return (
                          <div key={item.division.id} className="flex items-center justify-between p-3 border rounded-md bg-muted/30">
                            <div>
                              <p className="font-medium">[{item.division.id.slice(-3).toUpperCase()}] {item.division.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {athlete.first_name} {athlete.last_name} ({athlete.club})
                              </p>
                            </div>
                            {isAlreadyChampion ? (
                              <span className="text-sm text-green-600 font-medium">✓ Champion by WO</span>
                            ) : (
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="border-orange-300 text-orange-600 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-950"
                                onClick={() => declareSingleAthleteChampion(item.division.id, athlete.id)}
                              >
                                Declare Champion by WO
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="manage-fights" className="mt-6">
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Mat and Category Selection</CardTitle>
                  <CardDescription>Select a fight area and click on a category to see the details.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Division Status Filter Cards */}
                  <div className="grid grid-cols-3 gap-4 text-center mb-4">
                    <div
                      className={cn(
                        "p-3 border rounded-md cursor-pointer transition-colors",
                        divisionStatusFilter === 'all' ? 'bg-blue-200 dark:bg-blue-800 border-blue-500' : 'bg-blue-50 dark:bg-blue-950',
                        'hover:bg-blue-100 dark:hover:bg-blue-900'
                      )}
                      onClick={() => setDivisionStatusFilter(prev => prev === 'all' ? 'all' : 'all')}
                    >
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{divisionStatusCounts.total}</p>
                      <p className="text-sm text-muted-foreground">Total Divisions</p>
                    </div>
                    <div
                      className={cn(
                        "p-3 border rounded-md cursor-pointer transition-colors",
                        divisionStatusFilter === 'active' ? 'bg-orange-200 dark:bg-orange-800 border-orange-500' : 'bg-orange-50 dark:bg-orange-950',
                        'hover:bg-orange-100 dark:hover:bg-orange-900'
                      )}
                      onClick={() => setDivisionStatusFilter(prev => prev === 'active' ? 'all' : 'active')}
                    >
                      <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{divisionStatusCounts.active + divisionStatusCounts.pending}</p>
                      <p className="text-sm text-muted-foreground">Active</p>
                    </div>
                    <div
                      className={cn(
                        "p-3 border rounded-md cursor-pointer transition-colors",
                        divisionStatusFilter === 'finished' ? 'bg-green-200 dark:bg-green-800 border-green-500' : 'bg-green-50 dark:bg-green-950',
                        'hover:bg-green-100 dark:hover:bg-green-900'
                      )}
                      onClick={() => setDivisionStatusFilter(prev => prev === 'finished' ? 'all' : 'finished')}
                    >
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">{divisionStatusCounts.finished}</p>
                      <p className="text-sm text-muted-foreground">Finished</p>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="mat-select">Fight Area (Mat)</Label>
                    <Select value={selectedMat || ''} onValueChange={(value: string | 'all-mats') => handleMatChange(value)}>
                      <SelectTrigger id="mat-select">
                        <SelectValue placeholder="Select a Mat" />
                      </SelectTrigger>
                      <SelectContent>
                        {matNames.map(mat => (
                          <SelectItem key={mat} value={mat}>
                            {mat === 'all-mats' ? 'All Areas' : mat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedMat && (
                    <MatCategoryList
                      event={event}
                      selectedMat={selectedMat}
                      selectedCategoryKey={null}
                      onSelectCategory={handleSelectCategory}
                      divisionStatusFilter={divisionStatusFilter}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="mat-control" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Mat Control Center</CardTitle>
                  <CardDescription>Complete overview of all mats with remaining fights and estimated time.</CardDescription>
                </CardHeader>
                <CardContent>
                  <MatControlCenter
                    event={event}
                    onDivisionSelect={(division) => {
                      setSelectedDivisionForDetail(division);
                      setBracketsSubTab('fight-overview');
                    }}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="fight-overview" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Fights Overview</CardTitle>
                  <CardDescription>List of all categories with their assigned mats. Click a row to view details.</CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedDivisionForDetail ? (
                    <DivisionDetailView
                      event={event}
                      division={selectedDivisionForDetail}
                      onBack={() => {
                        setSelectedDivisionForDetail(null);
                        setBracketsSubTab('manage-fights');
                      }}
                    />
                  ) : (
                    <FightOverview
                      event={event}
                      onDivisionSelect={(division) => setSelectedDivisionForDetail(division)}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>

      <AlertDialog open={showRegenerateConfirmDialog} onOpenChange={setShowRegenerateConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate Existing Brackets?</AlertDialogTitle>
            <AlertDialogDescription>
              You selected divisions that already have generated brackets. Regenerating them will erase current brackets and any unstarted fight results.
              {divisionsToConfirmRegenerate.length > 0 && (
                <ul className="list-disc list-inside mt-2">
                  {divisionsToConfirmRegenerate.map(div => (
                    <li key={div.id} className="font-medium">{div.name}</li>
                  ))}
                </ul>
              )}
              Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowRegenerateConfirmDialog(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRegenerateAction}>Regenerate Brackets</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showOngoingWarningDialog} onOpenChange={setShowOngoingWarningDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Warning: Category In Progress!</AlertDialogTitle>
            <AlertDialogDescription>
              The division "{divisionToRegenerateOngoing?.name}" already has fights with recorded results.
              Regenerating the bracket for this division will erase all existing results and fight progress.
              {userRole === 'admin' ? (
                <>
                  <p className="mt-2 font-semibold text-red-600">This is a critical and irreversible action.</p>
                  <p className="mt-1">Are you sure you want to continue as administrator?</p>
                </>
              ) : (
                <p className="mt-2 font-semibold text-red-600">You do not have permission to regenerate brackets for categories in progress.</p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowOngoingWarningDialog(false)}>Cancel</AlertDialogCancel>
            {userRole === 'admin' && (
              <AlertDialogAction onClick={confirmRegenerateOngoingAction} className="bg-red-600 hover:bg-red-700">
                Regenerate (Admin Override)
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default BracketsTab;