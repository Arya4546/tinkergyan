/**
 * admin-api.ts — typed client for the super-admin endpoints (/api/admin/*),
 * plus small formatting helpers shared by the admin pages.
 */
import { api } from '../services/api';

export type ProjectKind = 'ai' | 'software' | 'hardware';
export type Role = 'USER' | 'ADMIN' | 'SUPER_ADMIN';

export interface AdminStats {
  users: { total: number; new7d: number; new30d: number; active7d: number };
  projects: { total: number; public: number; ai: number; software: number; hardware: number };
  learning: {
    publishedCourses: number;
    totalCourses: number;
    enrollments: number;
    completedLessons: number;
  };
  signupsByDay: { date: string; count: number }[];
  recentUsers: { id: string; name: string; email: string; role: Role; createdAt: string }[];
  recentProjects: {
    id: string;
    title: string;
    kind: ProjectKind;
    updatedAt: string;
    user: { id: string; name: string };
  }[];
}

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  role: Role;
  xp: number;
  level: number;
  streak: number;
  lastActiveAt: string;
  createdAt: string;
  projectCount: number;
  enrollmentCount: number;
  badgeCount: number;
}

export interface AdminProjectRow {
  id: string;
  title: string;
  type: 'BLOCK' | 'CODE';
  kind: ProjectKind;
  boardTarget: string;
  isPublic: boolean;
  forkCount: number;
  createdAt: string;
  updatedAt: string;
  user: { id: string; name: string; email: string };
}

export interface AdminUserDetail {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  role: Role;
  xp: number;
  level: number;
  streak: number;
  lastActiveAt: string;
  createdAt: string;
  updatedAt: string;
  preferences: {
    theme: string;
    editorFontSize: number;
    defaultBoard: string;
    autoSave: boolean;
    codeCompletion: boolean;
    emailNotifications: boolean;
  } | null;
  projects: {
    id: string;
    title: string;
    type: 'BLOCK' | 'CODE';
    kind: ProjectKind;
    boardTarget: string;
    isPublic: boolean;
    forkCount: number;
    forkedFrom: string | null;
    createdAt: string;
    updatedAt: string;
  }[];
  enrollments: {
    enrolledAt: string;
    course: { id: string; slug: string; title: string; difficulty: string };
    totalLessons: number;
    completedLessons: number;
    percent: number;
  }[];
  badges: {
    earnedAt: string;
    id: string;
    slug: string;
    title: string;
    description: string;
    icon: string;
  }[];
  totals: { projects: number; completedLessons: number; badges: number };
}

export interface AdminProjectDetail {
  id: string;
  title: string;
  type: 'BLOCK' | 'CODE';
  kind: ProjectKind;
  code: string | null;
  blockState: unknown;
  boardTarget: string;
  isPublic: boolean;
  forkCount: number;
  forkedFrom: string | null;
  createdAt: string;
  updatedAt: string;
  user: { id: string; name: string; email: string; role: Role };
}

interface Envelope<T> {
  success: boolean;
  data: T;
}

const get = async <T>(url: string, params?: Record<string, unknown>): Promise<T> => {
  const cleaned = Object.fromEntries(
    Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== ''),
  );
  const res = await api.get<Envelope<T>>(url, { params: cleaned });
  return res.data.data;
};

export const adminApi = {
  stats: () => get<AdminStats>('/admin/stats'),
  users: (p: { search?: string; role?: string; sort?: string; page?: number; pageSize?: number }) =>
    get<{ total: number; page: number; pageSize: number; users: AdminUserRow[] }>(
      '/admin/users',
      p,
    ),
  user: (id: string) => get<AdminUserDetail>(`/admin/users/${id}`),
  projects: (p: {
    search?: string;
    kind?: string;
    visibility?: string;
    userId?: string;
    page?: number;
    pageSize?: number;
  }) =>
    get<{ total: number; page: number; pageSize: number; projects: AdminProjectRow[] }>(
      '/admin/projects',
      p,
    ),
  project: (id: string) => get<AdminProjectDetail>(`/admin/projects/${id}`),
};

// ── Helpers ──────────────────────────────────────────────────────────────────

export const KIND_LABEL: Record<ProjectKind, string> = {
  ai: 'AI Studio',
  software: 'Software',
  hardware: 'Hardware',
};

export const ROLE_LABEL: Record<Role, string> = {
  USER: 'Student',
  ADMIN: 'Admin',
  SUPER_ADMIN: 'Super admin',
};

export const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export const formatDateTime = (iso: string): string =>
  new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export const timeAgo = (iso: string): string => {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return formatDate(iso);
};

export const formatBytes = (n: number): string =>
  n < 1024
    ? `${n} B`
    : n < 1024 * 1024
      ? `${(n / 1024).toFixed(1)} KB`
      : `${(n / 1024 / 1024).toFixed(1)} MB`;

/** What the editor stored in a project's blockState (see editor.store saveProject). */
export interface ParsedBlockState {
  blockXml: string;
  aiKind?: string;
  aiTab?: string;
  imageClasses: string[];
  audioClasses: string[];
  poseClasses: string[];
  textClasses: { name: string; sentences: string[] }[];
  datasetBytes: { image: number; audio: number; pose: number };
  spriteCount: number;
  raw: string;
}

export function parseBlockState(blockState: unknown): ParsedBlockState {
  const raw = typeof blockState === 'string' ? blockState : JSON.stringify(blockState ?? '');
  const empty: ParsedBlockState = {
    blockXml: '',
    imageClasses: [],
    audioClasses: [],
    poseClasses: [],
    textClasses: [],
    datasetBytes: { image: 0, audio: 0, pose: 0 },
    spriteCount: 0,
    raw,
  };
  if (blockState == null || blockState === '') return empty;

  let state: Record<string, unknown> | null = null;
  try {
    const v = typeof blockState === 'string' ? (JSON.parse(blockState) as unknown) : blockState;
    if (typeof v === 'string') return { ...empty, blockXml: v };
    if (v && typeof v === 'object') state = v as Record<string, unknown>;
  } catch {
    // Legacy: plain Blockly XML, not JSON.
    return { ...empty, blockXml: typeof blockState === 'string' ? blockState : '' };
  }
  if (!state) return empty;

  const strings = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  const size = (v: unknown): number => (typeof v === 'string' ? v.length : 0);
  const text = state['aiTextData'] as
    | { classes?: { name: string; sentences: string[] }[] }
    | undefined;

  return {
    blockXml: typeof state['blockXml'] === 'string' ? state['blockXml'] : '',
    ...(typeof state['aiKind'] === 'string' ? { aiKind: state['aiKind'] } : {}),
    ...(typeof state['aiTab'] === 'string' ? { aiTab: state['aiTab'] } : {}),
    imageClasses: strings(state['aiClasses']),
    audioClasses: strings(state['aiAudioClasses']),
    poseClasses: strings(state['aiPoseClasses']),
    textClasses: Array.isArray(text?.classes) ? text.classes : [],
    datasetBytes: {
      image: size(state['aiDataset']),
      audio: size(state['aiAudioDataset']),
      pose: size(state['aiPoseDataset']),
    },
    spriteCount: Array.isArray(state['sprites']) ? state['sprites'].length : 0,
    raw,
  };
}
