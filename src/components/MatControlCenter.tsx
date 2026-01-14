"use client";

import React, { useState, useMemo } from 'react';
import { Event, Division, Athlete, Bracket, Match } from '@/types/index';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Clock, Swords, ChevronDown, ChevronRight, ArrowUpDown, Trophy, Medal, UserRound, ChevronsUpDown, ChevronsDownUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface MatControlCenterProps {
  event: Event;
  onDivisionSelect?: (division: Division) => void;
}

interface DivisionInfo {
  division: Division;
  matName: string;
  athleteCount: number;
  totalFights: number;
  remainingFights: number;
  status: 'Not Generated' | 'In Progress' | 'Finished';
  fightDuration: number; // in minutes
  _bracketId?: string;
}

interface MatGroup {
  matName: string;
  divisions: DivisionInfo[];
  totalFights: number;
  remainingFights: number;
  estimatedRemainingTime: number; // in minutes
}

type SortKey = 'category' | 'athletes' | 'remaining' | 'status';
type SortDirection = 'asc' | 'desc';

const MatControlCenter: React.FC<MatControlCenterProps> = ({ event, onDivisionSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Persist expanded mats state in localStorage
  const [expandedMats, setExpandedMats] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`matControl_expanded_${event.id}`);
      if (saved) {
        try {
          return new Set(JSON.parse(saved));
        } catch {
          return new Set();
        }
      }
    }
    return new Set();
  });
  
  const [sortKey, setSortKey] = useState<SortKey>('category');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // State for expanded divisions (to show athletes inline)
  const [expandedDivisions, setExpandedDivisions] = useState<Set<string>>(new Set());
  
  // Persist status filter in localStorage
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'pending' | 'finished'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`matControl_filter_${event.id}`);
      if (saved && ['all', 'in_progress', 'pending', 'finished'].includes(saved)) {
        return saved as 'all' | 'in_progress' | 'pending' | 'finished';
      }
    }
    return 'all';
  });

  // Save expanded mats to localStorage whenever it changes
  const updateExpandedMats = (newExpanded: Set<string>) => {
    setExpandedMats(newExpanded);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`matControl_expanded_${event.id}`, JSON.stringify([...newExpanded]));
    }
  };

  // Save status filter to localStorage whenever it changes
  const updateStatusFilter = (newFilter: 'all' | 'in_progress' | 'pending' | 'finished') => {
    setStatusFilter(newFilter);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`matControl_filter_${event.id}`, newFilter);
    }
  };

  // Toggle division expansion
  const toggleDivisionExpansion = (divisionId: string) => {
    const newExpanded = new Set(expandedDivisions);
    if (newExpanded.has(divisionId)) {
      newExpanded.delete(divisionId);
    } else {
      newExpanded.add(divisionId);
    }
    setExpandedDivisions(newExpanded);
  };

  // Get athlete status in bracket
  interface AthleteStatus {
    placing: '1st' | '2nd' | '3rd' | 'eliminated' | 'active';
    eliminatedInFight?: number;
    eliminatedByName?: string;
  }

  const getAthleteStatusInBracket = (athleteId: string, bracket: Bracket): AthleteStatus => {
    // Check if winner
    if (bracket.winner_id === athleteId) {
      return { placing: '1st' };
    }
    // Check if runner-up
    if (bracket.runner_up_id === athleteId) {
      return { placing: '2nd' };
    }
    // Check if third place
    if (bracket.third_place_winner_id === athleteId) {
      return { placing: '3rd' };
    }
    
    // Check if eliminated - find the match where they lost
    const allMatches = bracket.rounds.flat();
    if (bracket.third_place_match) {
      allMatches.push(bracket.third_place_match);
    }
    
    for (const match of allMatches) {
      if (match.loser_id === athleteId && match.winner_id) {
        const winnerAthlete = event.athletes?.find(a => a.id === match.winner_id);
        return {
          placing: 'eliminated',
          eliminatedInFight: match.mat_fight_number,
          eliminatedByName: winnerAthlete ? `${winnerAthlete.first_name} ${winnerAthlete.last_name}` : undefined
        };
      }
    }
    
    return { placing: 'active' };
  };

  // Get athletes for a division
  const getAthletesForDivision = (divisionId: string): Athlete[] => {
    return (event.athletes || []).filter(a => {
      if (a.registration_status !== 'approved' || a.check_in_status !== 'checked_in') return false;
      const effectiveDivisionId = a.moved_to_division_id || a._division?.id;
      return effectiveDivisionId === divisionId;
    });
  };

  // Build mat groups with fight data
  const matGroups = useMemo(() => {
    if (!event.divisions || !event.brackets) return [];

    // Map divisions to mats
    const divisionMatMap = new Map<string, string>();
    if (event.mat_assignments) {
      for (const matName in event.mat_assignments) {
        event.mat_assignments[matName].forEach(divisionId => {
          divisionMatMap.set(divisionId, matName);
        });
      }
    }

    // Count athletes per division (considering moved athletes)
    const athletesByDivision = new Map<string, number>();
    const athleteNamesByDivision = new Map<string, string[]>();
    (event.athletes || [])
      .filter(a => a.registration_status === 'approved' && a.check_in_status === 'checked_in')
      .forEach(athlete => {
        const divisionId = athlete.moved_to_division_id || athlete._division?.id;
        if (divisionId) {
          athletesByDivision.set(divisionId, (athletesByDivision.get(divisionId) || 0) + 1);
          const names = athleteNamesByDivision.get(divisionId) || [];
          names.push(`${athlete.first_name} ${athlete.last_name}`);
          athleteNamesByDivision.set(divisionId, names);
        }
      });

    // Build division info
    // Changed strategy: Iterate over BRACKETS, not divisions. 
    // This supports multiple brackets for the same division (Split Brackets).
    const divisionsInfo: DivisionInfo[] = Object.values(event.brackets || []).map((bracket): DivisionInfo | null => {
        const division = event.divisions?.find(d => d.id === bracket.division_id);
        if (!division) return null;

        const matName = divisionMatMap.get(division.id) || 'Unassigned';
        
        // Count total and remaining fights
        let totalFights = 0;
        let remainingFights = 0;
        
        if (bracket.rounds) {
          bracket.rounds.forEach(round => {
            round.forEach(match => {
              // Only count real matches (not BYE matches)
              if (match.fighter1_id && match.fighter1_id !== 'BYE' && 
                  match.fighter2_id && match.fighter2_id !== 'BYE') {
                totalFights++;
                if (!match.winner_id) {
                  remainingFights++;
                }
              }
            });
          });
        }
        
        // Third place match
        if (bracket.third_place_match) {
          const tpm = bracket.third_place_match;
          if (tpm.fighter1_id && tpm.fighter1_id !== 'BYE' && 
              tpm.fighter2_id && tpm.fighter2_id !== 'BYE') {
            totalFights++;
            if (!tpm.winner_id) {
              remainingFights++;
            }
          }
        }

        // Determine status
        let status: DivisionInfo['status'];
        if (bracket.winner_id) {
          status = 'Finished';
        } else if (totalFights > remainingFights) {
          status = 'In Progress';
        } else {
          status = 'Not Generated';
        }

        // Get fight duration from age_division_settings
        const ageSetting = event.age_division_settings?.find(s => s.name === division.age_category_name);
        const fightDuration = ageSetting?.fight_duration || 5; // default 5 minutes
        
        // Use bracket participants for count (filtering BYEs)
        const participantCount = bracket.participants.filter(p => p !== 'BYE').length;

        // Clone division to avoid mutating original and append group name
        const displayDivision = { ...division };
        if (bracket.group_name) {
            displayDivision.name = `${division.name} [${bracket.group_name}]`;
        }

        return {
          division: displayDivision, // This "division" object might have a modified name now
          matName,
          athleteCount: participantCount,
          totalFights,
          remainingFights,
          status,
          fightDuration,
          _bracketId: bracket.id // Store bracket ID to distinguish
        };
      }).filter((item): item is DivisionInfo => item !== null);

    // Group by mat
    const groupsMap = new Map<string, MatGroup>();
    
    divisionsInfo.forEach(divInfo => {
      if (!groupsMap.has(divInfo.matName)) {
        groupsMap.set(divInfo.matName, {
          matName: divInfo.matName,
          divisions: [],
          totalFights: 0,
          remainingFights: 0,
          estimatedRemainingTime: 0,
        });
      }
      
      const group = groupsMap.get(divInfo.matName)!;
      group.divisions.push(divInfo);
      group.totalFights += divInfo.totalFights;
      group.remainingFights += divInfo.remainingFights;
      group.estimatedRemainingTime += divInfo.remainingFights * divInfo.fightDuration;
    });

    // Convert to array and sort by mat number
    return Array.from(groupsMap.values()).sort((a, b) => {
      const matA = parseInt(a.matName.replace('Mat ', ''), 10) || 999;
      const matB = parseInt(b.matName.replace('Mat ', ''), 10) || 999;
      return matA - matB;
    });
  }, [event]);

  // Filter and search
  const filteredGroups = useMemo(() => {
    const searchTerms = searchTerm.toLowerCase().split(',').map(t => t.trim()).filter(t => t.length > 0);
    
    return matGroups.map(group => {
      let filteredDivisions = group.divisions;
      
      // Apply status filter
      if (statusFilter === 'finished') {
        filteredDivisions = filteredDivisions.filter(d => d.status === 'Finished');
      } else if (statusFilter === 'in_progress') {
        filteredDivisions = filteredDivisions.filter(d => d.status === 'In Progress');
      } else if (statusFilter === 'pending') {
         filteredDivisions = filteredDivisions.filter(d => d.status === 'Not Generated' || d.status === 'Pending' as any); // Handle potential status variance
      }
      
      // Apply search
      if (searchTerms.length > 0) {
        filteredDivisions = filteredDivisions.filter(d => {
          const searchableText = `${d.division.name} ${d.matName} ${d.status}`.toLowerCase();
          return searchTerms.some(term => searchableText.includes(term));
        });
      }
      
      // Sort divisions
      filteredDivisions = [...filteredDivisions].sort((a, b) => {
        let comparison = 0;
        switch (sortKey) {
          case 'category':
            comparison = a.division.name.localeCompare(b.division.name);
            break;
          case 'athletes':
            comparison = a.athleteCount - b.athleteCount;
            break;
          case 'remaining':
            comparison = a.remainingFights - b.remainingFights;
            break;
          case 'status':
            comparison = a.status.localeCompare(b.status);
            break;
        }
        return sortDirection === 'asc' ? comparison : -comparison;
      });
      
      // Recalculate totals for filtered divisions
      const remainingFights = filteredDivisions.reduce((sum, d) => sum + d.remainingFights, 0);
      const estimatedTime = filteredDivisions.reduce((sum, d) => sum + d.remainingFights * d.fightDuration, 0);
      
      return {
        ...group,
        divisions: filteredDivisions,
        remainingFights,
        estimatedRemainingTime: estimatedTime,
      };
    }).filter(g => g.divisions.length > 0);
  }, [matGroups, searchTerm, statusFilter, sortKey, sortDirection]);

  // Calculate totals
  const totals = useMemo(() => {
    const finished = matGroups.reduce((sum, g) => sum + g.divisions.filter(d => d.status === 'Finished').length, 0);
    const inProgress = matGroups.reduce((sum, g) => sum + g.divisions.filter(d => d.status === 'In Progress').length, 0);
    const pending = matGroups.reduce((sum, g) => sum + g.divisions.filter(d => d.status === 'Not Generated').length, 0); 
    const total = finished + inProgress + pending;
    return { total, finished, inProgress, pending };
  }, [matGroups]);

  const toggleMat = (matName: string) => {
    const newExpanded = new Set(expandedMats);
    if (newExpanded.has(matName)) {
      newExpanded.delete(matName);
    } else {
      newExpanded.add(matName);
    }
    updateExpandedMats(newExpanded);
  };

  const expandAll = () => {
    updateExpandedMats(new Set(filteredGroups.map(g => g.matName)));
  };

  const collapseAll = () => {
    updateExpandedMats(new Set());
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const getStatusBadge = (status: DivisionInfo['status']) => {
    switch (status) {
      case 'Finished':
        return <span className="px-2 py-0.5 text-xs rounded-full bg-success/20 text-success">Finished</span>;
      case 'In Progress':
        return <span className="px-2 py-0.5 text-xs rounded-full bg-info/20 text-info">In Progress</span>;
      default:
        return <span className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground">Pending</span>;
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  if (matGroups.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No brackets generated yet.</p>;
  }

  return (
    <div className="space-y-4">
      {/* Toolbar Card */}
      <Card className="bg-muted/40">
        <CardContent className="py-4 space-y-4">
          {/* Status Filter Badges */}
          <div className="flex items-center gap-2 overflow-x-auto">
            <Badge
              variant={statusFilter === 'all' ? "default" : "outline"}
              className={cn(
                "cursor-pointer h-8 px-3 text-sm transition-all font-medium whitespace-nowrap",
                statusFilter === 'all' 
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 border-transparent" // Active: Solid Primary
                  : "bg-transparent text-muted-foreground border-muted-foreground/30 hover:text-foreground hover:border-foreground/50" // Inactive: Outline neutral
              )}
              onClick={() => updateStatusFilter('all')}
            >
              Todas <span className={cn("ml-1.5 text-xs", statusFilter === 'all' ? "opacity-70" : "opacity-50")}>({totals.total})</span>
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "cursor-pointer h-8 px-3 text-sm transition-all font-medium whitespace-nowrap",
                statusFilter === 'in_progress' 
                  ? "bg-info text-white border-transparent hover:bg-info/90" // Active: Solid Info
                  : "bg-transparent text-info border-info/50 hover:bg-info/10" // Inactive: Outline Info
              )}
              onClick={() => updateStatusFilter(statusFilter === 'in_progress' ? 'all' : 'in_progress')}
            >
              Em Progresso <span className={cn("ml-1.5 text-xs", statusFilter === 'in_progress' ? "opacity-70" : "opacity-50")}>({totals.inProgress})</span>
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "cursor-pointer h-8 px-3 text-sm transition-all font-medium whitespace-nowrap",
                statusFilter === 'pending' 
                  ? "bg-orange-500 text-white border-transparent hover:bg-orange-600" // Active: Solid Orange
                  : "bg-transparent text-orange-500 border-orange-500/50 hover:bg-orange-500/10" // Inactive: Outline Orange
              )}
              onClick={() => updateStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
            >
              Pendentes <span className={cn("ml-1.5 text-xs", statusFilter === 'pending' ? "opacity-70" : "opacity-50")}>({totals.pending})</span>
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "cursor-pointer h-8 px-3 text-sm transition-all font-medium whitespace-nowrap",
                statusFilter === 'finished' 
                  ? "bg-success text-white border-transparent hover:bg-success/90" // Active: Solid Success
                  : "bg-transparent text-success border-success/50 hover:bg-success/10" // Inactive: Outline Success
              )}
              onClick={() => updateStatusFilter(statusFilter === 'finished' ? 'all' : 'finished')}
            >
              Finalizadas <span className={cn("ml-1.5 text-xs", statusFilter === 'finished' ? "opacity-70" : "opacity-50")}>({totals.finished})</span>
            </Badge>
          </div>

          {/* Search Bar */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by division, athlete, mat... (comma for multiple)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                // If all are expanded, collapse; otherwise expand
                if (expandedMats.size === matGroups.length) {
                  collapseAll();
                } else {
                  expandAll();
                }
              }}
              className="flex items-center gap-2"
            >
              {expandedMats.size === matGroups.length ? (
                <>
                  <ChevronsDownUp className="h-4 w-4" />
                  Collapse All
                </>
              ) : (
                <>
                  <ChevronsUpDown className="h-4 w-4" />
                  Expand All
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Mat Groups */}
      <div className="space-y-4">
        {filteredGroups.map(group => (
          <Card key={group.matName}>
            <Collapsible
              open={expandedMats.has(group.matName)}
              onOpenChange={() => toggleMat(group.matName)}
            >
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {expandedMats.has(group.matName) ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                      <CardTitle className="text-lg">{group.matName}</CardTitle>
                      <span className="text-sm text-muted-foreground">
                        ({group.divisions.length} divisions)
                      </span>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2 text-pending">
                        <Swords className="h-4 w-4" />
                        <span className="font-medium">{group.remainingFights} fights left</span>
                      </div>
                      <div className="flex items-center gap-2 text-info">
                        <Clock className="h-4 w-4" />
                        <span className="font-medium">~{formatTime(group.estimatedRemainingTime)}</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort('category')}
                        >
                          <div className="flex items-center gap-1">
                            Category
                            <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="text-center cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort('athletes')}
                        >
                          <div className="flex items-center justify-center gap-1">
                            Athletes
                            <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="text-center cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort('remaining')}
                        >
                          <div className="flex items-center justify-center gap-1">
                            Fights Left
                            <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </TableHead>
                        <TableHead className="text-center">Est. Time</TableHead>
                        <TableHead 
                          className="text-right cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort('status')}
                        >
                          <div className="flex items-center justify-end gap-1">
                            Status
                            <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.divisions.map(divInfo => {
                        const isExpanded = expandedDivisions.has(divInfo.division.id);
                        const bracket = event.brackets?.[divInfo.division.id];
                        const athletes = getAthletesForDivision(divInfo.division.id);
                        
                        return (
                          <React.Fragment key={divInfo.division.id}>
                            <TableRow
                              className={cn(
                                "cursor-pointer hover:bg-muted/50",
                                divInfo.status === 'Finished' && "text-green-600 line-through decoration-green-600 opacity-80",
                                divInfo.status === 'In Progress' && "text-blue-600 font-bold",
                                isExpanded && "bg-muted/30"
                              )}
                              onClick={() => toggleDivisionExpansion(divInfo.division.id)}
                            >
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                  )}
                                  {divInfo.division.name}
                                </div>
                              </TableCell>
                              <TableCell className="text-center">{divInfo.athleteCount}</TableCell>
                              <TableCell className="text-center">
                                {divInfo.remainingFights} / {divInfo.totalFights}
                              </TableCell>
                              <TableCell className="text-center">
                                {formatTime(divInfo.remainingFights * divInfo.fightDuration)}
                              </TableCell>
                              <TableCell className="text-right">
                                {getStatusBadge(divInfo.status)}
                              </TableCell>
                            </TableRow>
                            
                            {/* Expanded Athletes List */}
                            {isExpanded && bracket && (
                              <TableRow className="bg-muted/20">
                                <TableCell colSpan={5} className="p-0">
                                  <div className="px-6 py-3 space-y-2">
                                    {athletes.map(athlete => {
                                      const status = getAthleteStatusInBracket(athlete.id, bracket);
                                      
                                      return (
                                        <div
                                          key={athlete.id}
                                          className={cn(
                                            "flex items-center justify-between p-2 rounded-md",
                                            status.placing === '1st' && "bg-warning/20",
                                            status.placing === '2nd' && "bg-muted",
                                            status.placing === '3rd' && "bg-pending/20",
                                            status.placing === 'eliminated' && "bg-destructive/10",
                                            status.placing === 'active' && "bg-info/20"
                                          )}
                                        >
                                          <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                              {status.placing === '1st' ? (
                                                <Trophy className="h-4 w-4 text-yellow-600" />
                                              ) : status.placing === '2nd' ? (
                                                <Medal className="h-4 w-4 text-gray-500" />
                                              ) : status.placing === '3rd' ? (
                                                <Medal className="h-4 w-4 text-orange-500" />
                                              ) : (
                                                <UserRound className="h-4 w-4 text-muted-foreground" />
                                              )}
                                            </div>
                                            <div>
                                              <p className={cn(
                                                "font-medium",
                                                status.placing === 'eliminated' && "line-through text-destructive"
                                              )}>
                                                {athlete.first_name} {athlete.last_name}
                                              </p>
                                              <p className="text-xs text-muted-foreground">{athlete.club}</p>
                                            </div>
                                          </div>
                                          
                                          <div className="flex items-center gap-2">
                                            {status.placing === '1st' && (
                                              <Badge variant="warning">🥇 1º Lugar</Badge>
                                            )}
                                            {status.placing === '2nd' && (
                                              <Badge variant="secondary">🥈 2º Lugar</Badge>
                                            )}
                                            {status.placing === '3rd' && (
                                              <Badge variant="pending">🥉 3º Lugar</Badge>
                                            )}
                                            {status.placing === 'eliminated' && (
                                              <Badge variant="destructive">
                                                Eliminado {status.eliminatedInFight ? `(Luta #${status.eliminatedInFight})` : ''}
                                              </Badge>
                                            )}
                                            {status.placing === 'active' && (
                                              <Badge variant="info">
                                                Em Competição
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                    
                                    {/* Action button to go to details */}
                                    {onDivisionSelect && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onDivisionSelect(divInfo.division);
                                        }}
                                        className="w-full mt-2 py-2 text-sm text-center text-primary hover:underline"
                                      >
                                        Ver detalhes da divisão →
                                      </button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default MatControlCenter;
