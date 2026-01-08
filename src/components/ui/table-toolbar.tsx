import React from 'react';
import { Input } from '@/components/ui/input';
import { ViewToggle } from '@/components/ui/view-toggle';
import { Search } from 'lucide-react';

interface TableToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  viewMode: 'list' | 'grid';
  onViewModeChange: (mode: 'list' | 'grid') => void;
  placeholder?: string;
  children?: React.ReactNode; // For extra actions
}

export const TableToolbar: React.FC<TableToolbarProps> = ({
  searchTerm,
  onSearchChange,
  viewMode,
  onViewModeChange,
  placeholder = "Search...",
  children,
}) => {
  return (
    <div className="flex flex-col md:flex-row gap-4 mb-4 items-center justify-between">
      <div className="relative flex-1 w-full md:max-w-md">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8"
        />
      </div>
      <div className="flex items-center gap-2 w-full md:w-auto justify-end">
        {children}
        <ViewToggle viewMode={viewMode} onToggle={onViewModeChange} />
      </div>
    </div>
  );
};
