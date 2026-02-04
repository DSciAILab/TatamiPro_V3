"use client";

import { jsPDF } from 'jspdf';
import { Event, Division, Bracket, Athlete, Match } from '@/types/index';
import { format } from 'date-fns';

// --- Constants ---
const PAGE_WIDTH = 297; // A4 Landscape width
const PAGE_HEIGHT = 210; // A4 Landscape height
const MARGIN = 10;
const HEADER_HEIGHT = 25; // Increased to accommodate round labels
const FOOTER_HEIGHT = 10; // Space for the footer
const LINE_COLOR = '#444444';
const WINNER_BG_COLOR = '#e0f2fe';

const getRoundName = (roundIndex: number, totalRounds: number): string => {
  const roundFromEnd = totalRounds - roundIndex;
  switch (roundFromEnd) {
    case 1: return 'FINAL';
    case 2: return 'SEMI-FINAL';
    case 3: return 'QUARTER-FINALS';
    case 4: return 'ROUND OF 16';
    default: return `ROUND ${roundIndex + 1}`;
  }
};

// Helper to fit text within a specific width
const fitText = (doc: jsPDF, text: string, maxWidth: number): string => {
  if (!text) return '';
  const sanitized = text.replace(/’/g, "'").replace(/“/g, '"').replace(/”/g, '"');
  
  if (doc.getTextWidth(sanitized) <= maxWidth) {
    return sanitized;
  }

  // Simple truncation with ellipsis
  let chopped = sanitized;
  while (doc.getTextWidth(chopped + '...') > maxWidth && chopped.length > 0) {
    chopped = chopped.slice(0, -1);
  }
  return chopped + '...';
};

