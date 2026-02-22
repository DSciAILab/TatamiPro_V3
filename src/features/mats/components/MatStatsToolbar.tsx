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
    <Card className="bg-background rounded-3xl border border-border/30 shadow-sm mb-8 overflow-hidden">
      <CardContent className="py-6 space-y-6">
        {/* Status Filter Badges */}
        <div className="flex items-center gap-2 overflow-x-auto">
          <Badge
            variant={statusFilter === 'all' ? "default" : "outline"}
            className={cn(
              "cursor-pointer h-10 px-5 text-sm md:text-base font-medium rounded-full border transition-all hover:shadow-sm whitespace-nowrap",
              statusFilter === 'all' 
                ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                : "bg-transparent text-muted-foreground border-border/50 hover:bg-muted/50 hover:text-foreground"
            )}
            onClick={() => onFilterChange('all')}
          >
            Todas <span className={cn("ml-1.5 text-xs", statusFilter === 'all' ? "opacity-70" : "opacity-50")}>({totals.total})</span>
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              "cursor-pointer h-10 px-5 text-sm md:text-base font-medium rounded-full border transition-all hover:shadow-sm whitespace-nowrap",
              statusFilter === 'in_progress' 
                ? "bg-info/10 text-info border-info/30 shadow-sm" 
                : "bg-transparent text-info border-info/30 hover:bg-info/5 hover:border-info/50"
            )}
            onClick={() => onFilterChange(statusFilter === 'in_progress' ? 'all' : 'in_progress')}
          >
            Em Progresso <span className={cn("ml-1.5 text-xs", statusFilter === 'in_progress' ? "opacity-70" : "opacity-50")}>({totals.inProgress})</span>
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              "cursor-pointer h-10 px-5 text-sm md:text-base font-medium rounded-full border transition-all hover:shadow-sm whitespace-nowrap",
              statusFilter === 'pending' 
                ? "bg-warning/10 text-warning border-warning/30 shadow-sm" 
                : "bg-transparent text-warning border-warning/30 hover:bg-warning/5 hover:border-warning/50"
            )}
            onClick={() => onFilterChange(statusFilter === 'pending' ? 'all' : 'pending')}
          >
            Pendentes <span className={cn("ml-1.5 text-xs", statusFilter === 'pending' ? "opacity-70" : "opacity-50")}>({totals.pending})</span>
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              "cursor-pointer h-10 px-5 text-sm md:text-base font-medium rounded-full border transition-all hover:shadow-sm whitespace-nowrap",
              statusFilter === 'finished' 
                ? "bg-success/10 text-success border-success/30 shadow-sm" 
                : "bg-transparent text-success border-success/30 hover:bg-success/5 hover:border-success/50"
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
              placeholder="Buscar por categoria, atleta, area..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-12 h-12 border border-border/50 rounded-2xl font-medium text-base bg-muted/10 focus-visible:ring-primary/50 shadow-inner transition-colors"
            />
          </div>
          <Button 
            variant="outline" 
            size="lg"
            onClick={onToggleAll}
            className="flex items-center gap-2 h-12 rounded-2xl border border-border/50 font-medium text-base hover:bg-muted/50 shadow-sm transition-all"
          >
            {allExpanded ? (
              <>
                <ChevronsDownUp className="h-4 w-4" />
                Recolher Tudo
              </>
            ) : (
              <>
                <ChevronsUpDown className="h-4 w-4" />
                Expandir Tudo
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
