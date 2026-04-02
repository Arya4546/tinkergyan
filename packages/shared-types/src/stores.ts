import type { AppTheme, BlocklyState } from './common';
import type { LoginRequest } from './auth';
import type { CompileResult } from './compile';
import type { Project, User } from './entities';
import type { ModalId, ToastNotification } from './ui';

/** State slice for authentication data. */
export interface AuthStoreState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
}

/** Actions exposed by the auth store. */
export interface AuthStoreActions {
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

/** Combined auth store contract from the system design document. */
export type AuthStore = AuthStoreState & AuthStoreActions;

/** State slice for the editor workspace. */
export interface EditorStoreState {
  project: Project | null;
  blockState: BlocklyState | null;
  code: string;
  isDirty: boolean;
  isSaving: boolean;
  isCompiling: boolean;
  compileOutput: CompileResult | null;
}

/** Actions exposed by the editor store. */
export interface EditorStoreActions {
  setCode: (code: string) => void;
  setBlockState: (state: BlocklyState) => void;
  saveProject: () => Promise<void>;
  compileCode: () => Promise<void>;
}

/** Combined editor store contract from the system design document. */
export type EditorStore = EditorStoreState & EditorStoreActions;

/** State slice for app-wide UI controls. */
export interface UiStoreState {
  theme: AppTheme;
  sidebarCollapsed: boolean;
  editorPanelVisible: boolean;
  activeModal: ModalId | null;
  notifications: ToastNotification[];
}

/** Actions exposed by the UI store. */
export interface UiStoreActions {
  setTheme: (theme: AppTheme) => void;
  addToast: (toast: ToastNotification) => void;
  removeToast: (id: string) => void;
  openModal: (id: ModalId) => void;
  closeModal: () => void;
}

/** Combined UI store contract from the system design document. */
export type UiStore = UiStoreState & UiStoreActions;
