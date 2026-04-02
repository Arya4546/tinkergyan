# 🏗️ Tinkergyan — Complete System Design

## Step-by-Step Robust Architecture Reference

> This document is the definitive technical system design for Tinkergyan. It covers every layer: infrastructure, API design, database, security, code execution, caching, real-time, scalability, and deployment.

---

## 📐 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTS                              │
│          Browser (React SPA)  |  Mobile (future)           │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTPS
┌────────────────────▼────────────────────────────────────────┐
│                   CDN / EDGE LAYER                          │
│              Cloudflare (static assets, DDoS)               │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│               LOAD BALANCER / REVERSE PROXY                 │
│                    Nginx / Traefik                           │
└──────┬─────────────────────────┬───────────────────────────┘
       │                         │
┌──────▼──────┐         ┌────────▼────────┐
│  WEB SERVER │         │   API SERVER    │
│  (Static /  │         │   (Node.js +    │
│   React SPA)│         │   Express)      │
└─────────────┘         └───┬─────────────┘
                             │
           ┌─────────────────┼──────────────────┐
           │                 │                  │
    ┌──────▼──────┐  ┌───────▼──────┐  ┌───────▼──────┐
    │ PostgreSQL  │  │    Redis     │  │   Docker     │
    │ (Primary   │  │  (Sessions + │  │  Sandbox     │
    │  Database) │  │   Job Queue) │  │  (Compiler)  │
    └─────────────┘  └──────────────┘  └──────────────┘
```

---

## 🔧 2. Technology Stack (Detailed)

### Frontend Stack

| Layer          | Technology            | Reason                       |
| -------------- | --------------------- | ---------------------------- |
| Framework      | React 18 + TypeScript | Component model, type safety |
| Build Tool     | Vite                  | Fast HMR, optimized builds   |
| Routing        | React Router v6       | Declarative routing          |
| State (global) | Zustand               | Lightweight, no boilerplate  |
| State (server) | TanStack Query v5     | Caching, sync, refetch       |
| Styling        | Tailwind CSS          | Utility-first, design tokens |
| Animations     | Framer Motion         | Declarative, performant      |
| Block Editor   | Google Blockly        | Industry standard            |
| Code Editor    | Monaco Editor         | VS Code engine               |
| HTTP Client    | Axios                 | Interceptors, cancel tokens  |
| Form Handling  | React Hook Form + Zod | Performant validation        |
| Icons          | Lucide React          | Consistent icon system       |

### Backend Stack

| Layer         | Technology             | Reason                        |
| ------------- | ---------------------- | ----------------------------- |
| Runtime       | Node.js 20 LTS         | V8, non-blocking I/O          |
| Framework     | Express 5              | Minimal, flexible             |
| Language      | TypeScript             | Type safety across stack      |
| ORM           | Prisma                 | Type-safe queries, migrations |
| Database      | PostgreSQL 15          | ACID, relations, JSON support |
| Cache / Queue | Redis 7                | Session cache, BullMQ jobs    |
| Job Queue     | BullMQ                 | Reliable async job processing |
| Validation    | Zod                    | Schema validation             |
| Auth          | JWT + httpOnly cookies | Stateless + secure            |
| Logging       | Pino                   | Fast structured logging       |

### Infrastructure

| Component            | Technology                     |
| -------------------- | ------------------------------ |
| Containerization     | Docker + Docker Compose        |
| Orchestration (prod) | Kubernetes or Render/Railway   |
| Code Sandbox         | Docker-in-Docker (isolated)    |
| Compiler             | Arduino CLI                    |
| CI/CD                | GitHub Actions                 |
| Monitoring           | Prometheus + Grafana (Phase 3) |
| Error Tracking       | Sentry                         |
| File Storage         | Cloudflare R2 / S3             |

---

## 🔌 3. API Design

### Base URL

```
https://api.Tinkergyan.io/api/v1
```

### Authentication Headers

```
Authorization: Bearer <JWT_TOKEN>
```

### Standard Response Envelope

```typescript
// Success
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "total": 50 }  // for lists
}

