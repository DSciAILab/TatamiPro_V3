import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Swords, Clock } from "lucide-react";
import { MatGroup, formatTime } from "../utils/mat-utils";
import { SortKey } from "../hooks/use-mat-data";
import { DivisionTable } from "./DivisionTable";
import { Event, Division } from "@/types/index";

interface MatGroupCardProps {
  group: MatGroup;
  isExpanded: boolean;
  onToggle: () => void;
  event: Event;
  expandedDivisions: Set<string>;
  onToggleDivisionExpansion: (id: string) => void;
  onSort: (key: SortKey) => void;
  onDivisionSelect?: (div: Division) => void;
}

export const MatGroupCard = ({
  group,
  isExpanded,
  onToggle,
  event,
  expandedDivisions,
  onToggleDivisionExpansion,
  onSort,
  onDivisionSelect
}: MatGroupCardProps) => {
  return (
    <Card>
      <Collapsible
        open={isExpanded}
        onOpenChange={onToggle}
      >
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronRight className="h-5 w-5" />
                )}
                <CardTitle className="text-lg">{group.matName}</CardTitle>
                <span className="text-sm text-muted-foreground">
                  ({group.divisions.length} divisions)
                </span>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-pending">
                  <Swords className="h-4 w-4" />
                  <span className="font-medium">{group.remainingFights} fights left</span>
                </div>
                <div className="flex items-center gap-2 text-info">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">~{formatTime(group.estimatedRemainingTime)}</span>
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
            />
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
