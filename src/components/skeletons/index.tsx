import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

// Table row skeleton
export const TableRowSkeleton: React.FC<{ columns?: number }> = ({ columns = 5 }) => (
  <tr className="border-b">
    {Array.from({ length: columns }).map((_, i) => (
      <td key={i} className="p-3">
        <Skeleton className="h-4 w-full" />
      </td>
    ))}
  </tr>
);

// Full table skeleton
export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({ 
  rows = 5, 
  columns = 5 
}) => (
  <div className="rounded-md border">
    <table className="w-full">
      <thead className="bg-muted/50">
        <tr>
          {Array.from({ length: columns }).map((_, i) => (
            <th key={i} className="p-3">
              <Skeleton className="h-4 w-20" />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, i) => (
          <TableRowSkeleton key={i} columns={columns} />
        ))}
      </tbody>
    </table>
  </div>
);

// Athlete card skeleton
export const AthleteCardSkeleton: React.FC = () => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    </CardContent>
  </Card>
);

// Event card skeleton
export const EventCardSkeleton: React.FC = () => (
  <Card>
    <CardHeader>
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-32 mt-1" />
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </div>
    </CardContent>
  </Card>
);

// Stats card skeleton
export const StatsCardSkeleton: React.FC = () => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
        </div>
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
    </CardContent>
  </Card>
);

// Bracket skeleton
export const BracketSkeleton: React.FC = () => (
  <div className="space-y-4">
    <Skeleton className="h-6 w-64 mb-4" />
    <div className="flex gap-8">
      {/* Round 1 */}
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border rounded-md p-3 w-48">
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
      {/* Round 2 */}
      <div className="space-y-8 pt-8">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="border rounded-md p-3 w-48">
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
      {/* Finals */}
      <div className="pt-20">
        <div className="border rounded-md p-3 w-48">
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    </div>
  </div>
);

// Page loading skeleton with header
export const PageSkeleton: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <div className="space-y-6 animate-in fade-in duration-500">
    <div className="flex justify-between items-center">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-10 w-32" />
    </div>
    {children || (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatsCardSkeleton />
          <StatsCardSkeleton />
          <StatsCardSkeleton />
          <StatsCardSkeleton />
        </div>
        <TableSkeleton rows={8} columns={6} />
      </div>
    )}
  </div>
);

// List skeleton for athlete lists
export const AthleteListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <AthleteCardSkeleton key={i} />
    ))}
  </div>
);

// Form skeleton
export const FormSkeleton: React.FC = () => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
    <div className="space-y-2">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-10 w-full" />
    </div>
    <Skeleton className="h-10 w-32 mt-4" />
  </div>
);

export default {
  TableSkeleton,
  TableRowSkeleton,
  AthleteCardSkeleton,
  EventCardSkeleton,
  StatsCardSkeleton,
  BracketSkeleton,
  PageSkeleton,
  AthleteListSkeleton,
  FormSkeleton,
};
