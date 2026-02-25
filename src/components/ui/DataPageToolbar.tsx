"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ToolbarFilter {
  label: string;
  count: number;
  value: string;
  colorClass: string;
  activeColorClass: string;
}

export interface DataPageToolbarProps {
  filters?: ToolbarFilter[];
  activeFilter?: string;
  onFilterChange?: (value: string) => void;
  filterLabel?: string;
  searchPlaceholder?: string;
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
  actions?: React.ReactNode;
  stats?: React.ReactNode;
  children?: React.ReactNode;
}

const DataPageToolbar: React.FC<DataPageToolbarProps> = ({
  filters,
  activeFilter,
  onFilterChange,
  filterLabel = 'Filter:',
  searchPlaceholder = 'Search...',
  searchTerm = '',
  onSearchChange,
  actions,
  stats,
  children,
}) => {
  return (
    <div className="space-y-4">
      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {stats}
        </div>
      )}

      {/* Toolbar Card */}
      <Card className="bg-muted/40">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
            {/* Left Side: Filters */}
            {filters && filters.length > 0 && (
              <div className="flex-1 w-full xl:w-auto">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground mr-1">
                    {filterLabel}
                  </span>
                  {filters.map((filter) => {
                    const isActive = activeFilter === filter.value;
                    return (
                      <Badge
                        key={filter.value}
                        variant="outline"
                        className={cn(
                          "cursor-pointer transition-all px-3 py-1 border",
                          isActive
                            ? filter.activeColorClass
                            : filter.colorClass
                        )}
                        onClick={() => onFilterChange?.(filter.value)}
                      >
                        {filter.label}: {filter.count}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Right Side: Actions */}
            {actions && (
              <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
                {actions}
              </div>
            )}
          </div>

          {/* Extra children (e.g. checkboxes, batch action buttons) */}
          {children}

          {/* Search Bar */}
          {onSearchChange && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DataPageToolbar;
