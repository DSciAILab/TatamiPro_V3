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
import { LayoutGrid, Swords, Printer, Medal, Circle, CheckCircle2, RefreshCw, ClipboardList, Search } from 'lucide-react';
import MatDistribution from '@/components/MatDistribution';
import BracketView from '@/components/BracketView';
import { useBracketGeneration } from '@/features/brackets';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

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
  const [selectedBracketIdForDetail, setSelectedBracketIdForDetail] = useState<string | undefined>(undefined);
  const [includeOngoingBrackets, setIncludeOngoingBrackets] = useState<boolean>(false);
  const [divisionStatusFilter, setDivisionStatusFilter] = useState<'all' | 'active' | 'finished'>('all');
  const [bracketStatusFilter, setBracketStatusFilter] = useState<'all' | 'finished' | 'in_progress' | 'generated'>('all');

  // Use event.brackets directly instead of local state to ensure real-time updates
  const brackets = event.brackets || {};

  // Use the bracket generation hook for all bracket-related logic
  const {
    availableDivisions: availableDivisionsForBracketGeneration,
    singleAthleteDivisions,
    generateBrackets: executeBracketGeneration,
    declareSingleAthleteChampion,
    hasOngoingFights,
    isDivisionFinished,
    divisionStatusCounts,
  } = useBracketGeneration({ event, onUpdateBrackets });

  // Local helper that still uses the logic from the hook filter (for display purposes)
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
        setSelectedBracketIdForDetail(undefined); // Reset unless nav supports bracketId
        setBracketsSubTab('fight-overview');
      }
    }
  }, [navSelectedMat, navSelectedDivisionId, event.divisions, setBracketsSubTab]);

  const handleGenerateBrackets = () => {
    if (!event) {
      showError("Event not loaded.");
      return;
    }
    let divisionsToConsider: Division[] = [];
    if (selectedDivisionIdForBracket === 'all') {
      divisionsToConsider = availableDivisionsForBracketGeneration;
    } else {
      // Logic handle both parent ID and split ID (div-A, div-B)
      // If split ID, find division by stripping suffix or more robustly: checking if div.id is part of selectedId
      const division = availableDivisionsForBracketGeneration.find(d => 
          selectedDivisionIdForBracket === d.id || selectedDivisionIdForBracket.startsWith(`${d.id}-`)
      );

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
    
    // Check if the selected item is a split bracket ID (e.g. "divA-B")
    const isSplitBracketSelected = selectedDivisionIdForBracket !== 'all' && 
                                   availableDivisionsForBracketGeneration.every(d => d.id !== selectedDivisionIdForBracket);

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
      // If specific split bracket is selected, check only its status
      if (isSplitBracketSelected) {
          const splitBracket = event.brackets?.[selectedDivisionIdForBracket];
          const isOngoing = splitBracket?.rounds?.flat().some(m => m.winner_id !== undefined);
          if (isOngoing) {
              showError("This group has fights in progress. Enable the toggle to regenerate.");
              return;
          }
          // If we are here, it's not ongoing or toggle is off but safe to regen (wait, toggle is off here)
          divisionsToActuallyGenerate = divisionsToConsider; 
      } else {
          divisionsToActuallyGenerate = divisionsToConsider.filter(div => !hasOngoingFights(div.id));
          
          if (divisionsToActuallyGenerate.length === 0) {
            showError("All selected divisions already have fights in progress. Enable the toggle to regenerate them.");
            return;
          }
      }
    }

    // Helper to check if division has any existing bracket (regular or split)
    const hasBracketForDivision = (divId: string): boolean => {
      if (event.brackets?.[divId]) return true;
      // Check for split variants
      return Object.keys(event.brackets || {}).some(key => key.startsWith(`${divId}-`));
    };

    // GRANULAR REGENERATION: If split bracket selected
    if (isSplitBracketSelected) {
        // Direct execution for split bracket (no bulk confirmation needed usually, or reuse dialog)
        const parentDiv = divisionsToActuallyGenerate[0]; // Should be the single parent div found earlier
        if (!parentDiv) return;

        // If it exists, warn about overwrite?
        const existing = event.brackets?.[selectedDivisionIdForBracket];
        if (existing) {
             // Reuse the confirm dialog logic but for SINGLE item
             setDivisionsToConfirmRegenerate([parentDiv]); // Only used for displaying name in dialog
             setShowRegenerateConfirmDialog(true);
             // We need to know specific ID in confirm handler... 
             // Temporarily store it in a ref or state? 
             // Or just execute directly for now if no ongoing fights?
             // Let's execute directly for specific split groups to avoid complex dialog state for now, 
             // as user explicitly selected a specific group.
             // Actually, safer to ask.
             // We can use a new state or hack divisionsToConfirmRegenerate. 
             // Let's modify executeBracketGeneration call in confirmRegenerateAction.
        } else {
            executeBracketGeneration([parentDiv], { specificBracketId: selectedDivisionIdForBracket });
        }
        return;
    }

    const divisionsThatWillBeRegenerated = divisionsToActuallyGenerate.filter(div => hasBracketForDivision(div.id));
    if (divisionsThatWillBeRegenerated.length > 0) {
      setDivisionsToConfirmRegenerate(divisionsThatWillBeRegenerated);
      setShowRegenerateConfirmDialog(true);
    } else {
      executeBracketGeneration(divisionsToActuallyGenerate);
    }
  };

  const confirmRegenerateAction = () => {
    // Check if we are regenerating a specific split bracket
    const isSplitBracketSelected = selectedDivisionIdForBracket !== 'all' && 
                                   availableDivisionsForBracketGeneration.every(d => d.id !== selectedDivisionIdForBracket);
    
    if (isSplitBracketSelected) {
         // Find parent division for this split bracket
         const parentDiv = availableDivisionsForBracketGeneration.find(div => selectedDivisionIdForBracket.startsWith(`${div.id}-`));
         if (parentDiv) {
             executeBracketGeneration([parentDiv], { specificBracketId: selectedDivisionIdForBracket });
         }
    } else {
        executeBracketGeneration(divisionsToConfirmRegenerate);
    }
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
    setSelectedBracketIdForDetail(undefined);
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
              <TabsList className="w-full justify-start">
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

          <TabsContent value="generate-brackets" className="mt-4 space-y-6">
             {/* Header Section with Gray Background */}
             <div className="bg-muted/20 border rounded-lg p-6 space-y-4">
                {/* Top Row: Filters and Actions */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    {/* Filters - Left */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-muted-foreground mr-1">Filter:</span>
                        {[
                            { id: 'all', label: 'Total', count: Object.keys(brackets).length, color: 'secondary' },
                            { id: 'finished', label: 'Finished', count: Object.values(brackets).filter(b => b.winner_id).length, color: 'success' },
                            { id: 'in_progress', label: 'In Progress', count: Object.values(brackets).filter(b => !b.winner_id && b.rounds?.flat().some(m => m.winner_id)).length, color: 'blue-500' },
                            { id: 'generated', label: 'Pending', count: Object.values(brackets).filter(b => !b.winner_id && !b.rounds?.flat().some(m => m.winner_id)).length, color: 'orange-500' }
                        ].map(filter => (
                            <Badge
                                key={filter.id}
                                variant="outline"
                                className={cn(
                                    "cursor-pointer transition-all px-3 py-1 border",
                                    // Dynamic color logic
                                    filter.color === 'secondary' && (bracketStatusFilter === filter.id ? "bg-secondary text-secondary-foreground border-transparent" : "bg-transparent text-muted-foreground border-muted-foreground/30 hover:text-foreground"),
                                    filter.color === 'blue-500' && (bracketStatusFilter === filter.id ? "bg-blue-500 text-white border-transparent" : "bg-transparent text-blue-500 border-blue-500/50 hover:bg-blue-500/10"),
                                    filter.color === 'orange-500' && (bracketStatusFilter === filter.id ? "bg-orange-500 text-white border-transparent" : "bg-transparent text-orange-500 border-orange-500/50 hover:bg-orange-500/10"),
                                    filter.color === 'success' && (bracketStatusFilter === filter.id ? "bg-success text-white border-transparent" : "bg-transparent text-success border-success/50 hover:bg-success/10"),
                                )}
                                onClick={() => setBracketStatusFilter(filter.id as any)}
                            >
                                {filter.label}: {filter.count}
                            </Badge>
                        ))}
                    </div>

                    {/* Actions - Right (Moved from bottom) */}
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        {/* Smart Generate Button */}
                        {(() => {
                            const isRegenMode = selectedDivisionIdForBracket === 'all' 
                                ? availableDivisionsForBracketGeneration.some(div => event.brackets?.[div.id])
                                : !!event.brackets?.[selectedDivisionIdForBracket];

                            return (
                                <Button 
                                    onClick={() => {
                                        if (isRegenMode) setIncludeOngoingBrackets(true);
                                        handleGenerateBrackets();
                                    }} 
                                    className={cn(isRegenMode ? "bg-orange-500 hover:bg-orange-600" : "")}
                                >
                                    <LayoutGrid className="mr-2 h-4 w-4" /> 
                                    {isRegenMode ? "Regenerate Brackets" : "Generate Brackets"}
                                </Button>
                            );
                        })()}

                        {Object.keys(brackets).length > 0 && (
                            <Button variant="outline" className="bg-background" onClick={() => navigate(`/events/${event.id}/print-brackets`)}>
                            <Printer className="mr-2 h-4 w-4" /> Print PDF
                            </Button>
                        )}
                    </div>
                </div>

                {/* Bottom Row: Inputs (Full Width) */}
                <div className="flex flex-col md:flex-row gap-4 w-full">
                    {/* Left: Division Select */}
                    <div className="w-full md:flex-1">
                        <Select value={selectedDivisionIdForBracket} onValueChange={(value: string | 'all') => setSelectedDivisionIdForBracket(value)}>
                        <SelectTrigger id="division-select" className="bg-background w-full">
                            <SelectValue placeholder="Select a division or all" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                            <SelectItem value="all">All Divisions</SelectItem>
                            {availableDivisionsForBracketGeneration.map(div => {
                            const divisionBrackets = Object.values(event.brackets || {}).filter(b => b.division_id === div.id);
                            
                            // Check for splits
                            const splitBrackets = divisionBrackets.filter(b => b.id.startsWith(`${div.id}-`)).sort((a,b) => a.id.localeCompare(b.id));

                            const hasSplits = splitBrackets.length > 0;
                            const mainBracket = divisionBrackets.find(b => b.id === div.id);

                            // Items to render: Parent (if no splits or just as header?), Splits.
                            // If splits exist, mainBracket usually shouldn't exist ideally.
                            // We render parent item to allow FULL regen of that division.
                            // And then child items for specific groups.

                            const renderItem = (b: Bracket | undefined, label: string, value: string, isChild = false) => {
                                let statusIndicator = <Circle className="h-4 w-4 text-muted-foreground opacity-50" />; 
                                let statusText = 'Não gerado';
                                
                                if (b) {
                                  const isFinished = !!b.winner_id;
                                  const isInProgress = !isFinished && b.rounds?.flat().some(m => m.winner_id !== undefined);

                                  if (isFinished) {
                                      statusIndicator = <CheckCircle2 className="h-4 w-4 text-success" />; 
                                      statusText = 'Finalizado';
                                  } else if (isInProgress) {
                                      statusIndicator = <RefreshCw className="h-4 w-4 text-blue-500" />; 
                                      statusText = 'Em progresso';
                                  } else {
                                      statusIndicator = <ClipboardList className="h-4 w-4 text-orange-500" />; 
                                      statusText = 'Gerado';
                                  }
                                } else if (hasSplits && !isChild) {
                                   // Parent status aggregation for splits
                                   const anyInProgress = splitBrackets.some(sb => !sb.winner_id && sb.rounds?.flat().some(m => m.winner_id));
                                   const allFinished = splitBrackets.every(sb => sb.winner_id);
                                   
                                    if (allFinished) {
                                      statusIndicator = <CheckCircle2 className="h-4 w-4 text-success" />; 
                                      statusText = 'Todos Finalizados';
                                  } else if (anyInProgress) {
                                      statusIndicator = <RefreshCw className="h-4 w-4 text-blue-500" />; 
                                      statusText = 'Alguns em progresso';
                                  } else {
                                       statusIndicator = <ClipboardList className="h-4 w-4 text-orange-500" />; 
                                      statusText = 'Gerados';
                                  }
                                }

                                return (
                                   <SelectItem key={value} value={value} className={cn(isChild ? "pl-8 text-sm" : "font-medium")}>
                                    <span className="flex items-center gap-2">
                                        <span title={statusText} className="flex items-center">{statusIndicator}</span>
                                        {label}
                                    </span>
                                   </SelectItem>
                                )
                            };

                            const items = [];
                            // Parent Item
                            items.push(renderItem(mainBracket, hasSplits ? `${div.name} (All Groups)` : div.name, div.id));

                            // Split Items
                            splitBrackets.forEach(sb => {
                                items.push(renderItem(sb, sb.group_name || sb.id, sb.id, true));
                            });

                            return items;
                            })}
                        </SelectContent>
                        </Select>
                    </div>
                    
                    {/* Right: Integrated Search */}
                    <div className="relative w-full md:flex-1">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search brackets..." 
                            className="pl-8 w-full bg-background" 
                            value={bracketSearchTerm}
                            onChange={(e) => setBracketSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
             </div>

             {/* Brackets Grid */}
             {Object.keys(brackets).length === 0 ? (
                 <div className="text-center py-12 border-2 border-dashed rounded-lg text-muted-foreground">
                 No brackets generated yet. Select a division above to start.
                 </div>
             ) : (
                 <div className="space-y-8">
                 {Object.values(brackets)
                     .filter(bracket => {
                         // Status Filter
                         const isFinished = !!bracket.winner_id;
                         const isInProgress = !isFinished && bracket.rounds?.flat().some(m => m.winner_id !== undefined);
                         
                         if (bracketStatusFilter === 'finished' && !isFinished) return false;
                         if (bracketStatusFilter === 'in_progress' && !isInProgress) return false;
                         if (bracketStatusFilter === 'generated' && (isFinished || isInProgress)) return false;

                         // Search Filter
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
               onDivisionSelect={(division, bracketId) => {
                 setSelectedDivisionForDetail(division);
                 setSelectedBracketIdForDetail(bracketId);
                 setBracketsSubTab('fight-overview');
               }}
               onUpdateBracket={(divisionId, updatedBracket) => {
                  const newBrackets = { ...event.brackets, [updatedBracket.id]: updatedBracket };
                  onUpdateBrackets(newBrackets, event.mat_fight_order || {}, true);
               }}
             />
          </TabsContent>

          {/* Hidden tab - only accessible via Mat Control */}
          <TabsContent value="fight-overview" className="mt-0">
             {selectedDivisionForDetail ? (
               <DivisionDetailView
                 event={event}
                 division={selectedDivisionForDetail}
                 bracketId={selectedBracketIdForDetail}
                 onBack={() => {
                   setSelectedDivisionForDetail(null);
                   setSelectedBracketIdForDetail(undefined);
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