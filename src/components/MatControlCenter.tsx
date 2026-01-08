"use client";

import React, { useState, useMemo } from 'react';
import { Event, Division } from '@/types/index';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Search, Clock, Swords, ChevronDown, ChevronRight, ArrowUpDown } from 'lucide-react';
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
  const [expandedMats, setExpandedMats] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>('category');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'finished'>('all');

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
    const divisionsInfo: DivisionInfo[] = event.divisions
      .filter(div => event.brackets?.[div.id])
      .map(div => {
        const bracket = event.brackets![div.id];
        const matName = divisionMatMap.get(div.id) || 'Unassigned';
        
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
        const ageSetting = event.age_division_settings?.find(s => s.name === div.age_category_name);
        const fightDuration = ageSetting?.fight_duration || 5; // default 5 minutes

        return {
          division: div,
          matName,
          athleteCount: athletesByDivision.get(div.id) || 0,
          totalFights,
          remainingFights,
          status,
          fightDuration,
        };
      });

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
      } else if (statusFilter === 'active') {
        filteredDivisions = filteredDivisions.filter(d => d.status !== 'Finished');
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
    const active = matGroups.reduce((sum, g) => sum + g.divisions.filter(d => d.status !== 'Finished').length, 0);
    const total = finished + active;
    return { total, finished, active };
  }, [matGroups]);

  const toggleMat = (matName: string) => {
    const newExpanded = new Set(expandedMats);
    if (newExpanded.has(matName)) {
      newExpanded.delete(matName);
    } else {
      newExpanded.add(matName);
    }
    setExpandedMats(newExpanded);
  };

  const expandAll = () => {
    setExpandedMats(new Set(filteredGroups.map(g => g.matName)));
  };

  const collapseAll = () => {
    setExpandedMats(new Set());
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
        return <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">Finished</span>;
      case 'In Progress':
        return <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">In Progress</span>;
      default:
        return <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">Pending</span>;
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
      {/* Status Filter Cards */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div
          className={cn(
            "p-3 border rounded-md cursor-pointer transition-colors",
            statusFilter === 'all' ? 'bg-blue-200 dark:bg-blue-800 border-blue-500' : 'bg-blue-50 dark:bg-blue-950',
            'hover:bg-blue-100 dark:hover:bg-blue-900'
          )}
          onClick={() => setStatusFilter('all')}
        >
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totals.total}</p>
          <p className="text-sm text-muted-foreground">Total Divisions</p>
        </div>
        <div
          className={cn(
            "p-3 border rounded-md cursor-pointer transition-colors",
            statusFilter === 'active' ? 'bg-orange-200 dark:bg-orange-800 border-orange-500' : 'bg-orange-50 dark:bg-orange-950',
            'hover:bg-orange-100 dark:hover:bg-orange-900'
          )}
          onClick={() => setStatusFilter(prev => prev === 'active' ? 'all' : 'active')}
        >
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{totals.active}</p>
          <p className="text-sm text-muted-foreground">Active</p>
        </div>
        <div
          className={cn(
            "p-3 border rounded-md cursor-pointer transition-colors",
            statusFilter === 'finished' ? 'bg-green-200 dark:bg-green-800 border-green-500' : 'bg-green-50 dark:bg-green-950',
            'hover:bg-green-100 dark:hover:bg-green-900'
          )}
          onClick={() => setStatusFilter(prev => prev === 'finished' ? 'all' : 'finished')}
        >
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{totals.finished}</p>
          <p className="text-sm text-muted-foreground">Finished</p>
        </div>
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
        <div className="flex gap-2">
          <button onClick={expandAll} className="text-sm text-muted-foreground hover:text-foreground">
            Expand All
          </button>
          <span className="text-muted-foreground">|</span>
          <button onClick={collapseAll} className="text-sm text-muted-foreground hover:text-foreground">
            Collapse All
          </button>
        </div>
      </div>

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
                      <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                        <Swords className="h-4 w-4" />
                        <span className="font-medium">{group.remainingFights} fights left</span>
                      </div>
                      <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
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
                      {group.divisions.map(divInfo => (
                        <TableRow
                          key={divInfo.division.id}
                          className={cn(
                            "cursor-pointer hover:bg-muted/50",
                            divInfo.status === 'Finished' && "opacity-60"
                          )}
                          onClick={() => onDivisionSelect?.(divInfo.division)}
                        >
                          <TableCell className="font-medium">{divInfo.division.name}</TableCell>
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
                      ))}
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