// Error
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Project not found",
    "details": []
  }
}
```

### Error Codes

| Code                 | HTTP Status | Meaning                        |
| -------------------- | ----------- | ------------------------------ |
| `VALIDATION_ERROR`   | 400         | Request body failed validation |
| `UNAUTHORIZED`       | 401         | Missing or invalid JWT         |
| `FORBIDDEN`          | 403         | Valid JWT but no permission    |
| `RESOURCE_NOT_FOUND` | 404         | Entity doesn't exist           |
| `CONFLICT`           | 409         | Duplicate (e.g. email taken)   |
| `RATE_LIMITED`       | 429         | Too many requests              |
| `COMPILE_TIMEOUT`    | 408         | Compilation exceeded 30s       |
| `INTERNAL_ERROR`     | 500         | Unexpected server error        |

---

### 3.1 Auth Endpoints

```
POST   /auth/register        → Create account
POST   /auth/login           → Login, receive JWT + set cookie
POST   /auth/logout          → Invalidate refresh token
POST   /auth/refresh         → Exchange refresh token for new JWT
GET    /auth/me              → Get current user
```

**POST /auth/register**

```typescript
// Request
{
  name: string,        // 2-50 chars
  email: string,       // valid email
  password: string,    // min 8 chars
}

// Response 201
{
  success: true,
  data: {
    user: { id, name, email, xp, level },
    accessToken: string
  }
}
// Side effects:
// - Sets refreshToken httpOnly cookie (30d)
// - Sends welcome email (queue job)
// - Creates default "My First Project" block project
```

**POST /auth/login**

```typescript
// Request
{ email: string, password: string }

// Response 200
{
  success: true,
  data: { user: {...}, accessToken: string }
}
// Side effects: Sets refreshToken cookie, logs login event
```

---

### 3.2 Course Endpoints

```
GET    /courses                    → List all published courses
GET    /courses/:slug              → Get course with modules + lessons
POST   /courses/:id/enroll         → Enroll current user
GET    /courses/:id/progress       → Get user's progress on this course
```

**GET /courses** Query params:

```
?difficulty=BEGINNER|INTERMEDIATE|ADVANCED
?search=string
?page=1&limit=12
```

---

### 3.3 Lesson Endpoints

```
GET    /lessons/:id                → Get lesson content
POST   /lessons/:id/complete       → Mark lesson as complete
GET    /lessons/:id/progress       → Get user's progress on lesson
```

**POST /lessons/:id/complete**

```typescript
// Response 200
{
  success: true,
  data: {
    xpEarned: 10,
    totalXp: 430,
    levelUp: false,         // true if level increased
    badgesEarned: [],        // any badges unlocked
    nextLesson: { id, title } | null
  }
}
```

---

### 3.4 Project Endpoints

```
GET    /projects                   → List user's projects
POST   /projects                   → Create project
GET    /projects/:id               → Get project
PUT    /projects/:id               → Update project (code/blocks)
DELETE /projects/:id               → Delete project
POST   /projects/:id/duplicate     → Duplicate project
PATCH  /projects/:id/visibility    → Toggle public/private
GET    /projects/public            → List public projects (gallery)
```

**POST /projects**

```typescript
// Request
{
  title: string,
  type: "BLOCK" | "CODE",
  boardTarget: string,   // "arduino:avr:uno"
  templateId?: string
}
```

**PUT /projects/:id**

```typescript
// Request (partial update, all optional)
{
  title?: string,
  code?: string,          // for CODE type
  blockState?: object,    // Blockly XML/JSON for BLOCK type
  boardTarget?: string
}
```

---

### 3.5 Compilation Endpoint

```
POST   /compile                    → Compile Arduino code
```

**POST /compile**

```typescript
// Request
{
  code: string,           // Arduino .ino code
  board: string,          // e.g. "arduino:avr:uno"
  projectId?: string      // optional, for rate limiting per project
}

// Response 200 (success)
{
  success: true,
  data: {
    output: string,        // Compiler stdout
    warnings: string[],
    compiledAt: string,
    durationMs: number
  }
}

// Response 400 (compile error)
{
  success: false,
  error: {
    code: "COMPILE_ERROR",
    message: "Compilation failed",
    details: [
      {
        line: 12,
        column: 5,
        message: "expected ';' before '}' token",
        type: "error" | "warning"
      }
    ]
  }
}
```

**Rate limits:**

- 10 compile requests per user per minute
- 30s timeout per compilation
- Max code size: 100KB

---

### 3.6 User Endpoints

```
GET    /users/me                   → Get current user profile
PATCH  /users/me                   → Update profile
PATCH  /users/me/password          → Change password
PATCH  /users/me/preferences       → Update editor/app preferences
GET    /users/me/badges            → Get earned badges
GET    /users/leaderboard          → Get XP leaderboard
```

---

## 🗄️ 4. Database Design (Complete Schema)

### Entity Relationship Overview

```
User ──< Enrollment >── Course ──< Module ──< Lesson ──< LessonProgress >── User
User ──< Project
User ──< UserBadge >── Badge
User ──< UserPreference
```

### Table: users

| Column         | Type         | Constraints                     |
| -------------- | ------------ | ------------------------------- |
| id             | CUID         | PK                              |
| name           | VARCHAR(100) | NOT NULL                        |
| email          | VARCHAR(255) | UNIQUE, NOT NULL                |
| password_hash  | VARCHAR(255) | NOT NULL                        |
| avatar         | VARCHAR(500) | NULLABLE                        |
| xp             | INTEGER      | DEFAULT 0                       |
| level          | SMALLINT     | DEFAULT 1                       |
| streak         | SMALLINT     | DEFAULT 0                       |
| last_active_at | TIMESTAMPTZ  | DEFAULT NOW()                   |
| role           | ENUM         | DEFAULT 'USER' ('USER','ADMIN') |
| created_at     | TIMESTAMPTZ  | DEFAULT NOW()                   |
| updated_at     | TIMESTAMPTZ  | AUTO                            |

**Indexes:** `email` (unique), `xp DESC` (leaderboard queries)

---

### Table: courses

| Column       | Type         | Constraints                    |
| ------------ | ------------ | ------------------------------ |
| id           | CUID         | PK                             |
| slug         | VARCHAR(200) | UNIQUE, NOT NULL               |
| title        | VARCHAR(255) | NOT NULL                       |
| description  | TEXT         |                                |
| thumbnail    | VARCHAR(500) |                                |
| difficulty   | ENUM         | BEGINNER/INTERMEDIATE/ADVANCED |
| is_published | BOOLEAN      | DEFAULT FALSE                  |
| order        | SMALLINT     | DEFAULT 0                      |
| created_at   | TIMESTAMPTZ  |                                |

---

### Table: modules

| Column    | Type         | Constraints                    |
| --------- | ------------ | ------------------------------ |
| id        | CUID         | PK                             |
| course_id | CUID         | FK → courses.id CASCADE DELETE |
| title     | VARCHAR(255) | NOT NULL                       |
| order     | SMALLINT     | NOT NULL                       |

**Indexes:** `(course_id, order)` composite

---

### Table: lessons

| Column       | Type         | Constraints                    |
| ------------ | ------------ | ------------------------------ |
| id           | CUID         | PK                             |
| module_id    | CUID         | FK → modules.id CASCADE DELETE |
| title        | VARCHAR(255) | NOT NULL                       |
| content      | TEXT         | MDX content                    |
| type         | ENUM         | READING/CODING/QUIZ            |
| starter_code | TEXT         | NULLABLE                       |
| order        | SMALLINT     | NOT NULL                       |
| xp_reward    | SMALLINT     | DEFAULT 10                     |

---

### Table: projects

| Column       | Type         | Constraints                  |
| ------------ | ------------ | ---------------------------- |
| id           | CUID         | PK                           |
| user_id      | CUID         | FK → users.id CASCADE DELETE |
| title        | VARCHAR(255) | NOT NULL                     |
| type         | ENUM         | BLOCK/CODE                   |
| code         | TEXT         | NULLABLE (C/C++ code)        |
| block_state  | JSONB        | NULLABLE (Blockly XML/JSON)  |
| board_target | VARCHAR(100) | DEFAULT 'arduino:avr:uno'    |
| is_public    | BOOLEAN      | DEFAULT FALSE                |
| fork_count   | INTEGER      | DEFAULT 0                    |
| forked_from  | CUID         | NULLABLE, FK → projects.id   |
| created_at   | TIMESTAMPTZ  |                              |
| updated_at   | TIMESTAMPTZ  |                              |

**Indexes:** `(user_id)`, `(is_public, created_at DESC)` for gallery

---

### Table: enrollments

| Column      | Type        | Constraints |
| ----------- | ----------- | ----------- |
| id          | CUID        | PK          |
| user_id     | CUID        | FK          |
| course_id   | CUID        | FK          |
| enrolled_at | TIMESTAMPTZ |             |

**Unique constraint:** `(user_id, course_id)`

---

### Table: lesson_progress

| Column       | Type        | Constraints   |
| ------------ | ----------- | ------------- |
| id           | CUID        | PK            |
| user_id      | CUID        | FK            |
| lesson_id    | CUID        | FK            |
| completed    | BOOLEAN     | DEFAULT FALSE |
| completed_at | TIMESTAMPTZ | NULLABLE      |

**Unique constraint:** `(user_id, lesson_id)`

---

### Table: badges

| Column       | Type                                                                  |
| ------------ | --------------------------------------------------------------------- |
| id           | CUID PK                                                               |
| slug         | VARCHAR UNIQUE                                                        |
| title        | VARCHAR                                                               |
| description  | TEXT                                                                  |
| icon         | VARCHAR (emoji or image URL)                                          |
| trigger_type | ENUM (MANUAL, FIRST_PROJECT, COURSE_COMPLETE, STREAK_7, XP_100, etc.) |

---

### Table: user_preferences

| Column           | Type         | Default         |
| ---------------- | ------------ | --------------- |
| user_id          | CUID PK (FK) |                 |
| theme            | ENUM         | SYSTEM          |
| editor_font_size | SMALLINT     | 14              |
| default_board    | VARCHAR      | arduino:avr:uno |
| auto_save        | BOOLEAN      | TRUE            |
| code_completion  | BOOLEAN      | TRUE            |

---

## ⚙️ 5. Code Execution Engine

### Architecture

```
API Server
    │
    ├── POST /api/compile
    │       │
    │       ▼
    │   Zod validation
    │   Rate limit check (Redis: 10/min per user)
    │   Code size check (< 100KB)
    │       │
    │       ▼
    │   BullMQ: Add to "compile" queue
    │       │
    │       ▼
    │   Worker picks up job
    │       │
    │       ▼
    │   Docker SDK: spawn container
    │       │
    │       ▼
    │   Container runs Arduino CLI
    │       │
    │       ▼
    │   Parse stdout/stderr
    │       │
    │       ▼
    │   Return structured result
    │       │
    └── Response to client
```

### Docker Sandbox Container

```dockerfile
# docker/sandbox/Dockerfile
FROM ubuntu:22.04

RUN apt-get update && apt-get install -y curl python3 ca-certificates

# Install Arduino CLI
RUN curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | sh
ENV PATH="/root/bin:$PATH"

# Install boards
RUN arduino-cli core update-index
RUN arduino-cli core install arduino:avr
RUN arduino-cli core install esp8266:esp8266
RUN arduino-cli core install esp32:esp32

# Create workspace
RUN mkdir -p /workspace
WORKDIR /workspace

# Copy run script
COPY run.sh /run.sh
RUN chmod +x /run.sh

ENTRYPOINT ["/run.sh"]
```

```bash
# docker/sandbox/run.sh
#!/bin/bash
set -e

CODE_FILE="/workspace/sketch/sketch.ino"
BOARD="${BOARD:-arduino:avr:uno}"

mkdir -p /workspace/sketch
echo "$ARDUINO_CODE" > "$CODE_FILE"

timeout 30 arduino-cli compile \
  --fqbn "$BOARD" \
  /workspace/sketch \
  2>&1

EXIT_CODE=$?
exit $EXIT_CODE
```

### Worker Service

```typescript
// apps/api/src/workers/compile.worker.ts
import { Worker } from 'bullmq';
import Docker from 'dockerode';

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

const worker = new Worker(
  'compile',
  async (job) => {
    const { code, board, userId } = job.data;

    const container = await docker.createContainer({
      Image: 'Tinkergyan-sandbox:latest',
      Env: [`ARDUINO_CODE=${code}`, `BOARD=${board}`],
      HostConfig: {
        Memory: 256 * 1024 * 1024, // 256MB RAM limit
        CpuPeriod: 100000,
        CpuQuota: 50000, // 50% CPU limit
        NetworkMode: 'none', // No network access
        ReadonlyRootfs: true,
        Tmpfs: { '/workspace': 'rw,size=50m' }, // 50MB writable temp
        AutoRemove: true,
      },
    });

    await container.start();

    const timeout = setTimeout(async () => {
      await container.kill();
    }, 30000);

    const output = await container.wait();
    clearTimeout(timeout);

    const logs = await container.logs({ stdout: true, stderr: true });

    return {
      exitCode: output.StatusCode,
      output: logs.toString(),
      durationMs: Date.now() - job.timestamp,
    };
  },
  {
    connection: redisConnection,
    concurrency: 5, // Max 5 concurrent compilations
  },
);
```

### Security Constraints (Sandbox)

| Constraint        | Value                     |
| ----------------- | ------------------------- |
| Memory limit      | 256MB                     |
| CPU limit         | 50% of 1 core             |
| Execution timeout | 30 seconds                |
| Network access    | None (isolated)           |
| Filesystem        | Read-only root, 50MB /tmp |
| Container user    | Non-root                  |
| Auto-remove       | Yes (after execution)     |
| Max code size     | 100KB                     |

---

## 🔐 6. Authentication & Security

### JWT Strategy

```
Access Token:
- Expires: 15 minutes
- Stored: Memory (Zustand store)
- Contains: { userId, email, role }

Refresh Token:
- Expires: 30 days
- Stored: httpOnly cookie (SameSite=Strict, Secure)
- Hashed in DB: SHA-256(token)
```

### Token Refresh Flow

```
1. Client makes API call with expired JWT
2. API returns 401
3. Axios interceptor catches 401
4. Interceptor calls POST /auth/refresh (sends cookie automatically)
5. Server validates refresh token hash in DB
6. Server returns new access token
7. Interceptor retries original request with new token
8. If refresh fails → logout user
```

### Password Security

```
Algorithm: bcrypt
Rounds: 12
Validation: min 8 chars, 1 uppercase, 1 number
Change flow: Requires current password
Reset flow: Email OTP (Phase 2)
```

### Rate Limiting

| Endpoint            | Limit                       |
| ------------------- | --------------------------- |
| POST /auth/login    | 5 requests / 15 min per IP  |
| POST /auth/register | 3 requests / hour per IP    |
| POST /compile       | 10 requests / min per user  |
| All API endpoints   | 100 requests / min per user |

Implementation: `express-rate-limit` + Redis store

### Input Sanitization

- All inputs validated via Zod schemas at route entry
- SQL injection: prevented by Prisma parameterized queries
- XSS: React escapes output by default; MDX content sanitized server-side
- File uploads: MIME type + magic bytes validation, size limits

---

## ⚡ 7. Caching Strategy

### Redis Cache Layers

```
Layer 1 — Session / Auth:
  Key: session:{userId}
  Value: { refreshTokenHash, lastSeen }
  TTL: 30 days

