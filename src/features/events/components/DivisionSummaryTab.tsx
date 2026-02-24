"use client";

import React, { useState, useMemo } from 'react';
import { Athlete, Division } from '@/types/index';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, ChevronDown, ChevronRight, Users, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from '@/hooks/use-translations';

interface DivisionGroup {
  division: Division;
  athletes: Athlete[];
}

type FilterType = 'all' | 'wo' | 'full';
type SortKey = 'name' | 'athletes' | 'gender' | 'belt' | 'weight';
type SortDir = 'asc' | 'desc';

interface DivisionSummaryTabProps {
  athletes: Athlete[];
  divisions: Division[];
}

const DivisionSummaryTab: React.FC<DivisionSummaryTabProps> = ({ athletes, divisions }) => {
  const { t } = useTranslations();
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [expandedDivisions, setExpandedDivisions] = useState<Set<string>>(new Set());

  // Only consider approved athletes
  const approvedAthletes = useMemo(() => athletes.filter(a => a.registration_status === 'approved'), [athletes]);

  // Group athletes by their division
  const divisionGroups = useMemo((): DivisionGroup[] => {
    const grouped = new Map<string, { division: Division; athletes: Athlete[] }>();

    // Initialize only enabled divisions (ignore deleted/disabled ones)
    divisions.filter(d => d.is_enabled).forEach(div => {
      grouped.set(div.id, { division: div, athletes: [] });
    });

    // Assign athletes to their divisions
    approvedAthletes.forEach(athlete => {
      const divId = athlete.moved_to_division_id || athlete._division?.id;
      if (divId && grouped.has(divId)) {
        grouped.get(divId)!.athletes.push(athlete);
      } else {
        // Try matching by name+weight combination if no direct ID match
        const matchedDiv = divisions.find(d =>
          d.name.toLowerCase() === athlete.age_division?.toLowerCase() ||
          d.name === athlete._division?.name
        );
        if (matchedDiv && grouped.has(matchedDiv.id)) {
          grouped.get(matchedDiv.id)!.athletes.push(athlete);
        }
      }
    });

    return Array.from(grouped.values());
  }, [approvedAthletes, divisions]);

  // Stats
  const stats = useMemo(() => {
    const withAthletes = divisionGroups.filter(g => g.athletes.length > 0);
    const total = withAthletes.length;
    const wo = withAthletes.filter(g => g.athletes.length === 1).length;
    const full = withAthletes.filter(g => g.athletes.length >= 2).length;
    const empty = divisionGroups.filter(g => g.athletes.length === 0).length;
    return { total, wo, full, empty };
  }, [divisionGroups]);

  // Filter + search + sort
  const filteredGroups = useMemo(() => {
    let groups = divisionGroups;

    // Apply filter
    if (filter === 'wo') {
      groups = groups.filter(g => g.athletes.length === 1);
    } else if (filter === 'full') {
      groups = groups.filter(g => g.athletes.length >= 2);
    } else {
      // 'all' filter now only shows divisions with at least one athlete
      groups = groups.filter(g => g.athletes.length > 0);
    }

    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      groups = groups.filter(g =>
        g.division.name.toLowerCase().includes(term) ||
        g.athletes.some(a =>
          `${a.first_name} ${a.last_name}`.toLowerCase().includes(term) ||
          a.club?.toLowerCase().includes(term)
        )
      );
    }

    // Apply sort
    groups = [...groups].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name':
          cmp = a.division.name.localeCompare(b.division.name);
          break;
        case 'athletes':
          cmp = a.athletes.length - b.athletes.length;
          break;
        case 'gender':
          cmp = a.division.gender.localeCompare(b.division.gender);
          break;
        case 'belt':
          cmp = (a.division.belt || '').localeCompare(b.division.belt || '');
          break;
        case 'weight':
          cmp = a.division.max_weight - b.division.max_weight;
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return groups;
  }, [divisionGroups, filter, searchTerm, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const toggleExpand = (divId: string) => {
    setExpandedDivisions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(divId)) {
        newSet.delete(divId);
      } else {
        newSet.add(divId);
      }
      return newSet;
    });
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ArrowUpDown className="ml-1 h-3.5 w-3.5 inline text-muted-foreground opacity-50" />;
    return sortDir === 'asc' 
      ? <ArrowUp className="ml-1 h-3.5 w-3.5 inline" /> 
      : <ArrowDown className="ml-1 h-3.5 w-3.5 inline" />;
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Division Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats badges */}
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={filter === 'all' ? 'default' : 'outline'}
            className="cursor-pointer text-sm px-4 py-1.5"
            onClick={() => setFilter('all')}
          >
            All ({stats.total})
          </Badge>
          <Badge
            variant={filter === 'wo' ? 'default' : 'outline'}
            className={cn(
              "cursor-pointer text-sm px-4 py-1.5",
              filter !== 'wo' && stats.wo > 0 && "border-amber-500 text-amber-600 dark:text-amber-400"
            )}
            onClick={() => setFilter(filter === 'wo' ? 'all' : 'wo')}
          >
            WO Divisions ({stats.wo})
          </Badge>
          <Badge
            variant={filter === 'full' ? 'default' : 'outline'}
            className={cn(
              "cursor-pointer text-sm px-4 py-1.5",
              filter !== 'full' && stats.full > 0 && "border-emerald-500 text-emerald-600 dark:text-emerald-400"
            )}
            onClick={() => setFilter(filter === 'full' ? 'all' : 'full')}
          >
            Divisions with fight ({stats.full})
          </Badge>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search division or athlete..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead
                  className="cursor-pointer select-none hover:bg-muted/50"
                  onClick={() => handleSort('name')}
                >
                  {t('divisionName')} <SortIcon column="name" />
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none hover:bg-muted/50"
                  onClick={() => handleSort('gender')}
                >
                  {t('gender')} <SortIcon column="gender" />
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none hover:bg-muted/50"
                  onClick={() => handleSort('belt')}
                >
                  {t('belt')} <SortIcon column="belt" />
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none hover:bg-muted/50 text-right"
                  onClick={() => handleSort('weight')}
                >
                  {t('maxWeight')} <SortIcon column="weight" />
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none hover:bg-muted/50 text-center"
                  onClick={() => handleSort('athletes')}
                >
                  {t('registeredAthletes')} <SortIcon column="athletes" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGroups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No divisions found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredGroups.map((group) => {
                  const isExpanded = expandedDivisions.has(group.division.id);
                  const count = group.athletes.length;
                  const isWo = count === 1;
                  const isEmpty = count === 0;

                  return (
                    <React.Fragment key={group.division.id}>
                      {/* Division row */}
                      <TableRow
                        className={cn(
                          "cursor-pointer hover:bg-muted/50 transition-colors",
                          isWo && "bg-amber-500/5",
                          isEmpty && "opacity-50"
                        )}
                        onClick={() => count > 0 && toggleExpand(group.division.id)}
                      >
                        <TableCell className="w-8 text-center">
                          {count > 0 && (
                            isExpanded
                              ? <ChevronDown className="h-4 w-4 inline" />
                              : <ChevronRight className="h-4 w-4 inline" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{group.division.name}</TableCell>
                        <TableCell>{t(`gender_${group.division.gender}` as any)}</TableCell>
                        <TableCell>{t(`belt_${group.division.belt}` as any)}</TableCell>
                        <TableCell className="text-right">{group.division.max_weight}kg</TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={isWo ? "outline" : isEmpty ? "secondary" : "default"}
                            className={cn(
                              isWo && "border-amber-500 text-amber-600 dark:text-amber-400",
                              count >= 2 && "bg-emerald-600 hover:bg-emerald-700"
                            )}
                          >
                            {count}
                          </Badge>
                        </TableCell>
                      </TableRow>

                      {/* Expanded athletes */}
                      {isExpanded && group.athletes.map((athlete) => (
                        <TableRow key={athlete.id} className="bg-muted/30">
                          <TableCell></TableCell>
                          <TableCell className="pl-8 text-sm">
                            {athlete.first_name} {athlete.last_name}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{athlete.club}</TableCell>
                          <TableCell className="text-sm">{t(`belt_${athlete.belt}` as any)}</TableCell>
                          <TableCell className="text-right text-sm">{athlete.weight}kg</TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      ))}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Footer summary */}
        <div className="flex justify-between text-sm text-muted-foreground pt-2">
          <span>{filteredGroups.length} division(s) shown</span>
          <span>{approvedAthletes.length} approved athlete(s) total</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default DivisionSummaryTab;
