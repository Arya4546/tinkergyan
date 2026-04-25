/**
 * project.service.ts (frontend)
 *
 * Thin axios wrappers over the project CRUD API.
 * All functions return the unwrapped data payload, not the raw axios response.
 */
import { api } from './api';

export interface ProjectSummary {
  id:          string;
  title:       string;
  type:        'BLOCK' | 'CODE';
  boardTarget: string;
  isPublic:    boolean;
  forkCount:   number;
  createdAt:   string;
  updatedAt:   string;
}

export interface ProjectDetail extends ProjectSummary {
  code:       string | null;
  blockState: unknown | null;
}

export interface CreateProjectInput {
  title:       string;
  type:        'BLOCK' | 'CODE';
  boardTarget?: string;
  code?:       string;
  blockState?: string;
}

export interface UpdateProjectInput {
  title?:       string;
  code?:        string;
  blockState?:  string;
  boardTarget?: string;
  isPublic?:    boolean;
}

export const projectService = {
  async list(): Promise<ProjectSummary[]> {
    const { data } = await api.get('/projects');
    return data.data.projects as ProjectSummary[];
  },

  async get(id: string): Promise<ProjectDetail> {
    const { data } = await api.get(`/projects/${id}`);
    return data.data.project as ProjectDetail;
  },

  async create(input: CreateProjectInput): Promise<ProjectDetail> {
    const { data } = await api.post('/projects', input);
    return data.data.project as ProjectDetail;
  },

  async update(id: string, input: UpdateProjectInput): Promise<ProjectDetail> {
    const { data } = await api.patch(`/projects/${id}`, input);
    return data.data.project as ProjectDetail;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/projects/${id}`);
  },
};
