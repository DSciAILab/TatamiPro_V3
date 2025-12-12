"use client";

import { jsPDF } from 'jspdf';
import { Event, Division, Bracket, Athlete, Match } from '@/types/index';

// --- Constants ---
const PAGE_WIDTH = 297; // A4 Landscape width
const PAGE_HEIGHT = 210; // A4 Landscape height
const MARGIN = 10;
const HEADER_HEIGHT = 20;
const ROUND_GAP_BASE = 15; // Space between columns
const MATCH_V_GAP_BASE = 4; // Space between matches in the first round
const LINE_COLOR = '#888888';
const WINNER_BG_COLOR = '#e0f2fe'; // Light blue

const drawText = (doc: jsPDF, text: string, x: number, y: number, options?: any) => {
  const sanitizedText = (text || '').replace(/’/g, "'").replace(/“/g, '"').replace(/”/g, '"');
  doc.text(sanitizedText, x, y, options);
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
  doc.setLineWidth(0.2);
  doc.rect(x, y, width, height);

  const fighter1 = match.fighter1_id === 'BYE' ? 'BYE' : athletesMap.get(match.fighter1_id || '');
  const fighter2 = match.fighter2_id === 'BYE' ? 'BYE' : athletesMap.get(match.fighter2_id || '');

  const fighter1IsWinner = match.winner_id && match.winner_id !== 'BYE' && match.winner_id === match.fighter1_id;
  const fighter2IsWinner = match.winner_id && match.winner_id !== 'BYE' && match.winner_id === match.fighter2_id;

  // Font sizes adjusted based on card height
  const fontSizeName = Math.min(10, height * 0.35); 
  const fontSizeClub = Math.min(8, height * 0.25);
  const textPaddingX = 2;
  const textOffsetY_Name = height * 0.3; // 30% down from top of slot
  const textOffsetY_Club = height * 0.45; // 45% down

  // --- Fighter 1 (Top Slot) ---
  if (fighter1IsWinner) {
    doc.setFillColor(WINNER_BG_COLOR);
    doc.rect(x, y, width, height / 2, 'F');
  }
  
  doc.setFontSize(fontSizeName);
  // Se não tem fighter e não é BYE, deixa vazio para preenchimento manual
  const f1Name = fighter1 ? (fighter1 === 'BYE' ? 'BYE' : `${fighter1.first_name} ${fighter1.last_name}`) : ''; 
  drawText(doc, f1Name, x + textPaddingX, y + textOffsetY_Name);
  
  doc.setFontSize(fontSizeClub);
  const f1Club = (fighter1 && fighter1 !== 'BYE') ? fighter1.club : '';
  drawText(doc, f1Club, x + textPaddingX, y + textOffsetY_Name + textOffsetY_Club);

  // Separator line
  doc.line(x, y + height / 2, x + width, y + height / 2);

  // --- Fighter 2 (Bottom Slot) ---
  if (fighter2IsWinner) {
    doc.setFillColor(WINNER_BG_COLOR);
    doc.rect(x, y + height / 2, width, height / 2, 'F');
  }
  
  doc.setFontSize(fontSizeName);
  const f2Name = fighter2 ? (fighter2 === 'BYE' ? 'BYE' : `${fighter2.first_name} ${fighter2.last_name}`) : '';
  drawText(doc, f2Name, x + textPaddingX, y + height / 2 + textOffsetY_Name);
  
  doc.setFontSize(fontSizeClub);
  const f2Club = (fighter2 && fighter2 !== 'BYE') ? fighter2.club : '';
  drawText(doc, f2Club, x + textPaddingX, y + height / 2 + textOffsetY_Name + textOffsetY_Club);
};

