import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Swords, Clock } from "lucide-react";
import { MatGroup, formatTime } from "../utils/mat-utils";
import { SortKey } from "../hooks/use-mat-data";
import { DivisionTable } from "./DivisionTable";
import { Event, Division, Bracket } from "@/types/index";

interface MatGroupCardProps {
  group: MatGroup;
  isExpanded: boolean;
  onToggle: () => void;
  event: Event;
  expandedDivisions: Set<string>;
  onToggleDivisionExpansion: (id: string) => void;
  onSort: (key: SortKey) => void;
  onDivisionSelect?: (div: Division, bracketId?: string) => void;
  onUpdateBracket?: (divisionId: string, updatedBracket: Bracket) => void;
}

export const MatGroupCard = ({
  group,
  isExpanded,
  onToggle,
  event,
  expandedDivisions,
  onToggleDivisionExpansion,
  onSort,
  onDivisionSelect,
  onUpdateBracket
}: MatGroupCardProps) => {
  return (
    <Card className="rounded-none border-4 border-border shadow-none mb-6">
      <Collapsible
        open={isExpanded}
        onOpenChange={onToggle}
      >
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-none py-6 px-6 border-b-4 border-transparent data-[state=open]:border-border group">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {isExpanded ? (
                  <ChevronDown className="h-8 w-8" />
                ) : (
                  <ChevronRight className="h-8 w-8" />
                )}
                <CardTitle className="text-4xl font-heading uppercase tracking-tighter">{group.matName}</CardTitle>
                <span className="text-lg font-mono text-muted-foreground group-hover:text-primary-foreground/70 uppercase">
                  ({group.divisions.length} divisions)
                </span>
              </div>
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-3 text-warning group-hover:text-warning-foreground">
                  <Swords className="h-6 w-6" />
                  <span className="font-mono text-xl uppercase">{group.remainingFights} lutas</span>
                </div>
                <div className="flex items-center gap-3 text-info group-hover:text-info-foreground">
                  <Clock className="h-6 w-6" />
                  <span className="font-mono text-xl uppercase">~{formatTime(group.estimatedRemainingTime)}</span>
                </div>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <DivisionTable 
              divisions={group.divisions}
              event={event}
              expandedDivisions={expandedDivisions}
              onToggleExpansion={onToggleDivisionExpansion}
              onSort={onSort}
              onDivisionSelect={onDivisionSelect}
              onUpdateBracket={onUpdateBracket}
            />
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
