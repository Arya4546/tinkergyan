/**
 * project.store.ts
 *
 * Zustand store for the user's project list.
 * Used by Dashboard (list) and Editor (create/update via editor.store).
 */
import { create } from 'zustand';
import {
  projectService,
  type ProjectSummary,
  type ProjectFilterParams,
} from '../services/project.service';

interface ProjectState {
  projects: ProjectSummary[];
  isLoading: boolean;
  error: string | null;
  hasFetched: boolean;

  fetchProjects: (params?: ProjectFilterParams) => Promise<void>;
  removeProject: (id: string) => Promise<void>;
  /**
   * Deletes several projects at once (bulk-delete from the project list).
   * Each deletion is independent — if some fail (e.g. one was already
   * removed elsewhere), the ones that succeeded still disappear and only
   * the failed ids are restored. Returns the ids that failed to delete.
   */
  removeProjects: (ids: string[]) => Promise<string[]>;
  /** Optimistically prepend a newly-created project to the list. */
  addProject: (project: ProjectSummary) => void;
}

export const useProjectStore = create<ProjectState>()((set, get) => ({
  projects: [],
  isLoading: false,
  error: null,
  hasFetched: false,

  fetchProjects: async (params?: ProjectFilterParams) => {
    set({ isLoading: true, error: null });
    try {
      const projects = await projectService.list(params);
      set({ projects, hasFetched: true });
    } catch (err: any) {
      const message = err?.response?.data?.error?.message ?? 'Failed to load projects';
      set({ error: message });
    } finally {
      set({ isLoading: false });
    }
  },

  removeProject: async (id: string) => {
    // Optimistic removal — roll back on error
    const previous = get().projects;
    set({ projects: previous.filter((p) => p.id !== id) });
    try {
      await projectService.remove(id);
    } catch {
      set({ projects: previous });
    }
  },

  removeProjects: async (ids: string[]) => {
    const idSet = new Set(ids);
    // Optimistic removal — restore just the ones that turn out to fail,
    // rather than rolling back the whole batch over one bad id.
    const previous = get().projects;
    set({ projects: previous.filter((p) => !idSet.has(p.id)) });

    const results = await Promise.allSettled(ids.map((id) => projectService.remove(id)));
    const failedIds = ids.filter((_, i) => results[i]?.status === 'rejected');
    if (failedIds.length > 0) {
      const failedSet = new Set(failedIds);
      set((state) => ({
        projects: [...state.projects, ...previous.filter((p) => failedSet.has(p.id))],
      }));
    }
    return failedIds;
  },

  addProject: (project: ProjectSummary) => {
    set((state) => ({ projects: [project, ...state.projects] }));
  },
}));
