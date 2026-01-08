import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Trophy, 
  Calendar, 
  ClipboardCheck,
  Search,
  FileText,
  UserPlus,
  Swords
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

// Base empty state component
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className
}) => (
  <div className={cn(
    "flex flex-col items-center justify-center py-12 px-4 text-center",
    className
  )}>
    {icon && (
      <div className="mb-4 p-4 rounded-full bg-muted">
        {icon}
      </div>
    )}
    <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
    {description && (
      <p className="text-sm text-muted-foreground max-w-md mb-4">{description}</p>
    )}
    {action && (
      <Button onClick={action.onClick}>
        {action.label}
      </Button>
    )}
  </div>
);

// Pre-configured empty states
export const NoAthletesEmptyState: React.FC<{ onAdd?: () => void }> = ({ onAdd }) => (
  <EmptyState
    icon={<Users className="h-8 w-8 text-muted-foreground" />}
    title="No athletes registered"
    description="Start by registering athletes for this event. Athletes can also self-register through the public registration form."
    action={onAdd ? { label: "Add Athlete", onClick: onAdd } : undefined}
  />
);

export const NoEventsEmptyState: React.FC<{ onAdd?: () => void }> = ({ onAdd }) => (
  <EmptyState
    icon={<Calendar className="h-8 w-8 text-muted-foreground" />}
    title="No events yet"
    description="Create your first event to start managing competitions, registrations, and brackets."
    action={onAdd ? { label: "Create Event", onClick: onAdd } : undefined}
  />
);

export const NoBracketsEmptyState: React.FC<{ onGenerate?: () => void }> = ({ onGenerate }) => (
  <EmptyState
    icon={<Trophy className="h-8 w-8 text-muted-foreground" />}
    title="No brackets generated"
    description="Generate brackets once you have registered and checked-in athletes for this division."
    action={onGenerate ? { label: "Generate Brackets", onClick: onGenerate } : undefined}
  />
);

export const NoCheckInsEmptyState: React.FC = () => (
  <EmptyState
    icon={<ClipboardCheck className="h-8 w-8 text-muted-foreground" />}
    title="No athletes checked in"
    description="Athletes will appear here once they complete the check-in process with weight verification."
  />
);

export const NoSearchResultsEmptyState: React.FC<{ searchTerm?: string; onClear?: () => void }> = ({ 
  searchTerm, 
  onClear 
}) => (
  <EmptyState
    icon={<Search className="h-8 w-8 text-muted-foreground" />}
    title="No results found"
    description={searchTerm 
      ? `No matches for "${searchTerm}". Try adjusting your search or filters.`
      : "Try adjusting your search or filters."
    }
    action={onClear ? { label: "Clear Search", onClick: onClear } : undefined}
  />
);

export const NoResultsEmptyState: React.FC = () => (
  <EmptyState
    icon={<Trophy className="h-8 w-8 text-muted-foreground" />}
    title="No results yet"
    description="Results will appear here once fights are completed and winners are determined."
  />
);

export const NoDivisionsEmptyState: React.FC<{ onAdd?: () => void }> = ({ onAdd }) => (
  <EmptyState
    icon={<FileText className="h-8 w-8 text-muted-foreground" />}
    title="No divisions configured"
    description="Set up divisions to organize athletes by age, weight, and belt categories."
    action={onAdd ? { label: "Add Divisions", onClick: onAdd } : undefined}
  />
);

export const NoFightsEmptyState: React.FC = () => (
  <EmptyState
    icon={<Swords className="h-8 w-8 text-muted-foreground" />}
    title="No fights scheduled"
    description="Generate brackets first to see the fight schedule for this mat."
  />
);

export const NoTeamMembersEmptyState: React.FC<{ onInvite?: () => void }> = ({ onInvite }) => (
  <EmptyState
    icon={<UserPlus className="h-8 w-8 text-muted-foreground" />}
    title="No team members"
    description="Invite staff members to help manage this event."
    action={onInvite ? { label: "Invite Member", onClick: onInvite } : undefined}
  />
);

