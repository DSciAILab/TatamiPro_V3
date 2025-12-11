"use client";

import { jsPDF } from 'jspdf';
import { Event, Division, Bracket, Athlete, Match } from '@/types/index';

// --- Drawing Constants ---
const A4_WIDTH = 210;
const A4_HEIGHT = 297;
const MARGIN = 10;
const CARD_WIDTH = 45;
const CARD_HEIGHT = 16;
const ROUND_GAP = 10;
const MATCH_V_GAP = 2;
const FONT_SIZE_NORMAL = 7;
const FONT_SIZE_SMALL = 5;
const LINE_COLOR = '#888888';
const WINNER_BG_COLOR = '#e0f2fe'; // Light blue

const drawText = (doc: jsPDF, text: string, x: number, y: number, options?: any) => {
  // jsPDF doesn't handle some unicode characters well, so we replace them.
  const sanitizedText = (text || '').replace(/’/g, "'").replace(/“/g, '"').replace(/”/g, '"');
  doc.text(sanitizedText, x, y, options);
};

const drawMatch = (
  doc: jsPDF,
  x: number,
  y: number,
  match: Match,
  athletesMap: Map<string, Athlete>
) => {
  doc.setDrawColor(LINE_COLOR);
  doc.setLineWidth(0.2);
  doc.rect(x, y, CARD_WIDTH, CARD_HEIGHT);

  const fighter1 = match.fighter1_id === 'BYE' ? 'BYE' : athletesMap.get(match.fighter1_id || '');
  const fighter2 = match.fighter2_id === 'BYE' ? 'BYE' : athletesMap.get(match.fighter2_id || '');

  const fighter1IsWinner = match.winner_id && match.winner_id !== 'BYE' && match.winner_id === match.fighter1_id;
  const fighter2IsWinner = match.winner_id && match.winner_id !== 'BYE' && match.winner_id === match.fighter2_id;

  // Fighter 1
  if (fighter1IsWinner) {
    doc.setFillColor(WINNER_BG_COLOR);
    doc.rect(x, y, CARD_WIDTH, CARD_HEIGHT / 2, 'F');
  }
  doc.setFontSize(FONT_SIZE_NORMAL);
  const f1Name = fighter1 ? (fighter1 === 'BYE' ? 'BYE' : `${fighter1.first_name} ${fighter1.last_name}`) : 'Aguardando';
  drawText(doc, f1Name, x + 2, y + 4);
  
  doc.setFontSize(FONT_SIZE_SMALL);
  const f1Club = (fighter1 && fighter1 !== 'BYE') ? fighter1.club : '';
  drawText(doc, f1Club, x + 2, y + 7);

  // Separator line
  doc.line(x, y + CARD_HEIGHT / 2, x + CARD_WIDTH, y + CARD_HEIGHT / 2);

  // Fighter 2
  if (fighter2IsWinner) {
    doc.setFillColor(WINNER_BG_COLOR);
    doc.rect(x, y + CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT / 2, 'F');
  }
  doc.setFontSize(FONT_SIZE_NORMAL);
  const f2Name = fighter2 ? (fighter2 === 'BYE' ? 'BYE' : `${fighter2.first_name} ${fighter2.last_name}`) : 'Aguardando';
  drawText(doc, f2Name, x + 2, y + 4 + CARD_HEIGHT / 2);
  
  doc.setFontSize(FONT_SIZE_SMALL);
  const f2Club = (fighter2 && fighter2 !== 'BYE') ? fighter2.club : '';
  drawText(doc, f2Club, x + 2, y + 7 + CARD_HEIGHT / 2);
};

