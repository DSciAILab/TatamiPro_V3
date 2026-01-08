import * as XLSX from 'xlsx';
import { Athlete, Event } from '@/types/index';

/**
 * Export athletes to Excel file
 */
export function exportAthletesToExcel(athletes: Athlete[], eventName: string) {
  // Prepare data for Excel
  const data = athletes.map((athlete, index) => ({
    '#': index + 1,
    'Name': `${athlete.first_name} ${athlete.last_name}`,
    'Club': athlete.club,
    'Gender': athlete.gender,
    'Age': athlete.age,
    'Age Division': athlete.age_division,
    'Belt': athlete.belt,
    'Weight (kg)': athlete.weight,
    'Weight Division': athlete.weight_division,
    'Registration Status': athlete.registration_status,
    'Check-in Status': athlete.check_in_status,
    'Attendance': athlete.attendance_status,
    'Email': athlete.email,
    'Phone': athlete.phone,
  }));

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  // Set column widths
  ws['!cols'] = [
    { wch: 4 },   // #
    { wch: 25 },  // Name
    { wch: 20 },  // Club
    { wch: 10 },  // Gender
    { wch: 6 },   // Age
    { wch: 15 },  // Age Division
    { wch: 10 },  // Belt
    { wch: 10 },  // Weight
    { wch: 15 },  // Weight Division
    { wch: 15 },  // Registration Status
    { wch: 15 },  // Check-in Status
    { wch: 12 },  // Attendance
    { wch: 25 },  // Email
    { wch: 15 },  // Phone
  ];

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Athletes');

  // Generate filename with date
  const date = new Date().toISOString().split('T')[0];
  const filename = `${eventName.replace(/[^a-zA-Z0-9]/g, '_')}_athletes_${date}.xlsx`;

  // Download file
  XLSX.writeFile(wb, filename);
}

/**
 * Export team rankings to Excel
 */
export function exportTeamRankingsToExcel(
  rankings: { name: string; gold: number; silver: number; bronze: number; points: number }[],
  eventName: string
) {
  const data = rankings.map((team, index) => ({
    'Rank': index + 1,
    'Team': team.name,
    'Gold': team.gold,
    'Silver': team.silver,
    'Bronze': team.bronze,
    'Total Points': team.points,
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  ws['!cols'] = [
    { wch: 6 },   // Rank
    { wch: 30 },  // Team
    { wch: 8 },   // Gold
    { wch: 8 },   // Silver
    { wch: 8 },   // Bronze
    { wch: 12 },  // Total Points
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Team Rankings');

  const date = new Date().toISOString().split('T')[0];
  const filename = `${eventName.replace(/[^a-zA-Z0-9]/g, '_')}_rankings_${date}.xlsx`;

  XLSX.writeFile(wb, filename);
}

/**
 * Export division results to Excel
 */
export function exportDivisionResultsToExcel(
  divisions: {
    name: string;
    champion?: string;
    runner_up?: string;
    third_place?: string;
  }[],
  eventName: string
) {
  const data = divisions.map(div => ({
    'Division': div.name,
    '🥇 Champion': div.champion || '-',
    '🥈 Runner-up': div.runner_up || '-',
    '🥉 Third Place': div.third_place || '-',
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  ws['!cols'] = [
    { wch: 35 },  // Division
    { wch: 25 },  // Champion
    { wch: 25 },  // Runner-up
    { wch: 25 },  // Third Place
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Results');

  const date = new Date().toISOString().split('T')[0];
  const filename = `${eventName.replace(/[^a-zA-Z0-9]/g, '_')}_results_${date}.xlsx`;

  XLSX.writeFile(wb, filename);
}

/**
 * Export check-in list to Excel
 */
export function exportCheckInListToExcel(athletes: Athlete[], eventName: string, matName?: string) {
  const data = athletes.map((athlete, index) => ({
    '#': index + 1,
    'Name': `${athlete.first_name} ${athlete.last_name}`,
    'Club': athlete.club,
    'Division': athlete.age_division,
    'Weight Division': athlete.weight_division,
    'Belt': athlete.belt,
    'Check-in': athlete.check_in_status === 'checked_in' ? '✓' : '',
    'Weight': athlete.registered_weight || '',
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  ws['!cols'] = [
    { wch: 4 },   // #
    { wch: 25 },  // Name
    { wch: 20 },  // Club
    { wch: 15 },  // Division
    { wch: 15 },  // Weight Division
    { wch: 10 },  // Belt
    { wch: 10 },  // Check-in
    { wch: 8 },   // Weight
  ];

  const sheetName = matName ? `Mat ${matName}` : 'Check-in List';
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const date = new Date().toISOString().split('T')[0];
  const matSuffix = matName ? `_mat_${matName}` : '';
  const filename = `${eventName.replace(/[^a-zA-Z0-9]/g, '_')}_checkin${matSuffix}_${date}.xlsx`;

  XLSX.writeFile(wb, filename);
}

export default {
  exportAthletesToExcel,
  exportTeamRankingsToExcel,
  exportDivisionResultsToExcel,
  exportCheckInListToExcel,
};