const drawBracketLines = (
  doc: jsPDF,
  matchPositions: Map<string, { x: number; y: number }>,
  bracket: Bracket,
  cardWidth: number,
  cardHeight: number,
  roundGap: number
) => {
  doc.setDrawColor(LINE_COLOR);
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

            const endY = nextPos.y + cardHeight / 2; // Connect to center of next match (simplification, usually enters side)
            // Actually, for a tree, it should enter the side corresponding to the slot.
            // But centering is cleaner visually for generic trees if we don't track slots strictly.
            // Let's stick to the previous logic: if top parent, enter top half; bottom parent, enter bottom half.
            // However, connecting to the vertical center of the next match card's edge is robust.
            
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
    // Round 0 usually has the most matches.
    const maxMatchesInColumn = Math.max(...bracket.rounds.map(r => r.length));

    // Calculate available space
    const availableWidth = PAGE_WIDTH - (2 * MARGIN);
    const availableHeight = PAGE_HEIGHT - (2 * MARGIN) - HEADER_HEIGHT;

    // Determine dimensions based on fitting to page
    // Width: (Rounds * CardWidth) + ((Rounds - 1) * Gap) = AvailableWidth
    // Let Gap be a fraction of CardWidth, e.g., Gap = 0.2 * CardWidth
    // TotalWidth = R*W + (R-1)*0.2*W = W * (R + 0.2(R-1))
    // W = Available / (R + 0.2(R-1))
    const widthFactor = totalRounds + 0.2 * Math.max(0, totalRounds - 1);
    let cardWidth = availableWidth / widthFactor;
    let roundGap = cardWidth * 0.2;

    // Height: (Matches * CardHeight) + ((Matches - 1) * Gap) = AvailableHeight
    // Gap = 0.2 * CardHeight
    const heightFactor = maxMatchesInColumn + 0.2 * Math.max(0, maxMatchesInColumn - 1);
    let cardHeight = availableHeight / heightFactor;
    let matchVGap = cardHeight * 0.2;

    // Clamp dimensions to reasonable min/max to avoid looking weird
    const MAX_CARD_WIDTH = 60;
    const MAX_CARD_HEIGHT = 25;
    const MIN_CARD_HEIGHT = 12; // Ensure text remains readable

    if (cardWidth > MAX_CARD_WIDTH) {
        cardWidth = MAX_CARD_WIDTH;
        // Recalculate gap to fill space, or just center content
        // For simplicity, we just use the max width and keep gap proportional or fixed
        roundGap = ROUND_GAP_BASE; 
    }
    if (cardHeight > MAX_CARD_HEIGHT) {
        cardHeight = MAX_CARD_HEIGHT;
        matchVGap = MATCH_V_GAP_BASE;
    }
    
    // Check if height is too small
    if (cardHeight < MIN_CARD_HEIGHT) {
        // If it's too small, we might need multiple pages or just squeeze it. 
        // For this requirement "fill the sheet", we accept it might be small if there are many matches.
        // But let's respect a hard minimum to avoid overlapping text.
        cardHeight = MIN_CARD_HEIGHT;
        // If this exceeds page height, it will clip. Ideally, we would paginate, but that's complex.
    }

    // Centering offsets if content is smaller than page
    const totalContentWidth = (cardWidth * totalRounds) + (roundGap * (totalRounds - 1));
    const startXOffset = MARGIN + (availableWidth - totalContentWidth) / 2;
    
    const totalContentHeight = (cardHeight * maxMatchesInColumn) + (matchVGap * (maxMatchesInColumn - 1));
    const startYOffset = MARGIN + HEADER_HEIGHT + (availableHeight - totalContentHeight) / 2;

    // --- Header ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    drawText(doc, division.name, PAGE_WIDTH / 2, MARGIN + 10, { align: 'center' });
    doc.setFont('helvetica', 'normal');

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
                 y = startYOffset + matchIndex * (cardHeight + matchVGap) * (2 ** roundIndex); // Fallback estimate
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

    // Pass 4: Third Place
    if (bracket.third_place_match) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        const tpX = MARGIN;
        const tpY = PAGE_HEIGHT - MARGIN - cardHeight - 5;
        drawText(doc, "Disputa de 3º Lugar", tpX, tpY);
        doc.setFont('helvetica', 'normal');
        drawMatch(doc, tpX, tpY + 2, cardWidth, cardHeight, bracket.third_place_match, athletesMap);
    }
  });

  doc.save(`brackets_${event.name.replace(/\s+/g, '_')}.pdf`);
};