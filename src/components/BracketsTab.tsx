"use client";

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Event, Bracket, Division } from '@/types/index';
import { StaffRole } from '@/types/staff-access';
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
  staffRole?: StaffRole; // Staff access role (bracket, check_in, results, admin)
  handleUpdateMatAssignments: (assignments: Record<string, string[]>) => void;
  onUpdateBrackets: (brackets: Record<string, Bracket>, matFightOrder: Record<string, string[]>, shouldSave?: boolean) => void;
  bracketsSubTab: string;
  setBracketsSubTab: (value: string) => void;
  navSelectedMat: string | null;
  navSelectedDivisionId: string | null;
}

const BracketsTab: React.FC<BracketsTabProps> = ({
  event,
  userRole,
  staffRole,
  handleUpdateMatAssignments,
  onUpdateBrackets,
  bracketsSubTab,
  setBracketsSubTab,
  navSelectedMat,
  navSelectedDivisionId,
}) => {
  const navigate = useNavigate();

  const [selectedDivisionIdForBracket, setSelectedDivisionIdForBracket] = useState<string | 'all'>('all');
  const [showRegenerateConfirmDialog, setShowRegenerateConfirmDialog] = useState(false);
  const [divisionsToConfirmRegenerate, setDivisionsToConfirmRegenerate] = useState<Division[]>([]);
  const [showOngoingWarningDialog, setShowOngoingWarningDialog] = useState(false);
  const [divisionToRegenerateOngoing, setDivisionToRegenerateOngoing] = useState<Division | null>(null);
  
  const [selectedMat, setSelectedMat] = useState<string | 'all-mats' | null>(null);
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

  useEffect(() => {
    if (navSelectedMat && navSelectedDivisionId) {
      setSelectedMat(navSelectedMat);
      const division = event.divisions?.find(d => d.id === navSelectedDivisionId);
      if (division) {
        setSelectedDivisionForDetail(division);
        setBracketsSubTab('manage-fights');
      }
    }
  }, [navSelectedMat, navSelectedDivisionId, event.divisions, setBracketsSubTab]);

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
    if (divisionToRegenerateOngoing) executeBracketGeneration([divisionToRegenerateOngoing]);
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
    if (division) setSelectedDivisionForDetail(division);
  };

  const handleBackFromDivisionDetail = () => {
    setSelectedDivisionForDetail(null);
    setBracketsSubTab('manage-fights');
  };

  // Check if user is bracket staff (limited view - only Mat Control tab)
  const isBracketStaffOnly = staffRole === 'bracket';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Brackets</CardTitle>
        <CardDescription>
          {isBracketStaffOnly 
            ? 'Gerencie as lutas a partir do Mat Control.'
            : 'Generate and view the event brackets.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {(userRole || isBracketStaffOnly) && (
          <Tabs value={bracketsSubTab} onValueChange={setBracketsSubTab} className="w-full">
            {/* Bracket staff only sees Mat Control tab */}
            {isBracketStaffOnly ? (
              <TabsList className="grid w-full grid-cols-1">
                <TabsTrigger value="mat-control">Mat Control</TabsTrigger>
              </TabsList>
            ) : (
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="generate-brackets">
                  <LayoutGrid className="mr-2 h-4 w-4" /> Generate
                </TabsTrigger>
                <TabsTrigger value="mat-distribution">Mat Distribution</TabsTrigger>
                <TabsTrigger value="mat-control">Mat Control</TabsTrigger>
                <TabsTrigger value="wo-champions" className="relative">
                  WO Champions
                  {singleAthleteDivisions.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-orange-500 text-white rounded-full">
                      {singleAthleteDivisions.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            )}

            <TabsContent value="mat-distribution" className="mt-6">
              <MatDistribution event={event} onUpdateMatAssignments={handleUpdateMatAssignments} isBeltGroupingEnabled={event.is_belt_grouping_enabled ?? true} />
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
                        {availableDivisionsForBracketGeneration.map(div => {
                          const bracket = event.brackets?.[div.id];
                          let statusIndicator = '⚪'; // No bracket
                          let statusText = 'Não gerado';
                          
                          if (bracket) {
                            if (bracket.winner_id) {
                              statusIndicator = '✅'; // Finished
                              statusText = 'Finalizado';
                            } else if (hasOngoingFights(div.id)) {
                              statusIndicator = '🔄'; // In progress
                              statusText = 'Em progresso';
                            } else {
                              statusIndicator = '📋'; // Generated but not started
                              statusText = 'Gerado';
                            }
                          }
                          
                          return (
                            <SelectItem key={div.id} value={div.id}>
                              <span className="flex items-center gap-2">
                                <span title={statusText}>{statusIndicator}</span>
                                {div.name}
                              </span>
                            </SelectItem>
                          );
                        })}
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
                    return (<BracketView key={bracket.id} bracket={bracket} allAthletes={event.athletes || []} division={division} eventId={event.id} />);
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
                  <CardTitle className="flex items-center gap-2">
                    <Swords className="h-5 w-5 text-muted-foreground" />
                    Mat and Category Selection
                  </CardTitle>
                  <CardDescription>Section temporarily disabled for maintenance.</CardDescription>
                </CardHeader>
                <CardContent className="py-12 text-center">
                  <div className="flex flex-col items-center gap-4 text-muted-foreground">
                    <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                      <Swords className="h-8 w-8" />
                    </div>
                    <div>
                      <p className="text-lg font-medium">Temporarily Unavailable</p>
                      <p className="text-sm">This section is under maintenance. Please use the "Overview" or "Mat Control" tabs instead.</p>
                    </div>
                  </div>
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

            {/* Hidden tab - only accessible via Mat Control */}
            <TabsContent value="fight-overview" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Division Details</CardTitle>
                  <CardDescription>View and manage fights for the selected division.</CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedDivisionForDetail ? (
                    <DivisionDetailView
                      event={event}
                      division={selectedDivisionForDetail}
                      onBack={() => {
                        setSelectedDivisionForDetail(null);
                        setBracketsSubTab('mat-control');
                      }}
                    />
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No division selected. Please select a division from Mat Control.</p>
                    </div>
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
                  {divisionsToConfirmRegenerate.map(div => (<li key={div.id} className="font-medium">{div.name}</li>))}
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