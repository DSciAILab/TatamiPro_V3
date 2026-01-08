"use client";

import React, { useState, useMemo } from 'react';
import { Event, Division } from '@/types/index';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserRound, Trophy, Download, Search, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import TeamLeaderboard from './TeamLeaderboard';
import { generateResultsPdf } from '@/utils/pdf-results-generator';

interface ResultsTabProps {
  event: Event;
}

const ResultsTab: React.FC<ResultsTabProps> = ({ event }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const athletesMap = useMemo(() => {
    return new Map((event.athletes || []).map(athlete => [athlete.id, athlete]));
  }, [event.athletes]);

  // All completed divisions
  const allCompletedDivisions = useMemo(() => {
    if (!event.brackets || !event.divisions) return [];
    return event.divisions.filter(div => event.brackets?.[div.id]?.winner_id);
  }, [event.brackets, event.divisions]);

  // Filter divisions based on search
  const filteredDivisions = useMemo(() => {
    if (!searchTerm.trim()) return allCompletedDivisions;
    
    const terms = searchTerm.toLowerCase().split(',').map(t => t.trim()).filter(t => t);
    
    return allCompletedDivisions.filter(div => {
      const bracket = event.brackets?.[div.id];
      const champion = bracket?.winner_id ? athletesMap.get(bracket.winner_id) : null;
      const runnerUp = bracket?.runner_up_id ? athletesMap.get(bracket.runner_up_id) : null;
      
      // Build searchable text
      const searchableText = [
        div.name,
        champion?.first_name,
        champion?.last_name,
        champion?.club,
        runnerUp?.first_name,
        runnerUp?.last_name,
        runnerUp?.club,
      ].filter(Boolean).join(' ').toLowerCase();
      
      return terms.some(term => searchableText.includes(term));
    });
  }, [allCompletedDivisions, searchTerm, event.brackets, athletesMap]);

  // Calculate filtered teams based on search (for PDF export)
  const filteredTeamNames = useMemo(() => {
    if (!searchTerm.trim()) return undefined; // undefined = show all teams
    
    const terms = searchTerm.toLowerCase().split(',').map(t => t.trim()).filter(t => t);
    
    // Get all unique club names from athletes
    const allClubs = new Set(
      (event.athletes || []).map(a => a.club).filter(Boolean)
    );
    
    // Filter clubs that match search terms
    return Array.from(allClubs).filter(club =>
      terms.some(term => club.toLowerCase().includes(term))
    );
  }, [searchTerm, event.athletes]);

  const getAthleteDisplay = (athleteId?: string) => {
    if (!athleteId) return <span className="text-muted-foreground">N/A</span>;
    const athlete = athletesMap.get(athleteId);
    if (!athlete) return <span className="text-muted-foreground">Unknown Athlete</span>;
    return (
      <div className="flex items-center space-x-2">
        {athlete.photo_url ? (
          <img src={athlete.photo_url} alt={athlete.first_name} className="w-6 h-6 rounded-full object-cover" />
        ) : (
          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
            <UserRound className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        <span>{athlete.first_name} {athlete.last_name} ({athlete.club})</span>
      </div>
    );
  };

  // Helper to check if a division counts for points
  const divisionCountsForPoints = (divisionId: string) => {
    const bracket = event.brackets?.[divisionId];
    if (!bracket) return true;

    // Check if it was a single-club category based on REGISTERED athletes (before WOs)
    // We need to look at all athletes registered for this division, not just bracket participants
    const divisionAthletes = (event.athletes || []).filter(a => {
      // Check both original division and moved_to_division
      return a.division_id === divisionId || a.moved_to_division_id === divisionId;
    });
    
    const registeredClubs = new Set<string>();
    divisionAthletes.forEach(a => {
      if (a.club) {
        registeredClubs.add(a.club);
      }
    });
    
    const hadMultipleClubsRegistered = registeredClubs.size >= 2;
    
    // Check if it's a WO champion category (only 1 athlete - declared champion by WO)
    const realParticipants = bracket.participants?.filter(p => p !== 'BYE').length || 0;
    const isWOChampionCategory = realParticipants === 1;
    
    // Check if it's a WO/single fight category (2 athletes but one didn't compete)
    const isWOCategory = realParticipants <= 1 && divisionAthletes.length >= 2;
    
    // Apply event settings
    // Single club: No multiple clubs registered AND setting is disabled
    if (!hadMultipleClubsRegistered && !event.count_single_club_categories) {
      return false;
    }
    
    // WO Champion: Only 1 athlete registered (single athlete division) AND setting is disabled
    if (isWOChampionCategory && divisionAthletes.length === 1 && !event.count_wo_champion_categories) {
      return false;
    }
    
    // WO category: Multiple athletes registered but only 1 competed AND setting is disabled
    if (isWOCategory && !event.count_walkover_single_fight_categories) {
      return false;
    }
    
    return true;
  };

  // Get point values from event settings
  const championPoints = event.champion_points || 9;
  const runnerUpPoints = event.runner_up_points || 3;
  const thirdPlacePoints = event.third_place_points || 1;

  const handlePrintResults = () => {
    // Pass filtered divisions and team names to PDF generator
    generateResultsPdf(event, filteredDivisions, filteredTeamNames);
  };

  return (
    <div className="space-y-6">
      {/* Filter Stats Cards */}
      <div className="grid grid-cols-2 gap-4 text-center">
        <div className="p-3 border rounded-md bg-green-50 dark:bg-green-950">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{allCompletedDivisions.length}</p>
          <p className="text-sm text-muted-foreground">Completed Divisions</p>
        </div>
        <div className="p-3 border rounded-md bg-blue-50 dark:bg-blue-950">
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{filteredDivisions.length}</p>
          <p className="text-sm text-muted-foreground">Showing</p>
        </div>
      </div>

      {/* Search Bar and Download Button */}
      <div className="flex items-center gap-4 no-print">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by division, athlete name, club... (comma for multiple)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={handlePrintResults} variant="outline" className="gap-2 shrink-0">
          <Download className="h-4 w-4" /> Download PDF ({filteredDivisions.length})
        </Button>
      </div>

      <TeamLeaderboard event={event} searchTerm={searchTerm} />

      <Card>
        <CardHeader>
          <CardTitle>Podiums by Division</CardTitle>
          <CardDescription>
            Showing {filteredDivisions.length} of {allCompletedDivisions.length} completed divisions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredDivisions.length === 0 ? (
            <p className="text-muted-foreground">
              {allCompletedDivisions.length === 0 
                ? 'No division has been completed yet.'
                : 'No divisions match your search.'}
            </p>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {filteredDivisions.map(division => {
                const bracket = event.brackets?.[division.id];
                const countsForPoints = divisionCountsForPoints(division.id);
                
                return (
                  <AccordionItem key={division.id} value={division.id}>
                    <AccordionTrigger className="flex items-center gap-2">
                      <span>{division.name}</span>
                      {!countsForPoints && (
                        <Badge variant="outline" className="ml-2 text-xs bg-yellow-50 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          No Points
                        </Badge>
                      )}
                    </AccordionTrigger>
                    <AccordionContent>
                      {!countsForPoints && (
                        <p className="text-sm text-muted-foreground mb-3 italic">
                          This division does not count for team ranking points (single club or WO category).
                        </p>
                      )}
                      <ul className="space-y-2">
                        <li className="flex items-center space-x-2">
                          <Trophy className="h-5 w-5 text-yellow-500" />
                          <span className="font-semibold w-20">1st Place:</span>
                          {getAthleteDisplay(bracket?.winner_id)}
                          {countsForPoints && (
                            <Badge className="ml-2 bg-yellow-500 text-white">+{championPoints} pts</Badge>
                          )}
                        </li>
                        <li className="flex items-center space-x-2">
                          <Trophy className="h-5 w-5 text-gray-400" />
                          <span className="font-semibold w-20">2nd Place:</span>
                          {getAthleteDisplay(bracket?.runner_up_id)}
                          {countsForPoints && (
                            <Badge className="ml-2 bg-gray-400 text-white">+{runnerUpPoints} pts</Badge>
                          )}
                        </li>
                        {bracket?.third_place_winner_id ? (
                          <li className="flex items-center space-x-2">
                            <Trophy className="h-5 w-5 text-orange-500" />
                            <span className="font-semibold w-20">3rd Place:</span>
                            {getAthleteDisplay(bracket.third_place_winner_id)}
                            {countsForPoints && (
                              <Badge className="ml-2 bg-orange-500 text-white">+{thirdPlacePoints} pts</Badge>
                            )}
                          </li>
                        ) : (
                          // No third place match - show both semi-final losers
                          bracket && !bracket.third_place_match && bracket.rounds.length >= 2 && (
                            bracket.rounds[bracket.rounds.length - 2].map((match, idx) => (
                              match.loser_id && match.loser_id !== 'BYE' && (
                                <li key={`3rd-${idx}`} className="flex items-center space-x-2">
                                  <Trophy className="h-5 w-5 text-orange-500" />
                                  <span className="font-semibold w-20">3rd Place:</span>
                                  {getAthleteDisplay(match.loser_id)}
                                  {countsForPoints && (
                                    <Badge className="ml-2 bg-orange-500 text-white">+{thirdPlacePoints} pts</Badge>
                                  )}
                                </li>
                              )
                            ))
                          )
                        )}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResultsTab;