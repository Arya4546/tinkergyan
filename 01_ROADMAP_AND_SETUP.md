# 🚀 Tinkergyan — Embedded Coding Platform

## Enhanced Product Roadmap, Project Setup & Master Prompt

> **Platform Vision:** A world-class, child-friendly embedded systems learning platform combining visual block coding, real Arduino/ESP development, structured LMS, and project-based exploration — built for scale, designed for delight.

---

## 🧠 Master Prompt (For AI-Assisted Development)

Use this prompt whenever working with AI tools (Claude, ChatGPT, Copilot) to build this platform:

```
You are a senior full-stack engineer and UX architect building "Tinkergyan" — a
modern embedded systems learning platform for kids and beginners (ages 10–18).

PLATFORM CONTEXT:
- Combines: Visual block coding (Blockly) + Real code editor (Monaco) + LMS + Project Playground
- Hardware targets: Arduino (MVP), ESP8266/ESP32 (Phase 2), more in future
- Inspired by: Scratch (UX simplicity), Wokwi (dev cleanliness), WitPro (block editor), Duolingo (engagement)
- Competitors: witpro.witblox.com, app.cretile.com — build a BETTER combined version

TECH STACK:
- Frontend: React 18 + TypeScript + Tailwind CSS + Zustand + React Router v6
- Backend: Node.js + Express + PostgreSQL + Prisma ORM
- Execution: Docker sandbox + Arduino CLI
- Animations: Framer Motion
- Block editor: Google Blockly
- Code editor: Monaco Editor

DESIGN RULES (STRICT):
- ❌ No boring SaaS dashboards
- ❌ No generic card grids
- ❌ No overengineered UI
- ✅ Canvas-first layout (editor dominates screen)
- ✅ Soft rounded corners, friendly but not cartoonish
- ✅ Primary color: #6C63FF (electric purple)
- ✅ Accent: #00D4A8 (teal-green)
- ✅ Background: #F7F8FC (off-white) / #1A1B2E (dark mode)
- ✅ Micro-interactions on every interactive element
- ✅ Mobile-aware (tablet minimum)

CURRENT PHASE: [INSERT PHASE]
CURRENT TASK: [INSERT TASK]

Build with clean architecture. Write production-quality code. Add JSDoc comments.
Follow component-first design. Make it feel alive, not static.
```

---

## 📌 Platform Overview

**Tinkergyan** is a full-stack embedded systems education platform that lets users:

| Feature          | Description                                               |
| ---------------- | --------------------------------------------------------- |
| 🧱 Block Coding  | Drag-and-drop Blockly editor with Arduino code generation |
| 💻 Code Editor   | Monaco-powered C/C++ editor with syntax highlighting      |
| ⚙️ Compile & Run | Docker + Arduino CLI execution engine                     |
| 📚 LMS           | Structured courses → modules → lessons → tasks            |
| 🧪 Playground    | Free project space with templates and saves               |
| 👤 User System   | Auth, progress tracking, saved work                       |

---

## 🎨 Design System

### Color Palette

| Token            | Value     | Use                                |
| ---------------- | --------- | ---------------------------------- |
| `--primary`      | `#6C63FF` | Buttons, active states, highlights |
| `--accent`       | `#00D4A8` | Success, run button, achievements  |
| `--warning`      | `#FFB347` | Warnings, pending states           |
| `--error`        | `#FF6B6B` | Errors, compile failures           |
| `--bg-light`     | `#F7F8FC` | Light mode background              |
| `--bg-dark`      | `#1A1B2E` | Dark mode background               |
| `--surface`      | `#FFFFFF` | Cards, panels                      |
| `--text-primary` | `#1A1B2E` | Main text                          |
| `--text-muted`   | `#9094A6` | Secondary text                     |

### Typography

```
Font: Inter (primary), JetBrains Mono (code)
Headings: Inter 700–900
Body: Inter 400–500
Code: JetBrains Mono 400
```

### Spacing Scale

```
xs: 4px | sm: 8px | md: 16px | lg: 24px | xl: 32px | 2xl: 48px | 3xl: 64px
```

### Border Radius

```
sm: 8px | md: 12px | lg: 16px | xl: 24px | full: 9999px
```

---

## 🧭 Enhanced Development Phases

---

### 🔵 Phase 0 — Foundation (Week 1–2)

**Goal:** Project scaffold, design system, auth skeleton

#### Deliverables:

- Monorepo setup (frontend + backend + shared types)
- Design system tokens in Tailwind config
- Authentication (JWT + refresh tokens)
- Database schema (Prisma migrations)
- CI/CD pipeline (GitHub Actions)
- Docker Compose for local dev

#### Exit Criteria:

- User can register, login, logout
- Design tokens consistent across components
- Database running locally via Docker

---

### 🟢 Phase 1 — MVP Core (Week 3–8)

**Goal:** Working learning + block coding platform

#### 1.1 Block Editor

- [ ] Blockly workspace integration
- [ ] Custom Arduino block category (Digital, Analog, Control, Serial)
- [ ] Real-time code generation panel
- [ ] Block toolbox with categories
- [ ] Save/load workspace state (XML)
- [ ] Undo/redo support

#### 1.2 LMS System

- [ ] Course listing page
- [ ] Lesson viewer with MDX content
- [ ] Embedded coding playground inside lessons
- [ ] Progress tracking (per lesson completion)
- [ ] Course enrollment system

#### 1.3 Project Playground

- [ ] Create new project (block or code type)
- [ ] Auto-save (debounced, every 30s)
- [ ] Project list / dashboard
- [ ] Starter templates (Blink LED, Button, Serial Print)
- [ ] Project rename/delete

#### 1.4 User Dashboard

- [ ] Profile page
- [ ] Progress overview
- [ ] Recent projects
- [ ] Enrolled courses

#### Exit Criteria:

- User can enroll in a course, complete a lesson, create a block project, save it

---

### 🟡 Phase 2 — Code Engine (Week 9–14)

**Goal:** Real compilation and advanced editor

#### 2.1 Monaco Code Editor

- [ ] C/C++ syntax highlighting
- [ ] Intellisense (basic Arduino APIs)
- [ ] Error highlighting (inline)
- [ ] Editor themes (light/dark)
- [ ] Font size controls

#### 2.2 Code Execution Engine

- [ ] Docker sandbox setup
- [ ] Arduino CLI integration
- [ ] REST API: `/api/compile` endpoint
- [ ] Compilation output parsing
- [ ] Error line mapping back to editor
- [ ] Serial output simulation (mock)
- [ ] Timeout handling (30s max)
- [ ] Rate limiting per user

#### 2.3 ESP Support (Basic)

- [ ] ESP8266 board support in compiler
- [ ] WiFi block category (connect, send, receive)
- [ ] ESP-specific project templates

#### Exit Criteria:

- User can write code, compile it, see output/errors in real-time

---

### 🟠 Phase 3 — Platform Growth (Week 15–22)

**Goal:** Community, engagement, and content scale

#### 3.1 Project Gallery

- [ ] Public project sharing toggle
- [ ] Browse community projects
- [ ] Fork/remix a project
- [ ] Like / bookmark projects

#### 3.2 Gamification

- [ ] XP points system
- [ ] Badges (First Project, Course Completed, etc.)
- [ ] Leaderboard (weekly/all-time)
- [ ] Streak tracking (daily learning)
- [ ] Level progression (Beginner → Maker → Engineer)

#### 3.3 Challenges

- [ ] Weekly coding challenges
- [ ] Challenge submissions
- [ ] Automated judging (compile + output check)
- [ ] Prize badges

#### 3.4 Content Tools (Admin)

- [ ] Course builder (admin panel)
- [ ] Lesson MDX editor
- [ ] Block definition editor

---

### 🔴 Phase 4 — Advanced Platform (Month 6+)

**Goal:** Hardware simulation and IoT

#### 4.1 Circuit Simulator

- [ ] Basic component library (LED, button, resistor)
- [ ] Visual breadboard
- [ ] Code ↔ simulation sync
- [ ] Wokwi-style interaction

#### 4.2 IoT Dashboard

- [ ] MQTT integration
- [ ] Real-time sensor data charts
- [ ] Device management

#### 4.3 Real Device Sync

- [ ] USB serial connection (Web Serial API)
- [ ] Flash code to real Arduino from browser
- [ ] Serial monitor (live)

---

## 🏗️ Project Setup Guide

### Prerequisites

```bash
Node.js >= 20.x
Docker >= 24.x
PostgreSQL >= 15.x (via Docker)
Git
pnpm >= 8.x (recommended over npm)
```

### Repository Structure

