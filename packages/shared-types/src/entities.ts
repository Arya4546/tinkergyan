import type {
  AppTheme,
  BadgeTriggerType,
  BlocklyState,
  BoardTarget,
  Cuid,
  Difficulty,
  IsoTimestampString,
  LessonType,
  ProjectType,
  UserRole,
} from './common';

/** Minimal user shape shared across auth, profile, and leaderboard flows. */
export interface User {
  id: Cuid;
  name: string;
  email: string;
  avatar: string | null;
  xp: number;
  level: number;
  streak: number;
  role: UserRole;
  lastActiveAt: IsoTimestampString;
  createdAt: IsoTimestampString;
  updatedAt: IsoTimestampString;
}

/** Full user preferences persisted for the current account. */
export interface UserPreferences {
  userId: Cuid;
  theme: AppTheme;
  editorFontSize: 12 | 14 | 16 | 18;
  defaultBoard: BoardTarget;
  autoSave: boolean;
  codeCompletion: boolean;
  emailNotifications?: boolean;
}

/** Badge definition shown in the profile gallery and award toasts. */
export interface Badge {
  id: Cuid;
  slug: string;
  title: string;
  description: string;
  icon: string;
  triggerType: BadgeTriggerType;
}

/** A badge earned by a user. */
export interface UserBadge {
  id: Cuid;
  userId: Cuid;
  badgeId: Cuid;
  earnedAt: IsoTimestampString;
  badge?: Badge;
}

/** Lightweight lesson progress record for progress indicators. */
export interface LessonProgress {
  id: Cuid;
  userId: Cuid;
  lessonId: Cuid;
  completed: boolean;
  completedAt: IsoTimestampString | null;
}

/** Shared course lesson shape used by course detail and lesson pages. */
export interface Lesson {
  id: Cuid;
  moduleId: Cuid;
  title: string;
  content: string;
  type: LessonType;
  starterCode: string | null;
  order: number;
  xpReward: number;
  progress?: LessonProgress | null;
}

/** Shared course module shape used by course detail pages. */
export interface CourseModule {
  id: Cuid;
  courseId: Cuid;
  title: string;
  order: number;
  lessons: Lesson[];
}

/** Shared course entity used throughout the LMS experience. */
export interface Course {
  id: Cuid;
  slug: string;
  title: string;
  description: string;
  thumbnail: string | null;
  difficulty: Difficulty;
  isPublished: boolean;
  order: number;
  createdAt: IsoTimestampString;
  modules?: CourseModule[];
}

/** Enrollment record linking a user to a course. */
export interface Enrollment {
  id: Cuid;
  userId: Cuid;
  courseId: Cuid;
  enrolledAt: IsoTimestampString;
  course?: Course;
}

/** Progress summary for a single course. */
export interface CourseProgress {
  courseId: Cuid;
  completedLessons: number;
  totalLessons: number;
  percentComplete: number;
  lastLessonId: Cuid | null;
}

/** Shared project entity used by the dashboard, editor, and projects pages. */
export interface Project {
  id: Cuid;
  userId: Cuid;
  title: string;
  type: ProjectType;
  code: string | null;
  blockState: BlocklyState | null;
  boardTarget: BoardTarget;
  isPublic: boolean;
  forkCount: number;
  forkedFrom: Cuid | null;
  createdAt: IsoTimestampString;
  updatedAt: IsoTimestampString;
}

/** Optional starter template for new projects. */
export interface ProjectTemplate {
  id: Cuid;
  title: string;
  description: string;
  type: ProjectType;
  boardTarget: BoardTarget;
  code: string | null;
  blockState: BlocklyState | null;
}

/** Leaderboard row returned by the public leaderboard endpoint. */
export interface LeaderboardEntry {
  rank: number;
  userId: Cuid;
  name: string;
  avatar: string | null;
  xp: number;
  level: number;
  streak: number;
}

/** Aggregate profile data shown on the user profile page. */
export interface UserProfile {
  user: User;
  preferences: UserPreferences;
  badges: UserBadge[];
  stats: {
    projectsCreated: number;
    lessonsCompleted: number;
    badgesEarned: number;
  };
}
