"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Event, Bracket, Division } from '@/types/index';
import { StaffRole } from '@/types/staff-access';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { LayoutGrid, Swords, Printer, Medal } from 'lucide-react';
import MatDistribution from '@/components/MatDistribution';
import BracketView from '@/components/BracketView';
import { generateBracketForDivision } from '@/utils/bracket-generator';
import { generateMatFightOrder } from '@/utils/fight-order-generator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
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
  navDivisionDetailTab: string | null;
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
  navDivisionDetailTab,
}) => {
  const navigate = useNavigate();

  const [bracketSearchTerm, setBracketSearchTerm] = useState('');
  const [selectedDivisionIdForBracket, setSelectedDivisionIdForBracket] = useState<string | 'all'>('all');
  const [showRegenerateConfirmDialog, setShowRegenerateConfirmDialog] = useState(false);
  const [divisionsToConfirmRegenerate, setDivisionsToConfirmRegenerate] = useState<Division[]>([]);
  const [showOngoingWarningDialog, setShowOngoingWarningDialog] = useState(false);
  const [divisionToRegenerateOngoing, setDivisionToRegenerateOngoing] = useState<Division | null>(null);

  // Persist selectedMat to localStorage
  const [selectedMat, setSelectedMat] = useState<string | 'all-mats' | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`selectedMat_${event.id}`) || null;
    }
    return null;
  });
  
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
    if (navSelectedDivisionId) {
      if (navSelectedMat) {
         setSelectedMat(navSelectedMat);
      }
      const division = event.divisions?.find(d => d.id === navSelectedDivisionId);
      if (division) {
        setSelectedDivisionForDetail(division);
        setBracketsSubTab('fight-overview');
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
      
      // Helper function to shuffle array
      const shuffleArray = <T,>(array: T[]): T[] => {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
      };

      divisionsToGenerate.forEach(div => {
        let athletes = getAthletesForDivision(div.id);
        const maxPerBracket = event.max_athletes_per_bracket;
        const splittingEnabled = event.is_bracket_splitting_enabled;

        // Reset existing brackets for this division key prefix
        // (This is tricky because keys usually match div.id. For splits, we use div.id-A, div.id-B)
        // Ideally we should CLEANUP old brackets for this division before generating new ones.
        // But for now, we will just generate new ones.

        if (splittingEnabled && maxPerBracket && maxPerBracket > 1 && athletes.length > maxPerBracket) {
           // Splitting logic
           const shuffledAthletes = shuffleArray(athletes);
           const groups = [];
           
           // Calculate optimal split to avoid tiny last bracket
           // Simple strategy: chunk by maxPerBracket
           for (let i = 0; i < shuffledAthletes.length; i += maxPerBracket) {
              groups.push(shuffledAthletes.slice(i, i + maxPerBracket));
           }

           // If last group is too small (e.g. < 2), try to redistribute? 
           // For MVP, just let it be. Or if last group is 1, merge with previous? 
           // Let's stick to simple chunking for now as per plan.

           const groupLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
           
           groups.forEach((groupAthletes, index) => {
              const groupSuffix = groupLetters[index] || `${index + 1}`;
              const bracketId = `${div.id}-${groupSuffix}`; // Virtual ID
              
              const bracket = generateBracketForDivision(div, event.athletes || [], { 
                thirdPlace: includeThirdPlaceFromEvent, 
                explicitAthletes: groupAthletes,
                enableTeamSeparation: event.enable_team_separation
              });

              // Override properties for the virtual bracket
              bracket.id = bracketId; // Important: ID is customized
              bracket.group_name = `Group ${groupSuffix}`;
              newBrackets[bracketId] = bracket;
           });

        } else {
           // Standard generation
           const bracket = generateBracketForDivision(div, event.athletes || [], { 
             thirdPlace: includeThirdPlaceFromEvent,
             enableTeamSeparation: event.enable_team_separation
           });
           newBrackets[div.id] = bracket;
        }
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
    <div className="space-y-6">
      {(userRole || isBracketStaffOnly) && (
        <Tabs value={bracketsSubTab} onValueChange={setBracketsSubTab} className="w-full">
          <div className="flex items-center justify-between mb-4">
            {isBracketStaffOnly ? (
              <TabsList>
                <TabsTrigger value="mat-control">Mat Control</TabsTrigger>
              </TabsList>
            ) : (
              <TabsList>
                <TabsTrigger value="generate-brackets">
                  <LayoutGrid className="mr-2 h-4 w-4" /> Generate
                </TabsTrigger>
                <TabsTrigger value="mat-distribution">Mat Distribution</TabsTrigger>
                <TabsTrigger value="mat-control">Mat Control</TabsTrigger>
                <TabsTrigger value="wo-champions" className="relative">
                  WO Champions
                  {singleAthleteDivisions.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-pending text-pending-foreground rounded-full">
                      {singleAthleteDivisions.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            )}
          </div>

          <TabsContent value="mat-distribution" className="mt-0">
             <MatDistribution event={event} onUpdateMatAssignments={handleUpdateMatAssignments} isBeltGroupingEnabled={event.is_belt_grouping_enabled ?? true} />
          </TabsContent>

          <TabsContent value="generate-brackets" className="mt-0">
             <Card>
                <CardHeader>
                    <CardTitle>Generate Brackets</CardTitle>
                    <CardDescription>Select divisions to generate brackets and manage fight matching.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Generation Toolbar */}
                    <div className="flex flex-col md:flex-row gap-4 items-end bg-muted/40 p-4 rounded-lg border">
                    <div className="flex-1 space-y-2 w-full md:w-auto">
                        <Label htmlFor="division-select">Division to Generate</Label>
                        <Select value={selectedDivisionIdForBracket} onValueChange={(value: string | 'all') => setSelectedDivisionIdForBracket(value)}>
                        <SelectTrigger id="division-select" className="bg-background">
                            <SelectValue placeholder="Select a division or all" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Divisions</SelectItem>
                            {availableDivisionsForBracketGeneration.map(div => {
                            const divisionBrackets = Object.values(event.brackets || {}).filter(b => b.division_id === div.id);
                            let statusIndicator = <Circle className="h-4 w-4 text-muted-foreground opacity-50" />; 
                            let statusText = 'Não gerado';
                            
                            if (divisionBrackets.length > 0) {
                                const allFinished = divisionBrackets.every(b => b.winner_id);
                                const anyInProgress = divisionBrackets.some(b => {
                                    if (!b.rounds) return false;
                                    return b.rounds.flat().some(m => m.winner_id !== undefined) && !b.winner_id;
                                });

                                if (allFinished) {
                                    statusIndicator = <CheckCircle2 className="h-4 w-4 text-success" />; 
                                    statusText = 'Finalizado';
                                } else if (anyInProgress) {
                                    statusIndicator = <RefreshCw className="h-4 w-4 text-blue-500" />; 
                                    statusText = 'Em progresso';
                                } else {
                                    statusIndicator = <ClipboardList className="h-4 w-4 text-orange-500" />; 
                                    statusText = 'Gerado';
                                }
                                
                                if (divisionBrackets.length > 1) {
                                    statusText += ` (${divisionBrackets.length} groups)`;
                                }
                            }
                            
                            return (
                                <SelectItem key={div.id} value={div.id}>
                                <span className="flex items-center gap-2">
                                    <span title={statusText} className="flex items-center">{statusIndicator}</span>
                                    {div.name}
                                </span>
                                </SelectItem>
                            );
                            })}
                        </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center space-x-2 border p-2 rounded-md bg-background h-10">
                        <Switch 
                        id="include-ongoing-toggle"
                        checked={includeOngoingBrackets}
                        onCheckedChange={setIncludeOngoingBrackets}
                        disabled={userRole !== 'admin'}
                        />
                        <Label htmlFor="include-ongoing-toggle" className="text-sm font-normal cursor-pointer">
                        Re-gen Results
                        </Label>
                    </div>

                    <Button onClick={handleGenerateBrackets} className="">
                        <LayoutGrid className="mr-2 h-4 w-4" /> Generate
                    </Button>
                    
                    {Object.keys(brackets).length > 0 && (
                        <Button variant="outline" onClick={() => navigate(`/events/${event.id}/print-brackets`)}>
                        <Printer className="mr-2 h-4 w-4" /> Print PDF
                        </Button>
                    )}
                    </div>

                    <div className="space-y-4">
                    {/* Generated Brackets Toolbar */}
                    <Card className="mb-6 bg-muted/40">
                      <CardContent className="p-4 space-y-4">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                           <div>
                                <h3 className="text-sm font-medium text-muted-foreground mb-2">Filters</h3>
                                <div className="flex items-center gap-2">
                                    <Badge
                                        variant="outline"
                                        className={cn(
                                        "cursor-pointer transition-all px-3 py-1 border hover:bg-muted/10",
                                        "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                                        )}
                                    >
                                        Total: {Object.keys(brackets).length}
                                    </Badge>
                                </div>
                           </div>
                           <div className="flex items-center gap-2">
                                <Button size="sm" variant="outline" onClick={() => window.print()}>
                                    <Printer className="h-4 w-4 mr-2" /> Print All
                                </Button>
                           </div>
                        </div>

                         <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search brackets by division name..." 
                                className="pl-8 w-full" 
                                value={bracketSearchTerm}
                                onChange={(e) => setBracketSearchTerm(e.target.value)}
                            />
                        </div>
                      </CardContent>
                    </Card>

                    {Object.keys(brackets).length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed rounded-lg text-muted-foreground">
                        No brackets generated yet. Select a division above to start.
                        </div>
                    ) : (
                        <div className="space-y-8">
                        {Object.values(brackets)
                            .filter(bracket => {
                                if (!bracketSearchTerm) return true;
                                const division = event?.divisions?.find(d => d.id === bracket.division_id);
                                const term = bracketSearchTerm.toLowerCase();
                                
                                // Search by division name, bracket ID, or group name
                                return (
                                    division?.name.toLowerCase().includes(term) ||
                                    bracket.id.toLowerCase().includes(term) ||
                                    (bracket.group_name && bracket.group_name.toLowerCase().includes(term))
                                );
                            })
                            .map(bracket => {
                            const division = event?.divisions?.find(d => d.id === bracket.division_id);
                            if (!division) return null;
                            return (<BracketView key={bracket.id} bracket={bracket} allAthletes={event.athletes || []} division={division} eventId={event.id} />);
                        })}
                        {Object.values(brackets).filter(bracket => {
                                if (!bracketSearchTerm) return true;
                                const division = event?.divisions?.find(d => d.id === bracket.division_id);
                                const term = bracketSearchTerm.toLowerCase();
                                return (
                                    division?.name.toLowerCase().includes(term) ||
                                    bracket.id.toLowerCase().includes(term) ||
                                    (bracket.group_name && bracket.group_name.toLowerCase().includes(term))
                                );
                        }).length === 0 && Object.keys(brackets).length > 0 && (
                            <p className="text-muted-foreground text-center py-8">No brackets matching your search.</p>
                        )}
                        </div>
                    )}
                    </div>
                </CardContent>
             </Card>
          </TabsContent>

          <TabsContent value="wo-champions" className="mt-0">
             <div className="rounded-md border bg-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-pending">Single-Athlete Divisions</h3>
                    <p className="text-sm text-muted-foreground">Declare champions by WO (walkover).</p>
                  </div>
                </div>

                {singleAthleteDivisions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No single-athlete divisions found.</p>
                ) : (
                  <div className="grid gap-2">
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
                            <span className="text-sm text-success font-medium flex items-center gap-1">
                              <Medal className="h-4 w-4" /> Champion by WO
                            </span>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="border-pending/50 text-pending hover:bg-pending/10"
                              onClick={() => declareSingleAthleteChampion(item.division.id, athlete.id)}
                            >
                              Declare Champion
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
             </div>
          </TabsContent>

          <TabsContent value="manage-fights" className="mt-0">
             <div className="text-center py-12 text-muted-foreground">Section temporarily disabled.</div>
          </TabsContent>

          <TabsContent value="mat-control" className="mt-0">
             <MatControlCenter
               event={event}
               onDivisionSelect={(division) => {
                 setSelectedDivisionForDetail(division);
                 setBracketsSubTab('fight-overview');
               }}
             />
          </TabsContent>

          {/* Hidden tab - only accessible via Mat Control */}
          <TabsContent value="fight-overview" className="mt-0">
             {selectedDivisionForDetail ? (
               <DivisionDetailView
                 event={event}
                 division={selectedDivisionForDetail}
                 onBack={() => {
                   setSelectedDivisionForDetail(null);
                   setBracketsSubTab('mat-control');
                 }}
                 initialTab={navDivisionDetailTab || undefined}
               />
             ) : (
               <div className="text-center py-8 text-muted-foreground">
                 <p>No division selected.</p>
               </div>
             )}
          </TabsContent>
        </Tabs>
      )}
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
              <AlertDialogAction onClick={confirmRegenerateOngoingAction} className="bg-destructive hover:bg-destructive/90">
                Regenerate (Admin Override)
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BracketsTab;