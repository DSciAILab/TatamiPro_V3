"use client";

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Settings,
  Users,
  ClipboardList,
  UserCheck,
  GitBranch,
  Trophy,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Pin,
  PinOff,
  Calendar,
  ArrowLeft,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TabItem {
  value: string;
  label: string;
  icon: React.ReactNode;
}

interface EventSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  visibleTabs: { value: string; label: string }[];
  eventName?: string;
  eventDescription?: string;
}

const TAB_ICONS: Record<string, React.ReactNode> = {
  config: <Settings className="h-5 w-5" />,
  staff: <Users className="h-5 w-5" />,
  inscricoes: <ClipboardList className="h-5 w-5" />,
  attendance: <Calendar className="h-5 w-5" />,
  checkin: <UserCheck className="h-5 w-5" />,
  brackets: <GitBranch className="h-5 w-5" />,
  resultados: <Trophy className="h-5 w-5" />,
  llm: <MessageSquare className="h-5 w-5" />,
};

const EventSidebar: React.FC<EventSidebarProps> = ({
  activeTab,
  onTabChange,
  visibleTabs,
  eventName,
  eventDescription,
}) => {
  const navigate = useNavigate();
  
  // Persist sidebar state in localStorage
  const [isExpanded, setIsExpanded] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('eventSidebar_expanded');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });

  const [isPinned, setIsPinned] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('eventSidebar_pinned');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });

  const [isHovered, setIsHovered] = useState(false);

  // Save to localStorage when state changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('eventSidebar_expanded', String(isExpanded));
    }
  }, [isExpanded]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('eventSidebar_pinned', String(isPinned));
    }
  }, [isPinned]);

  // Determine if sidebar should show expanded state
  const showExpanded = isPinned ? isExpanded : (isExpanded || isHovered);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const togglePinned = () => {
    setIsPinned(!isPinned);
    if (!isPinned) {
      // When pinning, ensure it's expanded
      setIsExpanded(true);
    }
  };

  const tabItems: TabItem[] = visibleTabs.map(tab => ({
    ...tab,
    icon: TAB_ICONS[tab.value] || <Settings className="h-5 w-5" />,
  }));

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          "flex flex-col h-full bg-card border-r transition-all duration-300 ease-in-out",
          showExpanded ? "w-60" : "w-16"
        )}
        onMouseEnter={() => !isPinned && setIsHovered(true)}
        onMouseLeave={() => !isPinned && setIsHovered(false)}
      >
        {/* Back to Events + Controls */}
        <div className={cn(
          "flex items-center p-3 border-b gap-2",
          showExpanded ? "justify-between" : "justify-center flex-col"
        )}>
          {/* Back Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0"
                onClick={() => navigate('/events')}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              Back to Events
            </TooltipContent>
          </Tooltip>

          {showExpanded && (
            <span className="font-medium text-sm text-foreground truncate flex-1">
              Navigation
            </span>
          )}

          <div className={cn("flex items-center gap-1", !showExpanded && "flex-col")}>
            {/* Pin/Unpin button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={togglePinned}
                >
                  {isPinned ? (
                    <Pin className="h-4 w-4 text-primary" />
                  ) : (
                    <PinOff className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {isPinned ? "Unpin (auto-expand)" : "Pin sidebar"}
              </TooltipContent>
            </Tooltip>

            {/* Expand/Collapse button (only when pinned) */}
            {isPinned && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={toggleExpanded}
                  >
                    {isExpanded ? (
                      <ChevronLeft className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {isExpanded ? "Collapse" : "Expand"}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Event Info (when expanded) */}
        {showExpanded && eventName && (
          <div className="px-3 py-3 border-b">
            <h2 className="font-semibold text-sm truncate" title={eventName}>
              {eventName}
            </h2>
            {eventDescription && (
              <p className="text-xs text-muted-foreground truncate" title={eventDescription}>
                {eventDescription}
              </p>
            )}
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {tabItems.map((tab) => {
            const isActive = activeTab === tab.value;

            const button = (
              <button
                key={tab.value}
                onClick={() => onTabChange(tab.value)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  isActive && "bg-primary text-primary-foreground font-medium",
                  !showExpanded && "justify-center px-0"
                )}
              >
                <span className="flex-shrink-0">
                  {tab.icon}
                </span>
                {showExpanded && (
                  <span className="truncate text-sm">{tab.label}</span>
                )}
              </button>
            );

            // Show tooltip only when collapsed
            if (!showExpanded) {
              return (
                <Tooltip key={tab.value}>
                  <TooltipTrigger asChild>
                    {button}
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {tab.label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return button;
          })}
        </nav>
      </div>
    </TooltipProvider>
  );
};

export default EventSidebar;
