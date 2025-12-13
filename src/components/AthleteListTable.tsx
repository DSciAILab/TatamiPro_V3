"use client";

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserRound, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Athlete } from '@/types/index';
import { useTranslations } from '@/hooks/use-translations';

interface AthleteListTableProps {
  athletes: Athlete[];
  sortConfig?: { key: string; direction: 'asc' | 'desc' };
  onSort?: (key: string) => void;
}

const AthleteListTable: React.FC<AthleteListTableProps> = ({ athletes, sortConfig, onSort }) => {
  const { t } = useTranslations();

  const getSortIcon = (columnKey: string) => {
    if (!sortConfig || !onSort) return null;
    if (sortConfig.key !== columnKey) return <ArrowUpDown className="ml-2 h-4 w-4 inline text-muted-foreground opacity-50" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4 inline" /> : <ArrowDown className="ml-2 h-4 w-4 inline" />;
  };

  const handleHeaderClick = (key: string) => {
    if (onSort) {
      onSort(key);
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className={onSort ? "cursor-pointer" : ""} onClick={() => handleHeaderClick('first_name')}>{t('name')} {getSortIcon('first_name')}</TableHead>
          <TableHead className={onSort ? "cursor-pointer" : ""} onClick={() => handleHeaderClick('club')}>{t('club')} {getSortIcon('club')}</TableHead>
          <TableHead className={onSort ? "cursor-pointer" : ""} onClick={() => handleHeaderClick('division_name')}>{t('publicCategory')} {getSortIcon('division_name')}</TableHead>
          <TableHead className={onSort ? "cursor-pointer" : ""} onClick={() => handleHeaderClick('registration_status')}>{t('status')} {getSortIcon('registration_status')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {athletes.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="text-center">No athletes found in this division.</TableCell>
          </TableRow>
        ) : (
          athletes.map(athlete => (
            <TableRow key={athlete.id}>
              <TableCell className="font-medium flex items-center">
                {athlete.photo_url ? (
                  <img src={athlete.photo_url} alt={athlete.first_name} className="w-8 h-8 rounded-full object-cover mr-3" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mr-3">
                    <UserRound className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                {athlete.first_name} {athlete.last_name}
              </TableCell>
              <TableCell>{athlete.club}</TableCell>
              <TableCell>{athlete._division?.name || 'N/A'}</TableCell>
              <TableCell>{t(`status_${athlete.registration_status}` as any)}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
};

export default AthleteListTable;