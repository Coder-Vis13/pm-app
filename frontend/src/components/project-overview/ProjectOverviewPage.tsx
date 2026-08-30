import { useEffect, useState } from "react";
import { Separator } from "@/components/ui/separator";
import {
  buildProjectOverviewViewModel,
  type ProjectOverviewViewModel,
} from "@/data/project-overview/formatters";
import { fetchProjectOverviewRaw } from "@/data/project-overview/mockData";
import { ApiError } from "@/lib/api-client";
import { ProjectHealth } from "./ProjectHealth";
import { ProjectIntelligence } from "./ProjectIntelligence";
import { ProjectOverviewHeader } from "./ProjectOverviewHeader";
import { ProjectProgress } from "./ProjectProgress";
import { SectionProgress } from "./SectionProgress";
import { SectionLabel } from "./shared";
import { WorkflowSignals } from "./WorkflowSignals";

interface ProjectOverviewPageProps {
  projectId: string;
  projectName?: string;
  projectDescription?: string | null;
  onSectionSelect?: (sectionId: string) => void;
}

function getLoadErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Failed to load project overview";
}

export function ProjectOverviewPage({
  projectId,
  projectName,
  projectDescription,
  onSectionSelect,
}: ProjectOverviewPageProps) {
  const [data, setData] = useState<ProjectOverviewViewModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const raw = await fetchProjectOverviewRaw(projectId);
        if (!cancelled) {
          setData(buildProjectOverviewViewModel(raw));
        }
      } catch (err) {
        if (!cancelled) {
          setData(null);
          setError(getLoadErrorMessage(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <p className="text-sm text-neutral-500">Loading project overview...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const headerData = {
    ...data,
    projectName: projectName ?? data.projectName,
    description: projectDescription ?? data.description,
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="space-y-10">
        <ProjectOverviewHeader data={headerData} />

        <section className="space-y-4">
          <SectionLabel>Project health</SectionLabel>
          <ProjectHealth health={data.health} />
        </section>

        <Separator className="bg-neutral-100" />

        <section className="space-y-4">
          <SectionLabel>Project progress</SectionLabel>
          <ProjectProgress rows={data.statusRows} />
        </section>

        <Separator className="bg-neutral-100" />

        <section className="space-y-4">
          <SectionLabel>Section progress</SectionLabel>
          <SectionProgress
            sections={data.sections}
            onSectionSelect={onSectionSelect}
          />
        </section>

        <Separator className="bg-neutral-100" />

        <section>
          <ProjectIntelligence
            cards={data.intelligence}
            totalCount={data.intelligenceTotal}
          />
        </section>

        <Separator className="bg-neutral-100" />

        <section className="space-y-4">
          <SectionLabel>Workflow signals</SectionLabel>
          <WorkflowSignals signals={data.workflowSignals} />
        </section>
      </div>
    </div>
  );
}
