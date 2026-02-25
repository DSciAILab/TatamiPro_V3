import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Event, Bracket, Division } from '@/types/index';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LayoutGrid, Printer, Circle, CheckCircle2, RefreshCw, ClipboardList, Search } from 'lucide-react';
import BracketView from '@/components/BracketView';
import { useBracketGeneration } from '@/features/brackets';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { showError } from '@/utils/toast';
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

interface GenerateBracketsConfigProps {
  event: Event;
  userRole?: 'admin' | 'coach' | 'staff' | 'athlete';
  onUpdateBrackets: (brackets: Record<string, Bracket>, matFightOrder: Record<string, string[]>, shouldSave?: boolean) => void;
}

export const GenerateBracketsConfig: React.FC<GenerateBracketsConfigProps> = ({
  event,
  userRole,
  onUpdateBrackets,
}) => {
  const navigate = useNavigate();

  const [bracketSearchTerm, setBracketSearchTerm] = useState('');
  const [selectedDivisionIdForBracket, setSelectedDivisionIdForBracket] = useState<string | 'all'>('all');
  const [showRegenerateConfirmDialog, setShowRegenerateConfirmDialog] = useState(false);
  const [divisionsToConfirmRegenerate, setDivisionsToConfirmRegenerate] = useState<Division[]>([]);
  const [showOngoingWarningDialog, setShowOngoingWarningDialog] = useState(false);
  const [divisionToRegenerateOngoing, setDivisionToRegenerateOngoing] = useState<Division | null>(null);
  const [includeOngoingBrackets, setIncludeOngoingBrackets] = useState<boolean>(false);
  const [bracketStatusFilter, setBracketStatusFilter] = useState<'all' | 'finished' | 'in_progress' | 'generated'>('all');

  const brackets = event.brackets || {};

  const {
    availableDivisions: availableDivisionsForBracketGeneration,
    generateBrackets: executeBracketGeneration,
    hasOngoingFights,
  } = useBracketGeneration({ event, onUpdateBrackets });

  const handleGenerateBrackets = () => {
    if (!event) {
      showError("Event not loaded.");
      return;
    }
    let divisionsToConsider: Division[] = [];
    if (selectedDivisionIdForBracket === 'all') {
      divisionsToConsider = availableDivisionsForBracketGeneration;
    } else {
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

    let divisionsToActuallyGenerate: Division[];
    const isSplitBracketSelected = selectedDivisionIdForBracket !== 'all' && 
                                   availableDivisionsForBracketGeneration.every(d => d.id !== selectedDivisionIdForBracket);

    if (includeOngoingBrackets) {
      divisionsToActuallyGenerate = divisionsToConsider;
      if (divisionsWithOngoingFights.length > 0 && userRole !== 'admin') {
        showError("You do not have permission to regenerate brackets for categories in progress.");
        return;
      }
      if (divisionsWithOngoingFights.length > 0) {
        if (selectedDivisionIdForBracket !== 'all') {
          setDivisionToRegenerateOngoing(divisionsWithOngoingFights[0]);
          setShowOngoingWarningDialog(true);
          return;
        }
      }
    } else {
      if (isSplitBracketSelected) {
          const splitBracket = event.brackets?.[selectedDivisionIdForBracket];
          const isOngoing = splitBracket?.rounds?.flat().some(m => m.winner_id !== undefined);
          if (isOngoing) {
              showError("This group has fights in progress. Enable the toggle to regenerate.");
              return;
          }
          divisionsToActuallyGenerate = divisionsToConsider; 
      } else {
          divisionsToActuallyGenerate = divisionsToConsider.filter(div => !hasOngoingFights(div.id));
          if (divisionsToActuallyGenerate.length === 0) {
            showError("All selected divisions already have fights in progress. Enable the toggle to regenerate them.");
            return;
          }
      }
    }

    const hasBracketForDivision = (divId: string): boolean => {
      if (event.brackets?.[divId]) return true;
      return Object.keys(event.brackets || {}).some(key => key.startsWith(`${divId}-`));
    };

    if (isSplitBracketSelected) {
        const parentDiv = divisionsToActuallyGenerate[0];
        if (!parentDiv) return;

        const existing = event.brackets?.[selectedDivisionIdForBracket];
        if (existing) {
             setDivisionsToConfirmRegenerate([parentDiv]);
             setShowRegenerateConfirmDialog(true);
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
    const isSplitBracketSelected = selectedDivisionIdForBracket !== 'all' && 
                                   availableDivisionsForBracketGeneration.every(d => d.id !== selectedDivisionIdForBracket);
    
    if (isSplitBracketSelected) {
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

  return (
    <div className="space-y-6">
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

            {/* Actions - Right */}
            <div className="flex items-center gap-2 w-full md:w-auto">
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

        {/* Bottom Row: Inputs */}
        <div className="flex flex-col md:flex-row gap-4 w-full">
            <div className="w-full md:flex-1">
                <Select value={selectedDivisionIdForBracket} onValueChange={(value: string | 'all') => setSelectedDivisionIdForBracket(value)}>
                <SelectTrigger id="division-select" className="bg-background w-full">
                    <SelectValue placeholder="Select a division or all" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                    <SelectItem value="all">All Divisions</SelectItem>
                    {availableDivisionsForBracketGeneration.map(div => {
                    const divisionBrackets = Object.values(event.brackets || {}).filter(b => b.division_id === div.id);
                    const splitBrackets = divisionBrackets.filter(b => b.id.startsWith(`${div.id}-`)).sort((a,b) => a.id.localeCompare(b.id));

                    const hasSplits = splitBrackets.length > 0;
                    const mainBracket = divisionBrackets.find(b => b.id === div.id);

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
                    items.push(renderItem(mainBracket, hasSplits ? `${div.name} (All Groups)` : div.name, div.id));

                    splitBrackets.forEach(sb => {
                        items.push(renderItem(sb, sb.group_name || sb.id, sb.id, true));
                    });

                    return items;
                    })}
                </SelectContent>
                </Select>
            </div>
            
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
                  const isFinished = !!bracket.winner_id;
                  const isInProgress = !isFinished && bracket.rounds?.flat().some(m => m.winner_id !== undefined);
                  
                  if (bracketStatusFilter === 'finished' && !isFinished) return false;
                  if (bracketStatusFilter === 'in_progress' && !isInProgress) return false;
                  if (bracketStatusFilter === 'generated' && (isFinished || isInProgress)) return false;

                  if (!bracketSearchTerm) return true;
                  const division = event?.divisions?.find(d => d.id === bracket.division_id);
                  const term = bracketSearchTerm.toLowerCase();
                  
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
