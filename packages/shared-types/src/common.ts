/** Shared string shape for timestamp values returned by the API. */
export type IsoTimestampString = string;

/** Shared string shape for database-backed CUID identifiers. */
export type Cuid = string;

/** Supported application themes. */
export type AppTheme = 'light' | 'dark' | 'system';

/** Supported user roles. */
export type UserRole = 'USER' | 'ADMIN';

/** Difficulty levels for course content. */
export type Difficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

/** Supported lesson types. */
export type LessonType = 'READING' | 'CODING' | 'QUIZ';

/** Supported project editing modes. */
export type ProjectType = 'BLOCK' | 'CODE';

/** Known badge triggers defined by the product docs. */
export type BadgeTriggerType =
  | 'MANUAL'
  | 'FIRST_PROJECT'
  | 'FIRST_COMPILE'
  | 'COURSE_COMPLETE'
  | 'STREAK_7'
  | 'XP_100';

/** Known hardware board targets supported in the early phases. */
export type KnownBoardTarget =
  | 'arduino:avr:uno'
  | 'arduino:avr:nano'
  | 'esp8266:esp8266:generic'
  | 'esp32:esp32:esp32';

/** Allows known board targets while leaving room for future boards. */
export type BoardTarget = KnownBoardTarget | (string & {});

/** Serializable Blockly state stored for block-based projects. */
export type BlocklyState = Record<string, unknown>;

/** Shared compile outcomes surfaced in the editor console and history. */
export type CompileOutcome = 'IDLE' | 'COMPILING' | 'SUCCESS' | 'ERROR' | 'WARNING' | 'TIMEOUT';
