import type { BlocklyState, BoardTarget, Cuid, ProjectType } from './common';
import type { Project } from './entities';

/** Sort choices supported by the projects page. */
export type ProjectSortOrder = 'LAST_MODIFIED' | 'NAME' | 'TYPE';

/** View modes supported by the projects page. */
export type ProjectViewMode = 'GRID' | 'LIST';

/** Payload used when creating a new project. */
export interface CreateProjectRequest {
  title: string;
  type: ProjectType;
  boardTarget: BoardTarget;
  templateId?: Cuid;
}

/** Payload used when updating an existing project. */
export interface UpdateProjectRequest {
  title?: string;
  code?: string;
  blockState?: BlocklyState;
  boardTarget?: BoardTarget;
}

/** Response payload returned when listing projects. */
export interface ProjectListResponseData {
  projects: Project[];
}

/** Response payload returned when fetching a single project. */
export interface ProjectResponseData {
  project: Project;
}

/** Response payload returned when a project is duplicated. */
export interface DuplicateProjectResponseData {
  project: Project;
}

/** Response payload returned when visibility changes. */
export interface ProjectVisibilityResponseData {
  projectId: Cuid;
  isPublic: boolean;
}