Layer 2 — Course Data (rarely changes):
  Key: course:{slug}
  Value: Full course JSON with modules/lessons
  TTL: 1 hour
  Invalidate on: Admin updates course

Layer 3 — Leaderboard:
  Key: leaderboard:weekly | leaderboard:alltime
  Value: Sorted user list
  TTL: 5 minutes
  Update: Background job every 5 min

Layer 4 — Compile Queue Rate Limit:
  Key: ratelimit:compile:{userId}
  Value: Request count
  TTL: 60 seconds
```

### TanStack Query (Client-side)

```typescript
// Stale times
const STALE_TIMES = {
  courses: 1000 * 60 * 5, // 5 minutes
  lessonContent: 1000 * 60 * 10, // 10 minutes
  userProfile: 1000 * 60 * 2, // 2 minutes
  projects: 1000 * 30, // 30 seconds
  leaderboard: 1000 * 60 * 5, // 5 minutes
};
```

---

## 🔄 8. State Management Architecture

### Zustand Stores

```typescript
// Auth Store
interface AuthStore {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (credentials) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

// Editor Store
interface EditorStore {
  project: Project | null;
  blockState: BlockState | null;
  code: string;
  isDirty: boolean;
  isSaving: boolean;
  isCompiling: boolean;
  compileOutput: CompileResult | null;
  setCode: (code: string) => void;
  setBlockState: (state: BlockState) => void;
  saveProject: () => Promise<void>;
  compileCode: () => Promise<void>;
}

// UI Store
interface UIStore {
  theme: 'light' | 'dark' | 'system';
  sidebarCollapsed: boolean;
  editorPanelVisible: boolean;
  activeModal: string | null;
  notifications: Toast[];
  setTheme: (theme) => void;
  addToast: (toast) => void;
  removeToast: (id) => void;
  openModal: (id) => void;
  closeModal: () => void;
}
```

### Data Flow Patterns

```
User Action
    │
    ▼
Component Event Handler
    │
    ├── Zustand action (local UI state)
    │       │
    │       ▼
    │   Immediate optimistic UI update
    │
    └── TanStack Query mutation (server sync)
            │
            ├── Success: Invalidate related queries
            │
            └── Error: Rollback optimistic update + toast
```

---

## 📡 9. Real-time & Async

### Compile Progress (Phase 2)

For long compilations, use Server-Sent Events:

```typescript
// SSE endpoint
GET /compile/:jobId/stream

// Client receives:
event: status
data: { status: "queued", position: 3 }

event: status
data: { status: "compiling", progress: 45 }

event: complete
data: { exitCode: 0, output: "...", durationMs: 4200 }
```

### Auto-save

```typescript
// Debounced auto-save in editor
const debouncedSave = useDebouncedCallback(
  async () => {
    await editorStore.saveProject();
  },
  30000, // 30s debounce
);

// Trigger on any change
useEffect(() => {
  if (editorStore.isDirty) debouncedSave();
}, [editorStore.code, editorStore.blockState]);
```

---

## 🚀 10. Deployment Architecture

### Production Infrastructure

```
Internet
    │
Cloudflare (CDN + DDoS + SSL termination)
    │
┌───▼────────────────────────────────────┐
│         VPS / Cloud Provider           │
│                                        │
│  Nginx (reverse proxy)                 │
│    ├── /          → React SPA (static) │
│    └── /api       → API Server         │
│                                        │
│  API Server (Node.js, PM2 cluster)     │
│    └── 4 workers (PM2 cluster mode)    │
│                                        │
│  PostgreSQL (managed or self-hosted)   │
│  Redis (managed or self-hosted)        │
│  Docker daemon (for sandboxes)         │
└────────────────────────────────────────┘
```

### Environment Variables (Production)

```bash
# API Server
NODE_ENV=production
DATABASE_URL=postgresql://...  # managed DB connection string
REDIS_URL=redis://...
JWT_SECRET=<256-bit-random>
FRONTEND_URL=https://Tinkergyan.io
DOCKER_SOCKET=/var/run/docker.sock
SENTRY_DSN=https://...
COMPILE_CONCURRENCY=10
MAX_COMPILE_TIMEOUT=30000

# Optional (Phase 3)
S3_BUCKET=Tinkergyan-assets
S3_REGION=us-east-1
SMTP_HOST=...   # for emails
```

### CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo type-check lint test

  deploy-api:
    needs: test
    steps:
      - run: docker build -t Tinkergyan-api ./apps/api
      - run: docker push registry/Tinkergyan-api:${{ github.sha }}
      - run: ssh deploy@server "docker pull && docker-compose up -d api"

  deploy-web:
    needs: test
    steps:
      - run: pnpm turbo build --filter=web
      - run: rsync ./apps/web/dist/ server:/var/www/Tinkergyan/
```

---

## 📊 11. Monitoring & Observability

### Logging (Pino)

```typescript
// Structured log format
{
  "level": "info",
  "time": "2026-01-15T10:30:00.000Z",
  "service": "api",
  "method": "POST",
  "path": "/api/compile",
  "userId": "clx123...",
  "durationMs": 4200,
  "statusCode": 200
}
```

### Key Metrics to Track

| Metric                   | Alert Threshold |
| ------------------------ | --------------- |
| API p95 response time    | > 500ms         |
| Compile queue depth      | > 20 jobs       |
| Compile failure rate     | > 20%           |
| Database connection pool | > 80% used      |
| Redis memory usage       | > 80%           |
| Docker container count   | > 50 running    |
| 5xx error rate           | > 1%            |

### Health Check Endpoint

```typescript
GET /api/health

// Response
{
  "status": "ok",
  "version": "1.2.0",
  "services": {
    "database": "ok",
    "redis": "ok",
    "docker": "ok"
  },
  "uptime": 86400
}
```

---

## 🔮 12. Scalability Path

### Phase 1–2 (< 1,000 users)

- Single VPS (4 CPU, 8GB RAM)
- PostgreSQL on same server
- Redis on same server
- Docker on same server

### Phase 3 (1,000–10,000 users)

- Separate DB server (managed: Supabase/Neon)
- Separate Redis (managed: Upstash)
- Horizontal API scaling (2+ instances behind load balancer)
- Compile workers on dedicated server
- CDN for all static assets

### Phase 4 (10,000+ users)

- Kubernetes cluster
- Read replicas for PostgreSQL
- Redis Cluster
- Compile worker autoscaling (Kubernetes HPA)
- Global CDN with edge caching

---

## 🧪 13. Testing Strategy

### Test Pyramid

```
Unit Tests (70%)        → Services, utilities, validators
Integration Tests (20%) → API routes with test DB
E2E Tests (10%)         → Critical user flows (Playwright)
```

### Critical Test Cases

| Feature       | Test                                                  |
| ------------- | ----------------------------------------------------- |
| Auth          | Register, login, refresh, logout, invalid credentials |
| Projects      | CRUD, ownership check, public/private                 |
| Compiler      | Valid code compiles, syntax error returns line number |
| LMS           | Enroll, complete lesson, XP awarded, badge triggered  |
| Rate limiting | Compile limit enforced per user                       |

### Test Database Strategy

```bash
# Separate test database
DATABASE_URL=postgresql://Tinkergyan:dev@localhost:5432/Tinkergyan_test

# Reset before each test suite
beforeAll(async () => {
  await prisma.$executeRaw`TRUNCATE TABLE users CASCADE`;
  await seed();
});
```

---

_Document Version: 1.0 | This is the authoritative system design. Update when architecture decisions change._
