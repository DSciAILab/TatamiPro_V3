"use client";

import { jsPDF } from 'jspdf';
import { Event, Division, Bracket, Athlete, Match } from '@/types/index';

// --- Constants ---
const PAGE_WIDTH = 297; // A4 Landscape width
const PAGE_HEIGHT = 210; // A4 Landscape height
const MARGIN = 10;
const HEADER_HEIGHT = 25; // Increased to accommodate round labels
const LINE_COLOR = '#444444';
const WINNER_BG_COLOR = '#e0f2fe';

const getRoundName = (roundIndex: number, totalRounds: number): string => {
  const roundFromEnd = totalRounds - roundIndex;
  switch (roundFromEnd) {
    case 1: return 'FINAL';
    case 2: return 'SEMI-FINAL';
    case 3: return 'QUARTAS';
    case 4: return 'OITAVAS';
    default: return `RODADA ${roundIndex + 1}`;
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
  athletesMap: Map<string, Athlete>
) => {
  doc.setDrawColor(LINE_COLOR);
  doc.setLineWidth(0.3);
  doc.setFillColor(255, 255, 255);
  doc.rect(x, y, width, height, 'DF'); // Draw filled white box with border

  const fighter1 = match.fighter1_id === 'BYE' ? 'BYE' : athletesMap.get(match.fighter1_id || '');
  const fighter2 = match.fighter2_id === 'BYE' ? 'BYE' : athletesMap.get(match.fighter2_id || '');

  // Fix: Ensure strict boolean type for drawSlot
  const fighter1IsWinner = !!(match.winner_id && match.winner_id !== 'BYE' && match.winner_id === match.fighter1_id);
  const fighter2IsWinner = !!(match.winner_id && match.winner_id !== 'BYE' && match.winner_id === match.fighter2_id);

  // --- Dimensions & Font Sizes ---
  const slotHeight = height / 2;
  const paddingX = 2;
  const matchNumSize = 6;
  
  // Dynamic font sizing based on box height
  const nameFontSize = Math.min(9, height * 0.25);
  const clubFontSize = Math.min(7, height * 0.18);

  // --- Match Number Indicator (e.g., "2-5") ---
  // Format: Mat Number - Fight Number
  let matchLabel = "";
  if (match.mat_fight_number) {
    const matNum = match._mat_name ? match._mat_name.replace(/\D/g, '') : '?';
    matchLabel = `${matNum}-${match.mat_fight_number}`;
  } else {
    // Fallback ID part if not scheduled yet
    matchLabel = match.id.split('-').pop()?.replace('M', '') || '';
  }

  // Draw Match Number (Top Right of box or centered on split line)
  doc.setFontSize(matchNumSize);
  doc.setTextColor(100, 100, 100);
  const labelW = doc.getTextWidth(matchLabel);
  // Position: slightly above the box or inside top right
  doc.text(matchLabel, x + width - labelW - 1, y + matchNumSize); 
  doc.setTextColor(0, 0, 0);

  // --- Helper to draw a single slot ---
  const drawSlot = (fighter: Athlete | 'BYE' | undefined, slotY: number, isWinner: boolean) => {
    if (isWinner) {
      doc.setFillColor(WINNER_BG_COLOR);
      doc.rect(x, slotY, width, slotHeight, 'F');
      doc.rect(x, slotY, width, slotHeight); // Redraw border
    }

    if (!fighter) return; // Leave empty for manual filling

    const name = fighter === 'BYE' ? 'BYE' : `${fighter.first_name} ${fighter.last_name}`;
    const club = fighter !== 'BYE' ? fighter.club : '';

    // Name
    doc.setFont('helvetica', isWinner ? 'bold' : 'normal');
    doc.setFontSize(nameFontSize);
    const fitName = fitText(doc, name, width - (paddingX * 2));
    doc.text(fitName, x + paddingX, slotY + (slotHeight * 0.45));

    // Club
    if (club) {
      doc.setFont('helvetica', 'normal'); // Club always normal
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(clubFontSize);
      const fitClub = fitText(doc, club, width - (paddingX * 2));
      doc.text(fitClub, x + paddingX, slotY + (slotHeight * 0.85));
      doc.setTextColor(0, 0, 0);
    }
  };

  // Draw Slot 1
  drawSlot(fighter1, y, fighter1IsWinner);

  // Separator Line
  doc.setDrawColor(LINE_COLOR);
  doc.line(x, y + slotHeight, x + width, y + slotHeight);

  // Draw Slot 2
  drawSlot(fighter2, y + slotHeight, fighter2IsWinner);
};

const drawBracketLines = (
  doc: jsPDF,
  matchPositions: Map<string, { x: number; y: number }>,
  bracket: Bracket,
  cardWidth: number,
  cardHeight: number,
  roundGap: number
) => {
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);

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

            doc.line(startX, startY, midX, startY); // Horizontal from current

            // Calculate entry point Y for the next match
            // If current is topmost parent (prev_match_ids[0]), enter top half
            // If bottom parent, enter bottom half
            const nextMatchObj = bracket.rounds.flat().find(m => m.id === match.next_match_id);
            let endY = nextPos.y + cardHeight / 2; // Default center
            
            if (nextMatchObj) {
                if (nextMatchObj.prev_match_ids?.[0] === match.id) {
                    endY = nextPos.y + (cardHeight * 0.25); // Enter top quarter
                } else if (nextMatchObj.prev_match_ids?.[1] === match.id) {
                    endY = nextPos.y + (cardHeight * 0.75); // Enter bottom quarter
                }
            }

            doc.line(midX, startY, midX, endY); // Vertical
            doc.line(midX, endY, endX, endY); // Horizontal to next
        }
      }
    });
  });
};

