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
    <Card className="rounded-3xl border border-border/50 shadow-sm bg-card mb-6 transition-all hover:shadow-md overflow-hidden">
      <Collapsible
        open={isExpanded}
        onOpenChange={onToggle}
      >
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/5 transition-all py-6 px-6 border-b border-transparent data-[state=open]:border-border/30 group">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {isExpanded ? (
                  <ChevronDown className="h-6 w-6 text-muted-foreground transition-transform" />
                ) : (
                  <ChevronRight className="h-6 w-6 text-muted-foreground transition-transform" />
                )}
                <CardTitle className="text-3xl font-sans font-bold text-foreground tracking-tight">{group.matName}</CardTitle>
                <span className="text-base font-medium text-muted-foreground group-hover:text-foreground/80 transition-colors">
                  ({group.divisions.length} categorias)
                </span>
              </div>
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-3 text-warning/80 group-hover:text-warning transition-colors">
                  <Swords className="h-5 w-5" />
                  <span className="font-medium text-lg">{group.remainingFights} lutas</span>
                </div>
                <div className="flex items-center gap-3 text-info/80 group-hover:text-info transition-colors">
                  <Clock className="h-5 w-5" />
                  <span className="font-medium text-lg">~{formatTime(group.estimatedRemainingTime)}</span>
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
