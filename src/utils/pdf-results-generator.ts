"use client";

import { jsPDF } from 'jspdf';
import { Event, Athlete, Division } from '@/types/index';

interface TeamScore {
  name: string;
  gold: number;
  silver: number;
  bronze: number;
  totalPoints: number;
}

interface DivisionPodium {
  divisionName: string;
  champion?: Athlete;
  runnerUp?: Athlete;
  thirdPlaces: Athlete[]; // Changed to array for multiple 3rd place
}

export const generateResultsPdf = (event: Event, filteredDivisions?: Division[], filteredTeamNames?: string[]) => {
  const doc = new jsPDF({
    orientation: 'p', // Portrait
    unit: 'mm',
    format: 'a4'
  });

  const PAGE_WIDTH = 210;
  const PAGE_HEIGHT = 297;
  const MARGIN = 15;
  const LINE_HEIGHT = 6;

  // Create athletes map
  const athletesMap = new Map((event.athletes || []).map(athlete => [athlete.id, athlete]));

  // Calculate team scores
  const allTeamScores = calculateTeamScores(event, athletesMap);
  
  // Filter team scores if filteredTeamNames is provided
  const teamScores = filteredTeamNames && filteredTeamNames.length > 0
    ? allTeamScores.filter(team => filteredTeamNames.includes(team.name))
    : allTeamScores;

  // Calculate podiums by division (use filtered divisions if provided)
  const podiums = calculatePodiums(event, athletesMap, filteredDivisions);

  let y = MARGIN;

  // --- Header ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(event.name, PAGE_WIDTH / 2, y, { align: 'center' });
  y += 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Competition Results', PAGE_WIDTH / 2, y, { align: 'center' });
  y += 5;
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, PAGE_WIDTH / 2, y, { align: 'center' });
  doc.setTextColor(0);
  y += 15;

  // --- Team Rankings Section ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Team Rankings', MARGIN, y);
  y += 12; // Increased spacing to match Podiums section

  if (teamScores.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('No completed results yet.', MARGIN, y);
    doc.setTextColor(0);
    y += 10;
  } else {
    // Table Header
    doc.setFillColor(240, 240, 240);
    doc.rect(MARGIN, y - 4, PAGE_WIDTH - 2 * MARGIN, 8, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Rank', MARGIN + 2, y);
    doc.text('Team', MARGIN + 15, y);
    doc.text('Gold', MARGIN + 100, y);
    doc.text('Silver', MARGIN + 115, y);
    doc.text('Bronze', MARGIN + 132, y);
    doc.text('Points', MARGIN + 155, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    teamScores.forEach((team, index) => {
      // Alternate row background
      if (index % 2 === 1) {
        doc.setFillColor(250, 250, 250);
        doc.rect(MARGIN, y - 4, PAGE_WIDTH - 2 * MARGIN, 6, 'F');
      }
      
      // Highlight top 3
      if (index < 3) {
        doc.setFont('helvetica', 'bold');
        const colors = [[255, 215, 0], [192, 192, 192], [205, 127, 50]]; // Gold, Silver, Bronze
        doc.setTextColor(colors[index][0], colors[index][1], colors[index][2]);
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0);
      }
      
      doc.text(`${index + 1}`, MARGIN + 2, y);
      doc.setTextColor(0);
      doc.setFont('helvetica', index < 3 ? 'bold' : 'normal');
      doc.text(team.name.substring(0, 35), MARGIN + 15, y);
      doc.text(`${team.gold}`, MARGIN + 102, y);
      doc.text(`${team.silver}`, MARGIN + 120, y);
      doc.text(`${team.bronze}`, MARGIN + 137, y);
      doc.setFont('helvetica', 'bold');
      doc.text(`${team.totalPoints}`, MARGIN + 158, y);
      
      y += LINE_HEIGHT;
      
      // Check if we need a new page
      if (y > PAGE_HEIGHT - 30) {
        doc.addPage();
        y = MARGIN;
      }
    });
  }

  y += 10;

  // --- Podiums by Division Section ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(0);
  doc.text('Podiums by Division', MARGIN, y);
  y += 8;

  if (podiums.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('No divisions completed yet.', MARGIN, y);
    doc.setTextColor(0);
  } else {
    podiums.forEach(podium => {
      // Check if we need a new page
      if (y > PAGE_HEIGHT - 40) {
        doc.addPage();
        y = MARGIN;
      }

      // Division Header
      doc.setFillColor(70, 130, 180); // Steel blue
      doc.rect(MARGIN, y - 4, PAGE_WIDTH - 2 * MARGIN, 7, 'F');
      doc.setTextColor(255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(podium.divisionName, MARGIN + 3, y);
      doc.setTextColor(0);
      y += 8;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');

      // 1st Place
      if (podium.champion) {
        doc.setTextColor(218, 165, 32); // Gold color
        doc.text('[1]', MARGIN + 2, y);
        doc.setTextColor(0);
        doc.setFont('helvetica', 'bold');
        doc.text('1st:', MARGIN + 10, y);
        doc.setFont('helvetica', 'normal');
        doc.text(`${podium.champion.first_name} ${podium.champion.last_name} (${podium.champion.club})`, MARGIN + 22, y);
        y += LINE_HEIGHT;
      }

      // 2nd Place
      if (podium.runnerUp) {
        doc.setTextColor(192, 192, 192); // Silver color
        doc.text('[2]', MARGIN + 2, y);
        doc.setTextColor(0);
        doc.setFont('helvetica', 'bold');
        doc.text('2nd:', MARGIN + 10, y);
        doc.setFont('helvetica', 'normal');
        doc.text(`${podium.runnerUp.first_name} ${podium.runnerUp.last_name} (${podium.runnerUp.club})`, MARGIN + 22, y);
        y += LINE_HEIGHT;
      }

      // 3rd Place(s) - support for multiple 3rd place athletes
      podium.thirdPlaces.forEach(athlete => {
        doc.setTextColor(205, 127, 50); // Bronze color
        doc.text('[3]', MARGIN + 2, y);
        doc.setTextColor(0);
        doc.setFont('helvetica', 'bold');
        doc.text('3rd:', MARGIN + 10, y);
        doc.setFont('helvetica', 'normal');
        doc.text(`${athlete.first_name} ${athlete.last_name} (${athlete.club})`, MARGIN + 22, y);
        y += LINE_HEIGHT;
      });

      y += 4; // Space between divisions
    });
  }

  // Save the PDF
  doc.save(`results_${event.name.replace(/\s+/g, '_')}.pdf`);
};

function calculateTeamScores(event: Event, athletesMap: Map<string, Athlete>): TeamScore[] {
  const scores: Record<string, TeamScore> = {};

  if (!event.brackets || !event.athletes) {
    return [];
  }

  const getClub = (athleteId: string): string | null => {
    return athletesMap.get(athleteId)?.club || null;
  };

  Object.values(event.brackets).forEach(bracket => {
    if (bracket.winner_id) {
      const club = getClub(bracket.winner_id);
      if (club) {
        if (!scores[club]) scores[club] = { name: club, gold: 0, silver: 0, bronze: 0, totalPoints: 0 };
        scores[club].gold += 1;
        scores[club].totalPoints += event.champion_points || 9;
      }
    }
    if (bracket.runner_up_id) {
      const club = getClub(bracket.runner_up_id);
      if (club) {
        if (!scores[club]) scores[club] = { name: club, gold: 0, silver: 0, bronze: 0, totalPoints: 0 };
        scores[club].silver += 1;
        scores[club].totalPoints += event.runner_up_points || 3;
      }
    }
    
    // Check for third place winner from third place match
    if (bracket.third_place_winner_id) {
      const club = getClub(bracket.third_place_winner_id);
      if (club) {
        if (!scores[club]) scores[club] = { name: club, gold: 0, silver: 0, bronze: 0, totalPoints: 0 };
        scores[club].bronze += 1;
        scores[club].totalPoints += event.third_place_points || 1;
      }
    } else if (!bracket.third_place_match && bracket.rounds.length >= 2) {
      // No third place match - both semi-final losers get 3rd place
      const semiRound = bracket.rounds[bracket.rounds.length - 2];
      semiRound.forEach(match => {
        if (match.loser_id && match.loser_id !== 'BYE') {
          const club = getClub(match.loser_id);
          if (club) {
            if (!scores[club]) scores[club] = { name: club, gold: 0, silver: 0, bronze: 0, totalPoints: 0 };
            scores[club].bronze += 1;
            scores[club].totalPoints += event.third_place_points || 1;
          }
        }
      });
    }
  });

  return Object.values(scores).sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.gold !== a.gold) return b.gold - a.gold;
    if (b.silver !== a.silver) return b.silver - a.silver;
    return b.bronze - a.bronze;
  });
}

