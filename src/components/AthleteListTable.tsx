"use client";

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserRound } from 'lucide-react';
import { Athlete } from '@/types/index';

interface AthleteListTableProps {
  athletes: Athlete[];
}

const AthleteListTable: React.FC<AthleteListTableProps> = ({ athletes }) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Club</TableHead>
          <TableHead>Age</TableHead>
          <TableHead>Weight</TableHead>
          <TableHead>Belt</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {athletes.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center">No athletes found in this division.</TableCell>
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
              <TableCell>{athlete.age}</TableCell>
              <TableCell>{athlete.weight}kg</TableCell>
              <TableCell>{athlete.belt}</TableCell>
              <TableCell>{athlete.registration_status}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
};

export default AthleteListTable;