export const generateBracketPdf = (event: Event, selectedDivisions: Division[], athletesMap: Map<string, Athlete>) => {
  const doc = new jsPDF({
    orientation: 'l', // Landscape
    unit: 'mm',
    format: 'a4'
  });

  let pageAdded = false;

  selectedDivisions.forEach((division) => {
    const bracket = event.brackets?.[division.id];
    
    if (!bracket || !bracket.rounds || bracket.rounds.length === 0) return;

    if (pageAdded) doc.addPage();
    pageAdded = true;

    // --- Dynamic Layout Calculation ---
    const totalRounds = bracket.rounds.length;
    const maxMatchesInColumn = Math.max(...bracket.rounds.map(r => r.length));

    // Available writing area
    const availableWidth = PAGE_WIDTH - (2 * MARGIN);
    const availableHeight = PAGE_HEIGHT - (2 * MARGIN) - HEADER_HEIGHT;

    // 1. Determine Width
    // Formula: TotalWidth = (Rounds * CardW) + ((Rounds-1) * Gap)
    // Gap = 0.3 * CardW
    const widthFactor = totalRounds + 0.3 * Math.max(0, totalRounds - 1);
    let cardWidth = availableWidth / widthFactor;
    
    // Clamp Max Width (so 2-person brackets don't have massive boxes)
    const MAX_CARD_WIDTH = 60;
    if (cardWidth > MAX_CARD_WIDTH) cardWidth = MAX_CARD_WIDTH;
    
    const roundGap = cardWidth * 0.3;

    // 2. Determine Height
    // Formula: TotalHeight = (MaxMatches * CardH) + ((MaxMatches-1) * VGap)
    // VGap = 0.2 * CardH
    const heightFactor = maxMatchesInColumn + 0.2 * Math.max(0, maxMatchesInColumn - 1);
    let cardHeight = availableHeight / heightFactor;

    // Clamp Height (readability vs fitting)
    const MAX_CARD_HEIGHT = 22; // Comfortable size
    const MIN_CARD_HEIGHT = 14; // Minimum readable size

    if (cardHeight > MAX_CARD_HEIGHT) cardHeight = MAX_CARD_HEIGHT;
    
    // If calculated height is too small, we force minimum and center/clip as best as possible
    if (cardHeight < MIN_CARD_HEIGHT) cardHeight = MIN_CARD_HEIGHT; 

    const matchVGap = cardHeight * 0.2;

    // Offsets to center content on page
    const totalContentWidth = (cardWidth * totalRounds) + (roundGap * (totalRounds - 1));
    const startXOffset = MARGIN + (availableWidth - totalContentWidth) / 2;
    
    const totalContentHeight = (cardHeight * maxMatchesInColumn) + (matchVGap * (maxMatchesInColumn - 1));
    // Ensure we start after the header
    const startYOffset = MARGIN + HEADER_HEIGHT + Math.max(0, (availableHeight - totalContentHeight) / 2);

    // --- Draw Header (Division Name) ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(division.name, PAGE_WIDTH / 2, MARGIN + 8, { align: 'center' });
    
    // --- Draw Round Labels ---
    doc.setFontSize(10);
    doc.setTextColor(100);
    for (let r = 0; r < totalRounds; r++) {
        const roundName = getRoundName(r, totalRounds);
        const rX = startXOffset + r * (cardWidth + roundGap) + (cardWidth / 2);
        // Draw label above the column
        doc.text(roundName, rX, startYOffset - 5, { align: 'center' });
    }
    doc.setTextColor(0); // Reset color

    const matchPositions = new Map<string, { x: number; y: number }>();

    // Pass 1: Calculate Positions
    bracket.rounds.forEach((round, roundIndex) => {
      const x = startXOffset + roundIndex * (cardWidth + roundGap);
      
      round.forEach((match, matchIndex) => {
        let y;
        if (roundIndex === 0) {
          // First round simply stacks
          y = startYOffset + matchIndex * (cardHeight + matchVGap);
        } else {
          // Subsequent rounds center on parents
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

    // Pass 2: Draw Lines
    drawBracketLines(doc, matchPositions, bracket, cardWidth, cardHeight, roundGap);

    // Pass 3: Draw Matches
    bracket.rounds.flat().forEach(match => {
      const pos = matchPositions.get(match.id);
      if (pos) {
        drawMatch(doc, pos.x, pos.y, cardWidth, cardHeight, match, athletesMap);
      }
    });

    // Pass 4: Third Place (Bottom Left or Bottom Right depending on space, usually Bottom Left matches layout)
    if (bracket.third_place_match) {
        const tpWidth = cardWidth;
        const tpHeight = cardHeight;
        const tpX = MARGIN;
        const tpY = PAGE_HEIGHT - MARGIN - tpHeight - 5;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text("DISPUTA DE 3º LUGAR", tpX, tpY - 2);
        doc.setFont('helvetica', 'normal');
        
        drawMatch(doc, tpX, tpY, tpWidth, tpHeight, bracket.third_place_match, athletesMap);
    }
  });

  doc.save(`brackets_${event.name.replace(/\s+/g, '_')}.pdf`);
};