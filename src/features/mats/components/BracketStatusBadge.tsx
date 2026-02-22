import { DivisionInfo } from '../utils/mat-utils';

import { cn } from "@/lib/utils";

interface BracketStatusBadgeProps {
  status: DivisionInfo['status'];
}

export const BracketStatusBadge = ({ status }: BracketStatusBadgeProps) => {
  const baseClasses = "px-3 py-1 text-xs md:text-sm font-mono uppercase border-2 transition-none whitespace-nowrap";

  switch (status) {
    case 'Finished':
      return <span className={cn(baseClasses, "bg-muted/10 border-border text-muted-foreground")}>Finalizado</span>;
    case 'In Progress':
      return <span className={cn(baseClasses, "bg-info text-info-foreground border-info")}>Lutando</span>;
    default:
      return <span className={cn(baseClasses, "bg-warning text-warning-foreground border-warning")}>Pendente</span>;
  }
};