const drawBracketLines = (
  doc: jsPDF,
  matchPositions: Map<string, { x: number; y: number }>,
  bracket: Bracket
) => {
  doc.setDrawColor(LINE_COLOR);
  doc.setLineWidth(0.2);

  bracket.rounds.forEach(round => {
    round.forEach(match => {
      if (match.next_match_id) {
        const currentPos = matchPositions.get(match.id);
        const nextPos = matchPositions.get(match.next_match_id);

        if (currentPos && nextPos) {
            const startX = currentPos.x + CARD_WIDTH;
            const startY = currentPos.y + CARD_HEIGHT / 2;
            const endX = nextPos.x;
            const midX = startX + ROUND_GAP / 2;

            doc.line(startX, startY, midX, startY); // Horizontal line from current match

            const isTopParent = nextPos.y > currentPos.y;
            const endY = nextPos.y + (isTopParent ? CARD_HEIGHT / 4 : (CARD_HEIGHT * 3) / 4);

            doc.line(midX, startY, midX, endY); // Vertical line
            doc.line(midX, endY, endX, endY); // Horizontal line to next match
        }
      }
    });
  });
};

export const generateBracketPdf = (event: Event, selectedDivisions: Division[], athletesMap: Map<string, Athlete>) => {
  // Use 'new jsPDF' directly. The import change above fixes the constructor issue.
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4'
  });

  let pageAdded = false;

  selectedDivisions.forEach((division) => {
    const bracket = event.brackets?.[division.id];
    
    // Skip if bracket is invalid or empty
    if (!bracket || !bracket.rounds || bracket.rounds.length === 0) return;

    if (pageAdded) doc.addPage();
    pageAdded = true;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    drawText(doc, division.name, A4_WIDTH / 2, MARGIN + 5, { align: 'center' });
    doc.setFont('helvetica', 'normal');

    const matchPositions = new Map<string, { x: number; y: number }>();
    
    // Safe calculation for startY
    const firstRound = bracket.rounds[0];
    const totalHeight = firstRound.length * (CARD_HEIGHT + MATCH_V_GAP) - MATCH_V_GAP;
    const startY = Math.max(MARGIN + 15, (A4_HEIGHT - totalHeight) / 2); // Ensure it doesn't overlap header

    // Pass 1: Calculate all match positions
    bracket.rounds.forEach((round, roundIndex) => {
      const x = MARGIN + roundIndex * (CARD_WIDTH + ROUND_GAP);
      round.forEach((match, matchIndex) => {
        let y;
        if (roundIndex === 0) {
          y = startY + matchIndex * (CARD_HEIGHT + MATCH_V_GAP);
        } else {
          // Calculate Y based on parents (previous matches)
          const p1Id = match.prev_match_ids?.[0];
          const p2Id = match.prev_match_ids?.[1];
          
          if (p1Id && p2Id) {
             const prevMatch1Pos = matchPositions.get(p1Id);
             const prevMatch2Pos = matchPositions.get(p2Id);
             
             if (prevMatch1Pos && prevMatch2Pos) {
                 y = (prevMatch1Pos.y + prevMatch2Pos.y) / 2;
             } else {
                 y = startY; // Fallback
             }
          } else {
              y = startY + matchIndex * (CARD_HEIGHT + MATCH_V_GAP) * 2; // Rough fallback
          }
        }
        matchPositions.set(match.id, { x, y });
      });
    });

    // Pass 2: Draw lines and matches
    drawBracketLines(doc, matchPositions, bracket);
    bracket.rounds.flat().forEach(match => {
      const pos = matchPositions.get(match.id);
      if (pos) drawMatch(doc, pos.x, pos.y, match, athletesMap);
    });

    // Draw third place match
    if (bracket.third_place_match) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      drawText(doc, "Luta pelo 3º Lugar", MARGIN, A4_HEIGHT - MARGIN - CARD_HEIGHT - 5);
      doc.setFont('helvetica', 'normal');
      drawMatch(doc, MARGIN, A4_HEIGHT - MARGIN - CARD_HEIGHT, bracket.third_place_match, athletesMap);
    }
  });

  doc.save(`brackets_${event.name.replace(/\s+/g, '_')}.pdf`);
};