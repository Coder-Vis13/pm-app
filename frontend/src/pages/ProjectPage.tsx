import { ProjectOverviewPage } from "@/components/project-overview/ProjectOverviewPage";

interface ProjectPageProps {
  projectId: string;
  projectName?: string;
  projectDescription?: string | null;
  onSectionSelect?: (sectionId: string) => void;
}

export function ProjectPage({
  projectId,
  projectName,
  projectDescription,
  onSectionSelect,
}: ProjectPageProps) {
  return (
    <ProjectOverviewPage
      projectId={projectId}
      projectName={projectName}
      projectDescription={projectDescription}
      onSectionSelect={onSectionSelect}
    />
  );
}
