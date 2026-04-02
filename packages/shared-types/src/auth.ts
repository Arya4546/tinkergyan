import type { BoardTarget, Cuid, IsoTimestampString, UserRole } from './common';
import type { Project, User } from './entities';

/** Credentials required to register a new account. */
export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

/** Credentials required to log in to an existing account. */
export interface LoginRequest {
  email: string;
  password: string;
}

/** Payload required to change the current password. */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/** JWT payload stored in access tokens. */
export interface AccessTokenPayload {
  userId: Cuid;
  email: string;
  role: UserRole;
}

/** User information returned after successful authentication. */
export type AuthenticatedUser = Pick<
  User,
  'id' | 'name' | 'email' | 'avatar' | 'xp' | 'level' | 'role'
>;

/** Standard auth response payload returned by register, login, and refresh. */
export interface AuthResponseData {
  user: AuthenticatedUser;
  accessToken: string;
}

/** Result returned by the current-user auth endpoint. */
export interface CurrentUserResponseData {
  user: User;
}

/** Refresh token session shape used by the auth layer. */
export interface RefreshSession {
  userId: Cuid;
  refreshTokenHash: string;
  lastSeen: IsoTimestampString;
}

/** Side effects created when a new user account is provisioned. */
export interface RegistrationSideEffects {
  starterProject: Project | null;
  defaultBoard: BoardTarget;
}