function calculatePodiums(event: Event, athletesMap: Map<string, Athlete>, filteredDivisions?: Division[]): DivisionPodium[] {
  if (!event.brackets || !event.divisions) return [];

  // Use filtered divisions if provided, otherwise get all completed divisions
  const completedDivisions = filteredDivisions 
    ? filteredDivisions.filter(div => event.brackets?.[div.id]?.winner_id)
    : event.divisions.filter(div => event.brackets?.[div.id]?.winner_id);

  return completedDivisions.map(division => {
    const bracket = event.brackets![division.id];
    
    // Get third place athletes
    const thirdPlaces: Athlete[] = [];
    
    if (bracket.third_place_winner_id) {
      // Third place match was played
      const thirdPlaceAthlete = athletesMap.get(bracket.third_place_winner_id);
      if (thirdPlaceAthlete) thirdPlaces.push(thirdPlaceAthlete);
    } else if (!bracket.third_place_match && bracket.rounds.length >= 2) {
      // No third place match - both semi-final losers are 3rd place
      const semiRound = bracket.rounds[bracket.rounds.length - 2];
      semiRound.forEach(match => {
        if (match.loser_id && match.loser_id !== 'BYE') {
          const loser = athletesMap.get(match.loser_id);
          if (loser) thirdPlaces.push(loser);
        }
      });
    }
    
    return {
      divisionName: division.name,
      champion: bracket.winner_id ? athletesMap.get(bracket.winner_id) : undefined,
      runnerUp: bracket.runner_up_id ? athletesMap.get(bracket.runner_up_id) : undefined,
      thirdPlaces,
    };
  });
}
