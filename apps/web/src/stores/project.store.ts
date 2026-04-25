/**
 * project.store.ts
 *
 * Zustand store for the user's project list.
 * Used by Dashboard (list) and Editor (create/update via editor.store).
 */
import { create } from 'zustand';
import { projectService, type ProjectSummary } from '../services/project.service';

interface ProjectState {
  projects:     ProjectSummary[];
  isLoading:    boolean;
  error:        string | null;
  hasFetched:   boolean;

  fetchProjects:  () => Promise<void>;
  removeProject:  (id: string) => Promise<void>;
  /** Optimistically prepend a newly-created project to the list. */
  addProject:     (project: ProjectSummary) => void;
}

export const useProjectStore = create<ProjectState>()((set, get) => ({
  projects:   [],
  isLoading:  false,
  error:      null,
  hasFetched: false,

  fetchProjects: async () => {
    // Prevent duplicate in-flight requests (e.g. StrictMode double-mount)
    if (get().isLoading) return;
    set({ isLoading: true, error: null });
    try {
      const projects = await projectService.list();
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

  addProject: (project: ProjectSummary) => {
    set((state) => ({ projects: [project, ...state.projects] }));
  },
}));
