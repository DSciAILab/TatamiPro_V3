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

  const fighter1IsWinner = !!(match.winner_id && match.winner_id !== 'BYE' && match.winner_id === match.fighter1_id);
  const fighter2IsWinner = !!(match.winner_id && match.winner_id !== 'BYE' && match.winner_id === match.fighter2_id);

  const slotHeight = height / 2;
  const paddingX = 2;
  const matchNumSize = 6;
  
  const baseNameFontSize = Math.min(9, height * 0.25);
  const nameFontSize = baseNameFontSize + 1; // Aumenta o tamanho da fonte do nome em 1
  const clubFontSize = Math.min(7, height * 0.18);
  const idFontSize = Math.min(7, height * 0.18);

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

  const drawSlot = (fighter: Athlete | 'BYE' | undefined, slotY: number, isWinner: boolean) => {
    if (isWinner) {
      doc.setFillColor(WINNER_BG_COLOR);
      doc.rect(x, slotY, width, slotHeight, 'F');
      doc.rect(x, slotY, width, slotHeight);
    }

    if (!fighter) return;

    const name = fighter === 'BYE' ? 'BYE' : `${fighter.first_name} ${fighter.last_name}`;
    const club = fighter !== 'BYE' ? fighter.club : '';
    
    // Usar registration_qr_code_id como o ID impresso
    const athleteId = fighter !== 'BYE' ? fighter.registration_qr_code_id || fighter.id : '';
    const idDisplay = athleteId ? `${athleteId.slice(-6).toUpperCase()} ` : '';

    // ID
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(idFontSize);
    doc.setTextColor(100, 100, 100);
    const idWidth = doc.getTextWidth(idDisplay);
    doc.text(idDisplay, x + paddingX, slotY + (slotHeight * 0.45));

    // Name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(nameFontSize); // Usando o tamanho de fonte aumentado
    doc.setTextColor(0, 0, 0);
    const fitName = fitText(doc, name, width - (paddingX * 2) - idWidth);
    doc.text(fitName, x + paddingX + idWidth, slotY + (slotHeight * 0.45));

    // Club
    if (club) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(clubFontSize);
      const fitClub = fitText(doc, club, width - (paddingX * 2));
      doc.text(fitClub, x + paddingX, slotY + (slotHeight * 0.85));
      doc.setTextColor(0, 0, 0);
    }
  };

  drawSlot(fighter1, y, fighter1IsWinner);
  doc.setDrawColor(LINE_COLOR);
  doc.line(x, y + slotHeight, x + width, y + slotHeight);
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

export const generateBracketPdf = (
  event: Event,
  selectedDivisions: Division[],
  athletesMap: Map<string, Athlete>,
  userName: string
) => {
  const doc = new jsPDF({
    orientation: 'l',
    unit: 'mm',
    format: 'a4'
  });

  let pageAdded = false;

  selectedDivisions.forEach((division) => {
    const bracket = event.brackets?.[division.id];
    
    if (!bracket || !bracket.rounds || bracket.rounds.length === 0) return;

    if (pageAdded) doc.addPage();
    pageAdded = true;

    const totalRounds = bracket.rounds.length;
    const maxMatchesInColumn = Math.max(...bracket.rounds.map(r => r.length));

    const availableWidth = PAGE_WIDTH - (2 * MARGIN);
    const availableHeight = PAGE_HEIGHT - (2 * MARGIN) - HEADER_HEIGHT - FOOTER_HEIGHT;

    const widthFactor = totalRounds + 0.3 * Math.max(0, totalRounds - 1);
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

    const ageSetting = event.age_division_settings?.find(s => s.name === division.age_category_name);
    const fightDuration = ageSetting?.fight_duration || 5;
    const totalAthletes = bracket.participants.filter(p => p !== 'BYE').length;
    const totalMatches = bracket.rounds.flat().filter(m => m.fighter1_id !== 'BYE' && m.fighter2_id !== 'BYE').length;
    const totalMinutes = totalMatches * fightDuration;
    const totalHours = (totalMinutes / 60).toFixed(1);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(event.name, PAGE_WIDTH / 2, MARGIN + 8, { align: 'center' });

    doc.setFontSize(16);
    doc.text(`${division.name} (${fightDuration} min)`, PAGE_WIDTH / 2, MARGIN + 15, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100);
    const statsText = `${totalAthletes} atletas | ${totalMatches} lutas | Tempo total est.: ${totalMinutes} min (${totalHours}h)`;
    doc.text(statsText, PAGE_WIDTH / 2, MARGIN + 20, { align: 'center' });
    doc.setTextColor(0);

    doc.setFontSize(10);
    doc.setTextColor(100);
    for (let r = 0; r < totalRounds; r++) {
        const roundName = getRoundName(r, totalRounds);
        const rX = startXOffset + r * (cardWidth + roundGap) + (cardWidth / 2);
        doc.text(roundName, rX, startYOffset - 5, { align: 'center' });
    }
    doc.setTextColor(0);

    const matchPositions = new Map<string, { x: number; y: number }>();

    bracket.rounds.forEach((round, roundIndex) => {
      const x = startXOffset + roundIndex * (cardWidth + roundGap);
      
      round.forEach((match, matchIndex) => {
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

    bracket.rounds.flat().forEach(match => {
      const pos = matchPositions.get(match.id);
      if (pos) {
        drawMatch(doc, pos.x, pos.y, cardWidth, cardHeight, match, athletesMap);
      }
    });

    const finalMatch = bracket.rounds[totalRounds - 1][0];
    const finalMatchPos = matchPositions.get(finalMatch.id);

    if (finalMatchPos) {
        let currentY = finalMatchPos.y + cardHeight + 10;
        const podiumXStart = finalMatchPos.x;
        const podiumLineWidth = cardWidth;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        const podiumLabels = ['1º Lugar:', '2º Lugar:', '3º Lugar:', '3º Lugar:'];
        podiumLabels.forEach(label => {
            if (currentY + 10 > PAGE_HEIGHT - MARGIN - FOOTER_HEIGHT) return;
            doc.text(label, podiumXStart, currentY + 4);
            doc.setDrawColor(LINE_COLOR);
            doc.setLineWidth(0.3);
            doc.line(podiumXStart + 25, currentY + 5, podiumXStart + podiumLineWidth, currentY + 5);
            currentY += 10;
        });

        const validationBoxY = currentY + 5;
        const boxWidth = 70;
        const boxHeight = 25;
        const boxX = podiumXStart;

        if (validationBoxY + boxHeight < PAGE_HEIGHT - MARGIN - FOOTER_HEIGHT) {
            doc.setDrawColor(LINE_COLOR);
            doc.setLineWidth(0.3);
            doc.rect(boxX, validationBoxY, boxWidth, boxHeight);

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');

            doc.text('PS Number:', boxX + 3, validationBoxY + 8);
            doc.line(boxX + 25, validationBoxY + 10, boxX + boxWidth - 3, validationBoxY + 10);

            doc.text('Assinatura:', boxX + 3, validationBoxY + 18);
            doc.line(boxX + 25, validationBoxY + 20, boxX + boxWidth - 3, validationBoxY + 20);
        }
    }

    const now = new Date();
    const printInfo = `Impresso por: ${userName} em ${format(now, 'dd/MM/yyyy HH:mm')}`;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150);
    doc.text(printInfo, MARGIN, PAGE_HEIGHT - 5);
    doc.setTextColor(0);
  });

  doc.save(`brackets_${event.name.replace(/\s+/g, '_')}.pdf`);
};