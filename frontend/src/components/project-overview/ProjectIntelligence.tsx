import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  filterIntelligenceCards,
  type IntelligenceCardViewModel,
  type IntelligenceFilter,
  type ProjectOverviewViewModel,
} from "@/data/project-overview/formatters";
import { cn } from "@/lib/utils";
import { IntelligenceCard } from "./IntelligenceCard";
import { SectionLabel } from "./shared";

interface ProjectIntelligenceProps {
  cards: IntelligenceCardViewModel[];
  totalCount: number;
}

const FILTERS: { id: IntelligenceFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "waiting", label: "Waiting" },
  { id: "handoff", label: "Handoffs" },
  { id: "focus", label: "Focus" },
];

export function ProjectIntelligence({
  cards,
  totalCount,
}: ProjectIntelligenceProps) {
  const [filter, setFilter] = useState<IntelligenceFilter>("all");
  const visible = filterIntelligenceCards(cards, filter).slice(0, 4);

  return (
    <div className="space-y-4">
      <SectionLabel
        action={
          <span className="text-xs font-normal text-neutral-500 normal-case tracking-normal">
            {totalCount} signal{totalCount === 1 ? "" : "s"} detected
          </span>
        }
      >
        Project intelligence
      </SectionLabel>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <Button
            key={item.id}
            type="button"
            variant={filter === item.id ? "secondary" : "outline"}
            size="sm"
            onClick={() => setFilter(item.id)}
            className={cn(
              "h-7 rounded-full px-3 text-xs",
              filter === item.id && "border-neutral-300"
            )}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {visible.map((card) => (
          <IntelligenceCard key={card.id} card={card} />
        ))}
      </div>

      {totalCount > 4 && (
        <div className="pt-1">
          <Button variant="link" className="h-auto px-0 text-sm text-neutral-600">
            View all {totalCount} signals →
          </Button>
        </div>
      )}
    </div>
  );
}