const drawMatch = (
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  match: Match,
  athletesMap: Map<string, Athlete>,
  fontSizeMultiplier: number = 1
) => {
  // Draw main match box with rounded corners
  doc.setDrawColor(148, 163, 184); // Slate-400
  doc.setLineWidth(0.4);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, width, height, 2, 2, 'DF');

  const fighter1 = match.fighter1_id === 'BYE' ? 'BYE' : athletesMap.get(match.fighter1_id || '');
  const fighter2 = match.fighter2_id === 'BYE' ? 'BYE' : athletesMap.get(match.fighter2_id || '');

  const fighter1IsWinner = !!(match.winner_id && match.winner_id !== 'BYE' && match.winner_id === match.fighter1_id);
  const fighter2IsWinner = !!(match.winner_id && match.winner_id !== 'BYE' && match.winner_id === match.fighter2_id);

  // --- Dimensions & Font Sizes (with multiplier for user preference) ---
  const slotHeight = height / 2;
  const paddingX = 2;
  const matchNumSize = 6 * fontSizeMultiplier;
  
  // Dynamic font sizing based on box height AND user preference
  const nameFontSize = Math.min(11 * fontSizeMultiplier, height * 0.28 * fontSizeMultiplier);
  const clubFontSize = Math.min(8 * fontSizeMultiplier, height * 0.20 * fontSizeMultiplier);
  const idFontSize = Math.min(7 * fontSizeMultiplier, height * 0.18 * fontSizeMultiplier);

  let matchLabel = "";
  if (match.mat_fight_number) {
    const matNum = match._mat_name ? match._mat_name.replace(/\D/g, '') : '?';
    matchLabel = `${matNum}-${match.mat_fight_number}`;
  } else {
    matchLabel = match.id.split('-').pop()?.replace('M', '') || '';
  }

  doc.setFontSize(matchNumSize);
  doc.setTextColor(100, 100, 100);
  const labelW = doc.getTextWidth(matchLabel);
  doc.text(matchLabel, x + width - labelW - 1, y + matchNumSize); 
  doc.setTextColor(0, 0, 0);

  const drawSlot = (fighter: Athlete | 'BYE' | undefined, slotY: number, isWinner: boolean, isRedBelt: boolean) => {
    // 1. Draw Background
    if (isWinner) {
      // Winner highlight - green background
      doc.setFillColor(220, 252, 231); // Green-100
      doc.rect(x + 0.5, slotY + 0.5, width - 1, slotHeight - 0.5, 'F');
    }

    // 2. Draw Side Bar (Indicator)
    if (isRedBelt) {
      // Red Belt Indicator (Always Red for Fighter 1)
      doc.setFillColor(220, 38, 38); // Red-600
      doc.rect(x, slotY, 2, slotHeight, 'F');
    } else if (isWinner) {
      // Winner accent bar for Fighter 2 (Green)
      doc.setFillColor(34, 197, 94); // Green-500
      doc.rect(x, slotY, 2, slotHeight, 'F');
    }

    if (!fighter) return;

    const name = fighter === 'BYE' ? 'BYE' : `${fighter.first_name} ${fighter.last_name}`;
    const club = fighter !== 'BYE' ? fighter.club : '';
    
    // CORREÇÃO: Usar Emirates ID ou School ID
    const athleteId = fighter !== 'BYE' ? fighter.emirates_id || fighter.school_id || '' : '';
    const idDisplay = athleteId ? `${athleteId.slice(-6).toUpperCase()} ` : '';

    // ID
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(idFontSize);
    doc.setTextColor(100, 100, 100);
    const idWidth = doc.getTextWidth(idDisplay);
    doc.text(idDisplay, x + paddingX + 2, slotY + (slotHeight * 0.45)); // +2 padding to clear sidebar

    // Name
    doc.setFont('helvetica', isWinner ? 'bold' : 'normal');
    doc.setFontSize(nameFontSize);
    doc.setTextColor(isWinner ? 21 : 0, isWinner ? 128 : 0, isWinner ? 61 : 0); // Green-800 for winners
    const fitName = fitText(doc, name, width - (paddingX * 2) - 4); // -4 to account for sidebar + padding
    doc.text(fitName, x + paddingX + 2 + idWidth, slotY + (slotHeight * 0.45)); // +2 offset for sidebar
    doc.setTextColor(0, 0, 0);

    // Club
    if (club) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139); // Slate-500
      doc.setFontSize(clubFontSize);
      const fitClub = fitText(doc, club, width - (paddingX * 2) - 4);
      doc.text(fitClub, x + paddingX + 2, slotY + (slotHeight * 0.85)); // +2 offset for sidebar
      doc.setTextColor(0, 0, 0);
    }
  };

  drawSlot(fighter1, y, fighter1IsWinner, true); // true = Red Belt

  // Separator Line (dashed effect)
  doc.setDrawColor(203, 213, 225); // Slate-300
  doc.setLineWidth(0.3);
  doc.line(x + 2, y + slotHeight, x + width - 2, y + slotHeight);

  // Draw Slot 2
  drawSlot(fighter2, y + slotHeight, fighter2IsWinner, false); // false = Not Red Belt
};

const drawBracketLines = (
  doc: jsPDF,
  matchPositions: Map<string, { x: number; y: number }>,
  bracket: Bracket,
  cardWidth: number,
  cardHeight: number,
  roundGap: number
) => {
  // Bracket connector lines with subtle color
  doc.setDrawColor(148, 163, 184); // Slate-400
  doc.setLineWidth(0.5);

  bracket.rounds.forEach(round => {
    round.forEach(match => {
      if (match.next_match_id) {
        const currentPos = matchPositions.get(match.id);
        const nextPos = matchPositions.get(match.next_match_id);

        if (currentPos && nextPos) {
            const startX = currentPos.x + cardWidth;
            const startY = currentPos.y + cardHeight / 2;
            const endX = nextPos.x;
            const midX = startX + roundGap / 2;

            doc.line(startX, startY, midX, startY);

            const nextMatchObj = bracket.rounds.flat().find(m => m.id === match.next_match_id);
            let endY = nextPos.y + cardHeight / 2;
            
            if (nextMatchObj) {
                if (nextMatchObj.prev_match_ids?.[0] === match.id) {
                    endY = nextPos.y + (cardHeight * 0.25);
                } else if (nextMatchObj.prev_match_ids?.[1] === match.id) {
                    endY = nextPos.y + (cardHeight * 0.75);
                }
            }

            doc.line(midX, startY, midX, endY);
            doc.line(midX, endY, endX, endY);
        }
      }
    });
  });
};