// Illustrated empty state with custom SVG
export const IllustratedEmptyState: React.FC<EmptyStateProps & { illustration: 'athletes' | 'events' | 'brackets' }> = ({
  illustration,
  ...props
}) => {
  const illustrations = {
    athletes: (
      <svg className="w-48 h-48 text-muted-foreground/30" viewBox="0 0 200 200" fill="none">
        <circle cx="100" cy="60" r="30" stroke="currentColor" strokeWidth="4" />
        <path d="M60 140 Q100 100 140 140" stroke="currentColor" strokeWidth="4" fill="none" />
        <circle cx="60" cy="160" r="15" stroke="currentColor" strokeWidth="3" strokeDasharray="5 5" />
        <circle cx="140" cy="160" r="15" stroke="currentColor" strokeWidth="3" strokeDasharray="5 5" />
        <path d="M100 90 V120" stroke="currentColor" strokeWidth="4" />
      </svg>
    ),
    events: (
      <svg className="w-48 h-48 text-muted-foreground/30" viewBox="0 0 200 200" fill="none">
        <rect x="30" y="40" width="140" height="120" rx="10" stroke="currentColor" strokeWidth="4" />
        <line x1="30" y1="80" x2="170" y2="80" stroke="currentColor" strokeWidth="4" />
        <circle cx="60" cy="60" r="8" fill="currentColor" />
        <circle cx="100" cy="60" r="8" fill="currentColor" />
        <circle cx="140" cy="60" r="8" fill="currentColor" />
        <rect x="50" y="100" width="40" height="10" rx="2" fill="currentColor" opacity="0.5" />
        <rect x="110" y="100" width="40" height="10" rx="2" fill="currentColor" opacity="0.5" />
        <rect x="50" y="130" width="60" height="10" rx="2" fill="currentColor" opacity="0.5" />
      </svg>
    ),
    brackets: (
      <svg className="w-48 h-48 text-muted-foreground/30" viewBox="0 0 200 200" fill="none">
        <rect x="20" y="30" width="50" height="25" rx="4" stroke="currentColor" strokeWidth="3" />
        <rect x="20" y="70" width="50" height="25" rx="4" stroke="currentColor" strokeWidth="3" />
        <rect x="20" y="110" width="50" height="25" rx="4" stroke="currentColor" strokeWidth="3" />
        <rect x="20" y="150" width="50" height="25" rx="4" stroke="currentColor" strokeWidth="3" />
        <rect x="90" y="50" width="50" height="25" rx="4" stroke="currentColor" strokeWidth="3" />
        <rect x="90" y="130" width="50" height="25" rx="4" stroke="currentColor" strokeWidth="3" />
        <rect x="140" y="90" width="50" height="25" rx="4" stroke="currentColor" strokeWidth="3" strokeDasharray="5 5" />
        <line x1="70" y1="42" x2="90" y2="62" stroke="currentColor" strokeWidth="2" />
        <line x1="70" y1="82" x2="90" y2="62" stroke="currentColor" strokeWidth="2" />
        <line x1="70" y1="122" x2="90" y2="142" stroke="currentColor" strokeWidth="2" />
        <line x1="70" y1="162" x2="90" y2="142" stroke="currentColor" strokeWidth="2" />
        <line x1="140" y1="62" x2="150" y2="102" stroke="currentColor" strokeWidth="2" />
        <line x1="140" y1="142" x2="150" y2="102" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {illustrations[illustration]}
      <h3 className="text-lg font-semibold text-foreground mb-2 mt-4">{props.title}</h3>
      {props.description && (
        <p className="text-sm text-muted-foreground max-w-md mb-4">{props.description}</p>
      )}
      {props.action && (
        <Button onClick={props.action.onClick}>
          {props.action.label}
        </Button>
      )}
    </div>
  );
};

export default {
  EmptyState,
  NoAthletesEmptyState,
  NoEventsEmptyState,
  NoBracketsEmptyState,
  NoCheckInsEmptyState,
  NoSearchResultsEmptyState,
  NoResultsEmptyState,
  NoDivisionsEmptyState,
  NoFightsEmptyState,
  NoTeamMembersEmptyState,
  IllustratedEmptyState,
};