```
Tinkergyan/
├── apps/
│   ├── web/                    # React frontend
│   │   ├── src/
│   │   │   ├── components/     # Reusable UI components
│   │   │   │   ├── ui/         # Base design system (Button, Input, etc.)
│   │   │   │   ├── editor/     # Block + Code editor components
│   │   │   │   ├── lms/        # Course, Lesson components
│   │   │   │   └── layout/     # Shell, Sidebar, Navbar
│   │   │   ├── pages/          # Route-level pages
│   │   │   ├── stores/         # Zustand state stores
│   │   │   ├── hooks/          # Custom React hooks
│   │   │   ├── services/       # API call functions
│   │   │   ├── types/          # TypeScript interfaces
│   │   │   └── utils/          # Helper functions
│   │   ├── public/
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── tailwind.config.ts
│   │
│   └── api/                    # Express backend
│       ├── src/
│       │   ├── routes/         # Express routers
│       │   ├── controllers/    # Request handlers
│       │   ├── services/       # Business logic
│       │   ├── middleware/     # Auth, rate limit, error
│       │   ├── lib/            # Prisma client, Docker SDK
│       │   └── types/          # Shared types
│       ├── prisma/
│       │   ├── schema.prisma
│       │   └── migrations/
│       └── Dockerfile
│
├── packages/
│   ├── shared-types/           # Shared TS types (frontend + backend)
│   └── eslint-config/          # Shared ESLint config
│
├── docker/
│   ├── docker-compose.yml      # Local dev environment
│   ├── docker-compose.prod.yml
│   └── sandbox/                # Code execution sandbox image
│       ├── Dockerfile
│       └── run.sh
│
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
│
├── pnpm-workspace.yaml
├── turbo.json                  # Turborepo config
└── README.md
```

### Step-by-Step Setup

#### Step 1: Initialize Monorepo

```bash
mkdir Tinkergyan && cd Tinkergyan
pnpm init
pnpm add -g turbo

# Initialize Turborepo
npx create-turbo@latest . --package-manager pnpm
```

#### Step 2: Setup Frontend (React + Vite)

```bash
cd apps
pnpm create vite web --template react-ts
cd web

# Install dependencies
pnpm add react-router-dom@6 zustand @tanstack/react-query axios
pnpm add framer-motion react-icons
pnpm add -D tailwindcss postcss autoprefixer @types/node

# Editor dependencies
pnpm add @monaco-editor/react
pnpm add blockly

# Initialize Tailwind
npx tailwindcss init -p
```

#### Step 3: Tailwind Config

```typescript
// apps/web/tailwind.config.ts
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6C63FF',
          50: '#F0EFFE',
          100: '#E1DEFE',
          500: '#6C63FF',
          600: '#5650D9',
          700: '#403DB3',
        },
        accent: {
          DEFAULT: '#00D4A8',
          500: '#00D4A8',
          600: '#00B891',
        },
        surface: '#FFFFFF',
        background: '#F7F8FC',
        dark: {
          bg: '#1A1B2E',
          surface: '#252640',
          border: '#2E3055',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'bounce-subtle': 'bounceSubtle 0.4s ease-out',
      },
    },
  },
  plugins: [],
} satisfies Config;
```

#### Step 4: Setup Backend (Express + Prisma)

```bash
cd ../api
pnpm init
pnpm add express @types/express typescript ts-node-dev
pnpm add @prisma/client jsonwebtoken bcryptjs zod express-rate-limit
pnpm add -D prisma @types/jsonwebtoken @types/bcryptjs

# Initialize Prisma
npx prisma init
```

#### Step 5: Prisma Schema

```prisma
// apps/api/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  name          String
  email         String    @unique
  passwordHash  String
  avatar        String?
  xp            Int       @default(0)
  level         Int       @default(1)
  streak        Int       @default(0)
  lastActiveAt  DateTime  @default(now())
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  projects      Project[]
  enrollments   Enrollment[]
  lessonProgress LessonProgress[]
  badges        UserBadge[]

  @@map("users")
}

model Course {
  id          String    @id @default(cuid())
  slug        String    @unique
  title       String
  description String
  thumbnail   String?
  difficulty  Difficulty @default(BEGINNER)
  isPublished Boolean   @default(false)
  order       Int       @default(0)
  createdAt   DateTime  @default(now())

  modules     Module[]
  enrollments Enrollment[]

  @@map("courses")
}

model Module {
  id       String   @id @default(cuid())
  courseId String
  title    String
  order    Int
  course   Course   @relation(fields: [courseId], references: [id])
  lessons  Lesson[]

  @@map("modules")
}

model Lesson {
  id          String   @id @default(cuid())
  moduleId    String
  title       String
  content     String   @db.Text
  type        LessonType @default(READING)
  starterCode String?  @db.Text
  order       Int
  xpReward    Int      @default(10)
  module      Module   @relation(fields: [moduleId], references: [id])
  progress    LessonProgress[]

  @@map("lessons")
}

model Project {
  id          String      @id @default(cuid())
  userId      String
  title       String
  type        ProjectType @default(BLOCK)
  code        String?     @db.Text
  blockState  Json?
  boardTarget String      @default("arduino:avr:uno")
  isPublic    Boolean     @default(false)
  forks       Int         @default(0)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  user        User        @relation(fields: [userId], references: [id])

  @@map("projects")
}

model Enrollment {
  id         String   @id @default(cuid())
  userId     String
  courseId   String
  enrolledAt DateTime @default(now())
  user       User     @relation(fields: [userId], references: [id])
  course     Course   @relation(fields: [courseId], references: [id])

  @@unique([userId, courseId])
  @@map("enrollments")
}

model LessonProgress {
  id          String   @id @default(cuid())
  userId      String
  lessonId    String
  completed   Boolean  @default(false)
  completedAt DateTime?
  user        User     @relation(fields: [userId], references: [id])
  lesson      Lesson   @relation(fields: [lessonId], references: [id])

  @@unique([userId, lessonId])
  @@map("lesson_progress")
}

model Badge {
  id          String      @id @default(cuid())
  slug        String      @unique
  title       String
  description String
  icon        String
  userBadges  UserBadge[]

  @@map("badges")
}

model UserBadge {
  id        String   @id @default(cuid())
  userId    String
  badgeId   String
  earnedAt  DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
  badge     Badge    @relation(fields: [badgeId], references: [id])

  @@unique([userId, badgeId])
  @@map("user_badges")
}

enum Difficulty {
  BEGINNER
  INTERMEDIATE
  ADVANCED
}

enum LessonType {
  READING
  CODING
  QUIZ
}

enum ProjectType {
  BLOCK
  CODE
}
```

