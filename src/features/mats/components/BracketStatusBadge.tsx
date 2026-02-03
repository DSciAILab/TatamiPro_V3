import { DivisionInfo } from '../utils/mat-utils';

interface BracketStatusBadgeProps {
  status: DivisionInfo['status'];
}

export const BracketStatusBadge = ({ status }: BracketStatusBadgeProps) => {
  switch (status) {
    case 'Finished':
      return <span className="px-2 py-0.5 text-xs rounded-full bg-success/20 text-success">Finished</span>;
    case 'In Progress':
      return <span className="px-2 py-0.5 text-xs rounded-full bg-info/20 text-info">In Progress</span>;
    default:
      return <span className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground">Pending</span>;
  }
};