export interface BracketPdfOptions {
  fontSize: 'small' | 'medium' | 'large';
  userName?: string;
  matStaffName?: string;
  includeSingleAthlete?: boolean;
}

const getFontSizeMultiplier = (size: 'small' | 'medium' | 'large'): number => {
  switch (size) {
    case 'small': return 0.85;
    case 'large': return 1.25;
    default: return 1;
  }
};

// Helper to get all brackets for a division (including split variants)
const getBracketsForDivision = (
  event: Event, 
  divisionId: string
): { bracketId: string; bracket: Bracket; groupName?: string }[] => {
  if (!event.brackets) return [];
  const results: { bracketId: string; bracket: Bracket; groupName?: string }[] = [];
  
  // Check for exact match
  if (event.brackets[divisionId]) {
    results.push({ bracketId: divisionId, bracket: event.brackets[divisionId] });
  }
  
  // Check for split variants (divisionId-A, divisionId-B, etc.)
  Object.entries(event.brackets).forEach(([key, bracket]) => {
    if (key.startsWith(`${divisionId}-`)) {
      results.push({ 
        bracketId: key, 
        bracket, 
        groupName: bracket.group_name || key.split('-').pop() 
      });
    }
  });
  
  // Sort by group name (A, B, C order)
  results.sort((a, b) => (a.bracketId > b.bracketId ? 1 : -1));
  
  return results;
};

