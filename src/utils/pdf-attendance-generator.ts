"use client";

import { jsPDF } from 'jspdf';
import { Athlete, Division } from '@/types/index';

interface AttendanceReportOptions {
  eventName: string;
  divisions: Division[];
  athletes: Athlete[];
}

export const generateAttendancePdf = (options: AttendanceReportOptions) => {
  const { eventName, divisions, athletes } = options;
  
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4'
  });

  const PAGE_WIDTH = 210;
  const PAGE_HEIGHT = 297;
  const MARGIN = 15;
  const LINE_HEIGHT = 5;

  // Group athletes by division (considering moved_to_division_id)
  interface AthletesByDivision {
    division: Division;
    athletes: Athlete[];
  }
  
  const athletesByDivision: AthletesByDivision[] = [];

  divisions.forEach(division => {
    const divAthletes = athletes.filter(a => {
      const effectiveDivisionId = a.moved_to_division_id || a._division?.id;
      return effectiveDivisionId === division.id;
    });
    if (divAthletes.length > 0) {
      // Sort by attendance status (pending first), then by name
      divAthletes.sort((a, b) => {
        if (a.attendance_status === 'pending' && b.attendance_status !== 'pending') return -1;
        if (a.attendance_status !== 'pending' && b.attendance_status === 'pending') return 1;
        return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
      });
      athletesByDivision.push({ division, athletes: divAthletes });
    }
  });

  // Sort divisions by name
  athletesByDivision.sort((a, b) => a.division.name.localeCompare(b.division.name));

  // Calculate stats
  const totalAthletes = athletes.length;
  const present = athletes.filter(a => a.attendance_status === 'present').length;
  const absent = athletes.filter(a => a.attendance_status === 'absent').length;
  const pending = athletes.filter(a => a.attendance_status === 'pending').length;
  const privateTransport = athletes.filter(a => a.attendance_status === 'private_transportation').length;

  let y = MARGIN;

  // --- Header ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(eventName, PAGE_WIDTH / 2, y, { align: 'center' });
  y += 8;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('Attendance Report', PAGE_WIDTH / 2, y, { align: 'center' });
  y += 5;

  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, PAGE_WIDTH / 2, y, { align: 'center' });
  doc.setTextColor(0);
  y += 10;

  // --- Summary Stats ---
  doc.setFillColor(245, 245, 245);
  doc.rect(MARGIN, y - 3, PAGE_WIDTH - 2 * MARGIN, 12, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  const statsY = y + 3;
  const statsSpacing = (PAGE_WIDTH - 2 * MARGIN) / 5;

  doc.setTextColor(16, 185, 129); // Green
  doc.text(`Present: ${present}`, MARGIN + 5, statsY);

  doc.setTextColor(239, 68, 68); // Red
  doc.text(`Absent: ${absent}`, MARGIN + statsSpacing, statsY);

  doc.setTextColor(249, 115, 22); // Orange
  doc.text(`Pending: ${pending}`, MARGIN + statsSpacing * 2, statsY);

  doc.setTextColor(99, 102, 241); // Indigo
  doc.text(`Self Transport: ${privateTransport}`, MARGIN + statsSpacing * 3, statsY);

  doc.setTextColor(59, 130, 246); // Blue
  doc.text(`Total: ${totalAthletes}`, MARGIN + statsSpacing * 4, statsY);

  doc.setTextColor(0);
  y += 15;

  // --- Athletes by Division ---
  athletesByDivision.forEach(({ division, athletes: divAthletes }) => {
    // Check if we need a new page
    if (y > PAGE_HEIGHT - 30) {
      doc.addPage();
      y = MARGIN;
    }

    // Division Header
    doc.setFillColor(51, 65, 85); // Slate-700
    doc.rect(MARGIN, y - 3, PAGE_WIDTH - 2 * MARGIN, 7, 'F');
    doc.setTextColor(255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`${division.name} (${divAthletes.length} athletes)`, MARGIN + 2, y + 1);
    doc.setTextColor(0);
    y += 7;

    // Table Header
    doc.setFillColor(241, 245, 249); // Slate-100
    doc.rect(MARGIN, y - 2, PAGE_WIDTH - 2 * MARGIN, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('', MARGIN + 2, y + 2); // Checkbox column
    doc.text('Athlete', MARGIN + 10, y + 2);
    doc.text('Club', MARGIN + 75, y + 2);
    doc.text('Status', MARGIN + 145, y + 2);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    divAthletes.forEach((athlete, index) => {
      // Check if we need a new page
      if (y > PAGE_HEIGHT - 15) {
        doc.addPage();
        y = MARGIN;
      }

      // Alternate row background
      if (index % 2 === 0) {
        doc.setFillColor(249, 250, 251);
        doc.rect(MARGIN, y - 2, PAGE_WIDTH - 2 * MARGIN, LINE_HEIGHT, 'F');
      }

      // Checkbox
      doc.setDrawColor(180);
      doc.rect(MARGIN + 2, y - 1.5, 3, 3);
      if (athlete.attendance_status === 'present' || athlete.attendance_status === 'private_transportation') {
        doc.setFillColor(16, 185, 129);
        doc.rect(MARGIN + 2.5, y - 1, 2, 2, 'F');
      }

      // Athlete Name
      const name = `${athlete.first_name} ${athlete.last_name}`.substring(0, 32);
      doc.text(name, MARGIN + 10, y + 1);

      // Club
      const club = (athlete.club || '').substring(0, 30);
      doc.text(club, MARGIN + 75, y + 1);

      // Status
      let status = '';
      switch (athlete.attendance_status) {
        case 'present':
          doc.setTextColor(16, 185, 129);
          status = 'Present';
          break;
        case 'absent':
          doc.setTextColor(239, 68, 68);
          status = 'Absent';
          break;
        case 'private_transportation':
          doc.setTextColor(99, 102, 241);
          status = 'Self Transport';
          break;
        default:
          doc.setTextColor(249, 115, 22);
          status = 'Pending';
      }
      doc.text(status, MARGIN + 145, y + 1);
      doc.setTextColor(0);

      y += LINE_HEIGHT;
    });

    y += 5; // Space between divisions
  });

  // Save the PDF
  doc.save(`attendance_${eventName.replace(/\s+/g, '_')}.pdf`);
};
