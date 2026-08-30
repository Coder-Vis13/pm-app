import type { WorkflowSignalsViewModel } from "@/data/project-overview/formatters";

interface WorkflowSignalsProps {
  signals: WorkflowSignalsViewModel;
}

export function WorkflowSignals({ signals }: WorkflowSignalsProps) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 sm:p-8">
      <div className="grid gap-6 sm:grid-cols-3 sm:gap-8">
        <div className="space-y-1">
          <p className="text-sm text-neutral-500">Waiting time</p>
          <p className="text-2xl font-semibold tabular-nums text-neutral-900">
            {signals.waitingHours}
          </p>
          <p className="text-xs text-neutral-500">total idle time</p>
        </div>

        <div className="space-y-1 sm:border-x sm:border-neutral-100 sm:px-8">
          <p className="text-sm text-neutral-500">Handoffs</p>
          <p className="text-2xl font-semibold tabular-nums text-neutral-900">
            {signals.handoffCount}
          </p>
          <p className="text-xs text-neutral-500">ownership changes</p>
        </div>

        <div className="space-y-1">
          <p className="text-sm text-neutral-500">Focus</p>
          <p className="text-2xl font-semibold tabular-nums text-neutral-900">
            {signals.focusPeopleCount}{" "}
            <span className="text-base font-normal text-neutral-500">people</span>
          </p>
          <p className="text-xs text-neutral-500">overloaded</p>
        </div>
      </div>
    </div>
  );
}
