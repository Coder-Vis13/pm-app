import { ArrowUpRight } from "lucide-react";
import type { IntelligenceCardViewModel } from "@/data/project-overview/formatters";

interface IntelligenceCardProps {
  card: IntelligenceCardViewModel;
}

export function IntelligenceCard({ card }: IntelligenceCardProps) {
  return (
    <button
      type="button"
      className="group flex h-full flex-col rounded-lg border border-neutral-200 bg-white p-4 text-left transition-colors hover:border-neutral-300 hover:bg-neutral-50/50 sm:p-5"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <span className="text-xs font-medium text-neutral-500">
          {card.typeLabel}
        </span>
        <ArrowUpRight
          className="size-3.5 shrink-0 text-neutral-300 transition-colors group-hover:text-neutral-500"
          strokeWidth={1.75}
        />
      </div>

      <h4 className="mb-1 text-sm font-medium text-neutral-900">{card.title}</h4>
      <p className="mb-2 text-sm tabular-nums text-neutral-700">{card.metric}</p>
      <p className="mt-auto text-sm leading-relaxed text-neutral-500">
        {card.explanation}
      </p>
    </button>
  );
}
