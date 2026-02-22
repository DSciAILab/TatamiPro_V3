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
    <Card className="bg-background rounded-none border-0 border-b-4 border-border shadow-none mb-8">
      <CardContent className="py-6 space-y-6">
        {/* Status Filter Badges */}
        <div className="flex items-center gap-2 overflow-x-auto">
          <Badge
            variant={statusFilter === 'all' ? "default" : "outline"}
            className={cn(
              "cursor-pointer h-12 px-6 text-sm md:text-base font-mono uppercase rounded-none border-2 transition-none whitespace-nowrap",
              statusFilter === 'all' 
                ? "bg-primary text-primary-foreground border-primary" 
                : "bg-transparent text-muted-foreground border-border hover:bg-border/50 hover:text-foreground"
            )}
            onClick={() => onFilterChange('all')}
          >
            Todas <span className={cn("ml-1.5 text-xs", statusFilter === 'all' ? "opacity-70" : "opacity-50")}>({totals.total})</span>
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              "cursor-pointer h-12 px-6 text-sm md:text-base font-mono uppercase rounded-none border-2 transition-none whitespace-nowrap",
              statusFilter === 'in_progress' 
                ? "bg-info text-info-foreground border-info" 
                : "bg-transparent text-info border-info/50 hover:bg-info/10 hover:border-info"
            )}
            onClick={() => onFilterChange(statusFilter === 'in_progress' ? 'all' : 'in_progress')}
          >
            Em Progresso <span className={cn("ml-1.5 text-xs", statusFilter === 'in_progress' ? "opacity-70" : "opacity-50")}>({totals.inProgress})</span>
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              "cursor-pointer h-12 px-6 text-sm md:text-base font-mono uppercase rounded-none border-2 transition-none whitespace-nowrap",
              statusFilter === 'pending' 
                ? "bg-warning text-warning-foreground border-warning" 
                : "bg-transparent text-warning border-warning/50 hover:bg-warning/10 hover:border-warning"
            )}
            onClick={() => onFilterChange(statusFilter === 'pending' ? 'all' : 'pending')}
          >
            Pendentes <span className={cn("ml-1.5 text-xs", statusFilter === 'pending' ? "opacity-70" : "opacity-50")}>({totals.pending})</span>
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              "cursor-pointer h-12 px-6 text-sm md:text-base font-mono uppercase rounded-none border-2 transition-none whitespace-nowrap",
              statusFilter === 'finished' 
                ? "bg-success text-success-foreground border-success" 
                : "bg-transparent text-success border-success/50 hover:bg-success/10 hover:border-success"
            )}
            onClick={() => onFilterChange(statusFilter === 'finished' ? 'all' : 'finished')}
          >
            Finalizadas <span className={cn("ml-1.5 text-xs", statusFilter === 'finished' ? "opacity-70" : "opacity-50")}>({totals.finished})</span>
          </Badge>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="SEARCH BY DIVISION, ATHLETE, MAT..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-12 h-14 border-2 border-border rounded-none font-mono uppercase text-lg bg-muted/10 focus-visible:ring-0 focus-visible:border-primary"
            />
          </div>
          <Button 
            variant="outline" 
            size="lg"
            onClick={onToggleAll}
            className="flex items-center gap-3 h-14 rounded-none border-2 border-border font-heading uppercase text-xl hover:bg-primary hover:text-primary-foreground"
          >
            {allExpanded ? (
              <>
                <ChevronsDownUp className="h-5 w-5" />
                Collapse All
              </>
            ) : (
              <>
                <ChevronsUpDown className="h-5 w-5" />
                Expand All
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
