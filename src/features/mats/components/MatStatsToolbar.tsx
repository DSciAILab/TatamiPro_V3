import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';

interface MatStatsToolbarProps {
  totals: {
    total: number;
    finished: number;
    inProgress: number;
    pending: number;
  };
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: 'all' | 'in_progress' | 'pending' | 'finished';
  onFilterChange: (filter: 'all' | 'in_progress' | 'pending' | 'finished') => void;
  allExpanded: boolean;
  onToggleAll: () => void;
}

export const MatStatsToolbar = ({
  totals,
  searchTerm,
  onSearchChange,
  statusFilter,
  onFilterChange,
  allExpanded,
  onToggleAll
}: MatStatsToolbarProps) => {
  return (
    <Card className="bg-muted/40">
      <CardContent className="py-4 space-y-4">
        {/* Status Filter Badges */}
        <div className="flex items-center gap-2 overflow-x-auto">
          <Badge
            variant={statusFilter === 'all' ? "default" : "outline"}
            className={cn(
              "cursor-pointer h-8 px-3 text-sm transition-all font-medium whitespace-nowrap",
              statusFilter === 'all' 
                ? "bg-primary text-primary-foreground hover:bg-primary/90 border-transparent" 
                : "bg-transparent text-muted-foreground border-muted-foreground/30 hover:text-foreground hover:border-foreground/50"
            )}
            onClick={() => onFilterChange('all')}
          >
            Todas <span className={cn("ml-1.5 text-xs", statusFilter === 'all' ? "opacity-70" : "opacity-50")}>({totals.total})</span>
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              "cursor-pointer h-8 px-3 text-sm transition-all font-medium whitespace-nowrap",
              statusFilter === 'in_progress' 
                ? "bg-info text-white border-transparent hover:bg-info/90" 
                : "bg-transparent text-info border-info/50 hover:bg-info/10"
            )}
            onClick={() => onFilterChange(statusFilter === 'in_progress' ? 'all' : 'in_progress')}
          >
            Em Progresso <span className={cn("ml-1.5 text-xs", statusFilter === 'in_progress' ? "opacity-70" : "opacity-50")}>({totals.inProgress})</span>
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              "cursor-pointer h-8 px-3 text-sm transition-all font-medium whitespace-nowrap",
              statusFilter === 'pending' 
                ? "bg-orange-500 text-white border-transparent hover:bg-orange-600" 
                : "bg-transparent text-orange-500 border-orange-500/50 hover:bg-orange-500/10"
            )}
            onClick={() => onFilterChange(statusFilter === 'pending' ? 'all' : 'pending')}
          >
            Pendentes <span className={cn("ml-1.5 text-xs", statusFilter === 'pending' ? "opacity-70" : "opacity-50")}>({totals.pending})</span>
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              "cursor-pointer h-8 px-3 text-sm transition-all font-medium whitespace-nowrap",
              statusFilter === 'finished' 
                ? "bg-success text-white border-transparent hover:bg-success/90" 
                : "bg-transparent text-success border-success/50 hover:bg-success/10"
            )}
            onClick={() => onFilterChange(statusFilter === 'finished' ? 'all' : 'finished')}
          >
            Finalizadas <span className={cn("ml-1.5 text-xs", statusFilter === 'finished' ? "opacity-70" : "opacity-50")}>({totals.finished})</span>
          </Badge>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by division, athlete, mat... (comma for multiple)"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={onToggleAll}
            className="flex items-center gap-2"
          >
            {allExpanded ? (
              <>
                <ChevronsDownUp className="h-4 w-4" />
                Collapse All
              </>
            ) : (
              <>
                <ChevronsUpDown className="h-4 w-4" />
                Expand All
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
