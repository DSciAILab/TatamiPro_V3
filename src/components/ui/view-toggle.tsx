import React from 'react';
import { Button } from '@/components/ui/button';
import { LayoutGrid, List } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ViewToggleProps {
  viewMode: 'list' | 'grid';
  onToggle: (mode: 'list' | 'grid') => void;
  className?: string;
}

export const ViewToggle: React.FC<ViewToggleProps> = ({ viewMode, onToggle, className }) => {
  return (
    <Button
      variant="outline"
      size="icon"
      className={cn("h-10 w-10", className)}
      onClick={() => onToggle(viewMode === 'list' ? 'grid' : 'list')}
      title={viewMode === 'list' ? "Switch to Grid View" : "Switch to List View"}
    >
      {viewMode === 'list' ? (
        <LayoutGrid className="h-4 w-4" />
      ) : (
        <List className="h-4 w-4" />
      )}
    </Button>
  );
};