export const generateBracketPdf = (
  event: Event, 
  selectedDivisions: Division[], 
  athletesMap: Map<string, Athlete>,
  options?: BracketPdfOptions
) => {
  const fontSizeMultiplier = getFontSizeMultiplier(options?.fontSize || 'medium');
  const doc = new jsPDF({
    orientation: 'l',
    unit: 'mm',
    format: 'a4'
  });

  let pageAdded = false;

  selectedDivisions.forEach((division) => {
    // Get all brackets for this division (including split variants)
    let divisionBrackets = getBracketsForDivision(event, division.id);
    
    // Auto-generate temporary bracket for single athlete if allowed and missing
    if (divisionBrackets.length === 0 && options?.includeSingleAthlete) {
        const divAthletes = (event.athletes || []).filter(a => {
             const effectiveDivisionId = a.moved_to_division_id || a._division?.id;
             return effectiveDivisionId === division.id && 
                    a.registration_status === 'approved' && 
                    a.check_in_status === 'checked_in';
        });
        
        if (divAthletes.length === 1) {
            const tempBracket: Bracket = {
                id: `temp-${division.id}`,
                division_id: division.id,
                rounds: [],
                bracket_size: 1,
                participants: divAthletes,
                winner_id: divAthletes[0].id
            };
            divisionBrackets.push({ bracketId: tempBracket.id, bracket: tempBracket });
        }
    }

    // Skip if no brackets found
    if (divisionBrackets.length === 0) return;

    // Iterate over each bracket (may be multiple for split divisions)
    divisionBrackets.forEach(({ bracket, groupName }) => {
      // Check if valid bracket exists
      const hasRounds = bracket && bracket.rounds && bracket.rounds.length > 0;
      const isSingleAthlete = bracket && bracket.participants && bracket.participants.length === 1;
      const isWalkover = !hasRounds && bracket?.winner_id && (isSingleAthlete || bracket.participants.length > 0);

      // If no rounds and not a walkover we want to print, skip
      if (!hasRounds) {
          if (!isWalkover) return;
          if (!options?.includeSingleAthlete) return;
      }

      if (pageAdded) doc.addPage();
      pageAdded = true;

      // Standard layout calculations (default to 1 so math doesn't break for WO)
      const totalRounds = bracket.rounds?.length || 0;
      const maxMatchesInColumn = totalRounds > 0 
          ? Math.max(...bracket.rounds.map((r: Match[]) => r.length)) 
          : 1;

      const availableWidth = PAGE_WIDTH - (2 * MARGIN);
      const availableHeight = PAGE_HEIGHT - (2 * MARGIN) - HEADER_HEIGHT - FOOTER_HEIGHT;

      // If Walkover, use fixed reasonable dimensions or skip grid logic
      // We'll just define cardWidth/Height to avoid errors, though we won't draw grid for WO
      const widthFactor = totalRounds > 0 ? (totalRounds + 0.3 * Math.max(0, totalRounds - 1)) : 1;
      let cardWidth = availableWidth / widthFactor;
      
      const MAX_CARD_WIDTH = 60;
      if (cardWidth > MAX_CARD_WIDTH) cardWidth = MAX_CARD_WIDTH;
      
      const roundGap = cardWidth * 0.3;

      const heightFactor = maxMatchesInColumn + 0.2 * Math.max(0, maxMatchesInColumn - 1);
      let cardHeight = availableHeight / heightFactor;

      const MAX_CARD_HEIGHT = 22;
      const MIN_CARD_HEIGHT = 14;

      if (cardHeight > MAX_CARD_HEIGHT) cardHeight = MAX_CARD_HEIGHT;
      if (cardHeight < MIN_CARD_HEIGHT) cardHeight = MIN_CARD_HEIGHT; 

      const matchVGap = cardHeight * 0.2;
      const startXOffset = MARGIN;
      
      const totalContentHeight = (cardHeight * maxMatchesInColumn) + (matchVGap * (maxMatchesInColumn - 1));
      const startYOffset = MARGIN + HEADER_HEIGHT + Math.max(0, (availableHeight - totalContentHeight) / 2);

      // --- Draw Header (Event Name + Division Name + Group Name) ---
      doc.setFillColor(51, 65, 85); // Slate-700
      doc.rect(0, 0, PAGE_WIDTH, 18, 'F');
      
      // Event name
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(200, 200, 200);
      doc.text(event.name, PAGE_WIDTH / 2, 7, { align: 'center' });
      
      // Division name (with group suffix if split)
      const divisionTitle = groupName ? `${division.name} - ${groupName}` : division.name;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text(divisionTitle, PAGE_WIDTH / 2, 14, { align: 'center' });
      
      // Fight Duration & Total Time
      const durationMin = division.match_duration || 5;
      const totalFights = bracket.rounds.reduce((acc: number, round: Match[]) => acc + round.length, 0) + (bracket.third_place_match ? 1 : 0);
      const totalTimeMin = totalFights * durationMin;
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(200, 200, 200);
      const durationText = `Fight Duration: ${durationMin} min  |  Total Time: ~${totalTimeMin} min`;
      doc.text(durationText, PAGE_WIDTH - MARGIN, 11, { align: 'right' });
      
      doc.setTextColor(0, 0, 0);

      // --- CONTENT ---
      if (isWalkover) {
          // Draw Walkover Layout
          doc.setFontSize(16);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(100, 100, 100);
          doc.text("CHAMPION BY WALKOVER", PAGE_WIDTH / 2, PAGE_HEIGHT / 2, { align: 'center' });
      } else {
          // Draw Standard Bracket Grid
          // --- Draw Round Labels ---
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          for (let r = 0; r < totalRounds; r++) {
              const roundName = getRoundName(r, totalRounds);
              const rX = startXOffset + r * (cardWidth + roundGap) + (cardWidth / 2);
              
              // Round label background
              const labelWidth = 40;
              const labelX = rX - labelWidth / 2;
              doc.setFillColor(241, 245, 249); // Slate-100
              doc.roundedRect(labelX, startYOffset - 10, labelWidth, 7, 1, 1, 'F');
              
              // Round label text
              doc.setTextColor(71, 85, 105); // Slate-600
              doc.text(roundName, rX, startYOffset - 5, { align: 'center' });
          }
          doc.setTextColor(0); // Reset color
          doc.setFont('helvetica', 'normal');

          const matchPositions = new Map<string, { x: number; y: number }>();

          bracket.rounds.forEach((round: Match[], roundIndex: number) => {
            const x = startXOffset + roundIndex * (cardWidth + roundGap);
            
            round.forEach((match: Match, matchIndex: number) => {
              let y;
              if (roundIndex === 0) {
                y = startYOffset + matchIndex * (cardHeight + matchVGap);
              } else {
                const p1Id = match.prev_match_ids?.[0];
                const p2Id = match.prev_match_ids?.[1];
                
                if (p1Id && p2Id) {
                   const prevMatch1Pos = matchPositions.get(p1Id);
                   const prevMatch2Pos = matchPositions.get(p2Id);
                   
                   if (prevMatch1Pos && prevMatch2Pos) {
                       y = (prevMatch1Pos.y + prevMatch2Pos.y) / 2;
                   } else {
                       y = startYOffset + matchIndex * (cardHeight + matchVGap) * (2 ** roundIndex);
                   }
                } else {
                    y = startYOffset; 
                }
              }
              matchPositions.set(match.id, { x, y });
            });
          });

          drawBracketLines(doc, matchPositions, bracket, cardWidth, cardHeight, roundGap);

          bracket.rounds.flat().forEach((match: Match) => {
            const pos = matchPositions.get(match.id);
            if (pos) {
              drawMatch(doc, pos.x, pos.y, cardWidth, cardHeight, match, athletesMap, fontSizeMultiplier);
            }
          });

          // Pass 4: Third Place Match (if enabled)
          if (bracket.third_place_match) {
              const tpWidth = cardWidth;
              const tpHeight = cardHeight;
              const tpX = MARGIN;
              const tpY = PAGE_HEIGHT - MARGIN - tpHeight - 8;

              // Third place match label with styled background
              const labelWidth = 50;
              doc.setFillColor(217, 119, 6); // Amber-600 (Bronze)
              doc.roundedRect(tpX, tpY - 8, labelWidth, 6, 1, 1, 'F');
              doc.setFontSize(8);
              doc.setFont('helvetica', 'bold');
              doc.setTextColor(255, 255, 255);
              doc.text("3RD PLACE MATCH", tpX + labelWidth / 2, tpY - 4, { align: 'center' });
              doc.setTextColor(0);
              doc.setFont('helvetica', 'normal');
              
              drawMatch(doc, tpX, tpY, tpWidth, tpHeight, bracket.third_place_match, athletesMap, fontSizeMultiplier);
          }
      }

      // Pass 5: Draw Podium Section (lower right corner) - Draw for both Standard and Walkover
      const podiumX = PAGE_WIDTH - MARGIN - 85;
      const podiumY = PAGE_HEIGHT - MARGIN - 55;
      const podiumWidth = 85;
      const podiumHeight = 55;
      
      // Podium header background
      doc.setFillColor(51, 65, 85); // Slate-700
      doc.roundedRect(podiumX, podiumY - 7, podiumWidth, 10, 2, 2, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text("PODIUM", podiumX + podiumWidth / 2, podiumY - 1, { align: 'center' });
      
      // Podium container
      doc.setFillColor(249, 250, 251); // Gray-50
      doc.setDrawColor(226, 232, 240); // Slate-200
      doc.roundedRect(podiumX, podiumY + 3, podiumWidth, podiumHeight - 3, 2, 2, 'FD');
      
      // Get placement info
      let champion: Athlete | undefined;
      let runnerUp: Athlete | undefined;
      let thirdPlaceAthletes: Athlete[] = [];

      if (isWalkover) {
          // Direct winner for Walkover
          if (bracket.winner_id && bracket.winner_id !== 'BYE') {
              champion = athletesMap.get(bracket.winner_id);
          }
      } else {
          const finalMatch = bracket.rounds[bracket.rounds.length - 1]?.[0];
          champion = finalMatch?.winner_id && finalMatch.winner_id !== 'BYE' 
            ? athletesMap.get(finalMatch.winner_id) : undefined;
          runnerUp = finalMatch?.loser_id && finalMatch.loser_id !== 'BYE'
            ? athletesMap.get(finalMatch.loser_id) : undefined;
          
          // Determine 3rd place(s)
          const semiMatches = bracket.rounds.length >= 2 ? bracket.rounds[bracket.rounds.length - 2] : [];

          if (bracket.third_place_match?.winner_id && bracket.third_place_match.winner_id !== 'BYE') {
            const thirdPlace = athletesMap.get(bracket.third_place_match.winner_id);
            if (thirdPlace) thirdPlaceAthletes.push(thirdPlace);
          } else if (!bracket.third_place_match) {
            semiMatches.forEach((match: Match) => {
              // Only list a loser on the podium if the match definitively has a winner
              if (match.winner_id && match.winner_id !== 'BYE' && match.loser_id && match.loser_id !== 'BYE') {
                const loser = athletesMap.get(match.loser_id);
                if (loser) thirdPlaceAthletes.push(loser);
              }
            });
          }
      }
      
      // Draw placements with colored accent bars
      doc.setFontSize(8);
      let lineY = podiumY + 12;
      const rowHeight = 15; // Increased spacing for club name
      
      // Helper to draw podium entry
      const drawPodiumEntry = (label: string, labelColor: [number, number, number], barColor: [number, number, number], athlete?: Athlete, barHeightExtra: number = 0) => {
          // Colored Bar
          doc.setFillColor(...barColor);
          doc.rect(podiumX + 3, lineY - 4, 3, rowHeight - 4 + barHeightExtra, 'F');
          
          // Rank Label
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...labelColor);
          doc.text(label, podiumX + 9, lineY);
          
          // Athlete Info
          doc.setTextColor(0);
          doc.setFont('helvetica', 'normal');
          
          if (athlete) {
              // Name
              const name = fitText(doc, `${athlete.first_name} ${athlete.last_name}`, podiumWidth - 30);
              doc.text(name, podiumX + 22, lineY);
              
              // Club (NEW)
              doc.setFontSize(7);
              doc.setTextColor(100, 116, 139); // Slate-500
              const club = fitText(doc, athlete.club, podiumWidth - 30);
              doc.text(club, podiumX + 22, lineY + 3.5);
              
              // Reset for next
              doc.setFontSize(8); 
              doc.setTextColor(0);
          } else {
              doc.setTextColor(156, 163, 175);
              doc.text("(TBD)", podiumX + 22, lineY);
              doc.setTextColor(0);
          }
      };

      // 1st Place - Gold
      drawPodiumEntry("1st", [161, 98, 7], [250, 204, 21], champion);
      lineY += rowHeight;
      
      // 2nd Place - Silver
      drawPodiumEntry("2nd", [75, 85, 99], [156, 163, 175], runnerUp);
      lineY += rowHeight;
      
      // 3rd Place(s) - Bronze
      if (thirdPlaceAthletes.length > 0) {
          // Draw first 3rd place
          drawPodiumEntry("3rd", [146, 64, 14], [217, 119, 6], thirdPlaceAthletes[0], thirdPlaceAthletes.length > 1 ? 4 : 0);
          
          if (thirdPlaceAthletes.length > 1) {
              lineY += 8; // Small offset for second 3rd place
               // Just name and club for second 3rd place, no new bar
              const athlete2 = thirdPlaceAthletes[1];
               if (athlete2) {
                  doc.setFont('helvetica', 'normal');
                  const name2 = fitText(doc, `${athlete2.first_name} ${athlete2.last_name}`, podiumWidth - 30);
                  doc.text(name2, podiumX + 22, lineY);
                  
                  doc.setFontSize(7);
                  doc.setTextColor(100, 116, 139);
                  const club2 = fitText(doc, athlete2.club, podiumWidth - 30);
                  doc.text(club2, podiumX + 22, lineY + 3.5);
                  
                  doc.setFontSize(8);
                  doc.setTextColor(0);
               }
          }
      } else {
           drawPodiumEntry("3rd", [146, 64, 14], [217, 119, 6], undefined);
      }
      // Footer
      doc.setFontSize(8);
      doc.setTextColor(150);
      const dateStr = new Date().toLocaleString();
      const footerText = `Generated by: ${options?.userName || 'User'} | ${dateStr}${options?.matStaffName ? ` | Mat Staff: ${options.matStaffName}` : ''}`;
      doc.text(footerText, MARGIN, PAGE_HEIGHT - 5);
    }); // End of divisionBrackets.forEach
  });

  doc.save(`brackets_${event.name.replace(/\s+/g, '_')}.pdf`);
};