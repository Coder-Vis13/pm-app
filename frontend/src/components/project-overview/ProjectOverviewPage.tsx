import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Separator } from "@/components/ui/separator";
import {
  buildProjectOverviewViewModel,
  type ProjectOverviewViewModel,
} from "@/data/project-overview/formatters";
import {
  fetchProjectOverviewCore,
  fetchProjectOverviewSecondary,
  type ProjectOverviewCoreData,
  type ProjectOverviewRawData,
  type ProjectOverviewSecondaryData,
} from "@/data/project-overview/mockData";
import { ApiError } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
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

const EMPTY_SECONDARY_DATA: ProjectOverviewSecondaryData = {
  insights: [],
  workflowMetrics: {
    totalIdleHours: 0,
    handoffCount: 0,
    overloadedMemberCount: 0,
  },
};

const EMPTY_PROJECT_META: ProjectOverviewRawData["projectMeta"] = {
  workspaceName: "",
  name: "",
  description: "",
  memberCount: 0,
  updatedMinutesAgo: 0,
  taskLabels: {},
  userLabels: {},
};

// Combine core and secondary data for the existing view model.
function buildRawData(
  core: ProjectOverviewCoreData,
  secondary: ProjectOverviewSecondaryData
): ProjectOverviewRawData {
  return {
    ...core,
    ...secondary,
    projectMeta: EMPTY_PROJECT_META,
  };
}

export function ProjectOverviewPage({
  projectId,
  projectName,
  projectDescription,
  onSectionSelect,
}: ProjectOverviewPageProps) {
  const {
    data: coreData,
    isPending: corePending,
    error: coreError,
  } = useQuery({
    queryKey: queryKeys.projectOverviewCore(projectId),
    queryFn: () => fetchProjectOverviewCore(projectId),
  });

  const {
    data: secondaryData,
    isPending: secondaryPending,
    error: secondaryQueryError,
  } = useQuery({
    queryKey: queryKeys.projectOverviewSecondary(projectId),
    queryFn: () => fetchProjectOverviewSecondary(projectId),
    enabled: !!coreData,
  });

  const loading = corePending;
  const error = coreError ? getLoadErrorMessage(coreError) : null;
  const secondaryLoading = secondaryPending;
  const secondaryError = secondaryQueryError
    ? getLoadErrorMessage(secondaryQueryError)
    : null;

  const data = useMemo((): ProjectOverviewViewModel | null => {
    if (!coreData) {
      return null;
    }

    const secondary = secondaryData ?? EMPTY_SECONDARY_DATA;
    return buildProjectOverviewViewModel(buildRawData(coreData, secondary));
  }, [coreData, secondaryData]);

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
          {secondaryLoading ? (
            <p className="text-sm text-neutral-500">
              Loading project intelligence...
            </p>
          ) : secondaryError ? (
            <p className="text-sm text-red-600">{secondaryError}</p>
          ) : (
            <ProjectIntelligence
              cards={data.intelligence}
              totalCount={data.intelligenceTotal}
            />
          )}
        </section>

        <Separator className="bg-neutral-100" />

        <section className="space-y-4">
          <SectionLabel>Workflow signals</SectionLabel>
          {secondaryLoading ? (
            <p className="text-sm text-neutral-500">
              Loading workflow signals...
            </p>
          ) : secondaryError ? (
            <p className="text-sm text-red-600">
              Workflow signals are unavailable.
            </p>
          ) : (
            <WorkflowSignals signals={data.workflowSignals} />
          )}
        </section>
      </div>
    </div>
  );
}
