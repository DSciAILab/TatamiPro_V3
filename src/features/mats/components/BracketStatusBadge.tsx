import { DivisionInfo } from '../utils/mat-utils';

import { cn } from "@/lib/utils";

interface BracketStatusBadgeProps {
  status: DivisionInfo['status'];
}

export const BracketStatusBadge = ({ status }: BracketStatusBadgeProps) => {
  const baseClasses = "px-3 py-1 text-xs md:text-sm font-medium rounded-full border shadow-sm whitespace-nowrap transition-all";

  switch (status) {
    case 'Finished':
      return <span className={cn(baseClasses, "bg-muted/30 border-border/50 text-muted-foreground")}>Finalizado</span>;
    case 'In Progress':
      return <span className={cn(baseClasses, "bg-info/10 text-info border-info/30")}>Lutando</span>;
    default:
      return <span className={cn(baseClasses, "bg-warning/10 text-warning border-warning/30")}>Pendente</span>;
  }
};