#### Step 6: Docker Compose (Local Dev)

```yaml
# docker/docker-compose.yml
version: '3.9'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: Tinkergyan
      POSTGRES_USER: Tinkergyan
      POSTGRES_PASSWORD: Tinkergyan_dev
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'

  api:
    build:
      context: ../apps/api
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgresql://Tinkergyan:Tinkergyan_dev@postgres:5432/Tinkergyan
      REDIS_URL: redis://redis:6379
      JWT_SECRET: dev_secret_change_in_prod
      PORT: 3001
    ports:
      - '3001:3001'
    depends_on:
      - postgres
      - redis
    volumes:
      - ../apps/api:/app
      - /app/node_modules

  web:
    build:
      context: ../apps/web
    environment:
      VITE_API_URL: http://localhost:3001
    ports:
      - '5173:5173'
    volumes:
      - ../apps/web:/app
      - /app/node_modules

volumes:
  postgres_data:
```

#### Step 7: Environment Variables

```bash
# apps/api/.env
DATABASE_URL="postgresql://Tinkergyan:Tinkergyan_dev@localhost:5432/Tinkergyan"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="7d"
REFRESH_TOKEN_EXPIRES_IN="30d"
PORT=3001
NODE_ENV=development
DOCKER_SOCKET="/var/run/docker.sock"
MAX_COMPILE_TIMEOUT=30000
REDIS_URL="redis://localhost:6379"

# apps/web/.env
VITE_API_URL=http://localhost:3001/api
VITE_APP_NAME=Tinkergyan
```

#### Step 8: Run Locally

```bash
# From root
docker-compose -f docker/docker-compose.yml up -d postgres redis

# Run database migrations
cd apps/api && npx prisma migrate dev --name init

# Seed database
npx prisma db seed

# Start all services (from root)
pnpm turbo dev
```

---

## 📊 Success Metrics

| Phase   | Key Metric                          | Target       |
| ------- | ----------------------------------- | ------------ |
| Phase 1 | Users who complete first lesson     | 60%          |
| Phase 2 | Users who successfully compile code | 70%          |
| Phase 3 | Projects shared publicly            | 20% of users |
| Phase 4 | DAU / MAU ratio                     | > 0.3        |

---

## 🚨 Risk Register

| Risk                         | Likelihood | Impact | Mitigation                                     |
| ---------------------------- | ---------- | ------ | ---------------------------------------------- |
| Blockly bundle size (large)  | High       | Medium | Code-split, lazy load                          |
| Docker sandbox security      | Medium     | High   | Network isolation, resource limits, no root    |
| Arduino CLI compilation slow | Medium     | High   | Queue system, Redis job queue                  |
| Simulation engine complexity | High       | Medium | Defer to Phase 4, use Wokwi embed initially    |
| Child data privacy (COPPA)   | Low        | High   | No PII collection for under-13, parent consent |

---

## 📎 Key References

- Google Blockly: https://developers.google.com/blockly
- Monaco Editor: https://microsoft.github.io/monaco-editor/
- Arduino CLI: https://arduino.github.io/arduino-cli/
- Framer Motion: https://www.framer.com/motion/
- Prisma ORM: https://www.prisma.io/
- Turborepo: https://turbo.build/

---

_Document Version: 1.0 | Last Updated: 2026_
