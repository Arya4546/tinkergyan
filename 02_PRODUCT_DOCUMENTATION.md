# 📖 Tinkergyan — Complete Product Documentation

## Full User Flow, Feature Behavior & Interaction Reference

> This document describes every screen, every user action, every button, and the complete flow of the Tinkergyan platform. Use this as the single source of truth for frontend development, QA testing, and product decisions.

---

## 🗺️ Application Map (All Routes)

```
/                           → Landing Page
/login                      → Login
/register                   → Register
/dashboard                  → User Dashboard (protected)
/courses                    → Course Catalog
/courses/:slug              → Course Detail Page
/courses/:slug/:moduleId/:lessonId  → Lesson Viewer
/editor                     → Project Playground (new project)
/editor/:projectId          → Project Playground (existing project)
/projects                   → My Projects
/profile                    → User Profile
/leaderboard                → Leaderboard (Phase 3)
/gallery                    → Public Gallery (Phase 3)
/admin                      → Admin Panel (admin role only)
```

---

## 🔐 1. Authentication Flow

### 1.1 Landing Page (`/`)

**Purpose:** Convert visitors to registered users

**Sections:**

1. Hero — Headline, subline, two CTAs
2. Feature highlights — Block coding, LMS, Projects
3. Demo section — Embedded screenshot/video
4. Get started CTA

**Buttons & Actions:**

| Element                            | Action                        |
| ---------------------------------- | ----------------------------- |
| `Get Started Free` (primary CTA)   | Navigate to `/register`       |
| `See How It Works` (secondary CTA) | Smooth scroll to demo section |
| `Login` (navbar)                   | Navigate to `/login`          |
| `Sign Up` (navbar)                 | Navigate to `/register`       |

---

### 1.2 Register Page (`/register`)

**Form Fields:**

- Full Name (required, 2–50 chars)
- Email (required, valid email format)
- Password (required, min 8 chars, 1 number, 1 uppercase)
- Confirm Password (required, must match)

**Buttons & Actions:**

| Element                               | Action                                                                                                                                                         |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Create Account` button               | Validate form → POST `/api/auth/register` → On success: store JWT in memory + refresh token in httpOnly cookie → Navigate to `/dashboard` → Show welcome toast |
| `Already have an account? Login` link | Navigate to `/login`                                                                                                                                           |
| Google OAuth button (Phase 2)         | OAuth redirect flow                                                                                                                                            |

**Validation States:**

- Inline field validation on blur
- Red border + error message below field on error
- Green checkmark icon on valid field
- Button disabled until all fields valid
- Loading spinner on button during API call
- Error toast on API failure (email taken, server error)

---

### 1.3 Login Page (`/login`)

**Form Fields:**

- Email
- Password

**Buttons & Actions:**

| Element                  | Action                                                        |
| ------------------------ | ------------------------------------------------------------- |
| `Login` button           | POST `/api/auth/login` → Store JWT → Navigate to `/dashboard` |
| `Forgot Password?` link  | Navigate to `/forgot-password` (Phase 2)                      |
| `Create an account` link | Navigate to `/register`                                       |

**States:**

- Wrong credentials → shake animation on form + error message "Invalid email or password"
- Account not found → error message
- Loading state → button shows spinner + disabled

---

### 1.4 Auth Token Management

- JWT stored in memory (Zustand store) — NOT localStorage
- Refresh token in httpOnly cookie (7-day expiry)
- On page reload → call `/api/auth/refresh` to get new JWT
- On JWT expiry (during session) → auto-refresh silently
- On refresh failure → redirect to `/login`

---

## 🏠 2. Dashboard (`/dashboard`)

### Layout:

```
┌─────────────────────────────────────────────────────┐
│  NAVBAR: Logo | Courses | Projects | Profile | XP   │
├──────────┬──────────────────────────────────────────┤
│ SIDEBAR  │  MAIN CONTENT                            │
│ (240px)  │                                          │
│ - Home   │  Welcome back, [Name]!                   │
│ - Learn  │  ┌─────────────────────────────────────┐ │
│ - Build  │  │  CURRENT COURSE PROGRESS BANNER     │ │
│ - My Work│  └─────────────────────────────────────┘ │
│ - Profile│  ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│          │  │ XP Today │ │ Streak   │ │ Projects │ │
│          │  └──────────┘ └──────────┘ └──────────┘ │
│          │  Recent Projects                         │
│          │  Continue Learning                       │
└──────────┴──────────────────────────────────────────┘
```

### Dashboard Elements & Actions:

| Element                | Action                             |
| ---------------------- | ---------------------------------- |
| Continue Learning card | Navigate to last incomplete lesson |
| Recent Project card    | Navigate to `/editor/:projectId`   |
| `+ New Project` button | Open New Project modal             |
| XP badge               | Show XP breakdown tooltip on hover |
| Streak counter         | Show streak details modal on click |
| Course progress bar    | Navigate to `/courses/:slug`       |
| Sidebar `Learn`        | Navigate to `/courses`             |
| Sidebar `Build`        | Navigate to `/editor`              |
| Sidebar `My Work`      | Navigate to `/projects`            |

### New Project Modal:

**Triggered by:** `+ New Project` button

**Content:**

- Project name input (default: "My Project #N")
- Type selector: `Block Coding` (default) | `Code Editor`
- Board selector: `Arduino Uno` | `Arduino Nano` | `ESP8266` | `ESP32`
- Template selector (optional): None | Blink LED | Button Input | Serial Print

**Buttons:**
| Element | Action |
|---|---|
| `Create Project` | POST `/api/projects` → Navigate to `/editor/:newProjectId` |
| `Cancel` / backdrop click | Close modal |

---

## 📚 3. Courses & LMS

### 3.1 Course Catalog (`/courses`)

**Layout:** Grid of course cards (2 cols on tablet, 3 on desktop)

**Each Course Card Shows:**

- Thumbnail
- Title
- Difficulty badge (Beginner/Intermediate/Advanced)
- Lesson count
- Enrolled student count
- Progress bar (if enrolled)

**Buttons & Actions:**

| Element                        | Action                                                                             |
| ------------------------------ | ---------------------------------------------------------------------------------- |
| Course card click              | Navigate to `/courses/:slug`                                                       |
| `Enroll` button (not enrolled) | POST `/api/courses/:id/enroll` → Show success toast → Update card to show progress |
| `Continue` button (enrolled)   | Navigate to last incomplete lesson                                                 |
| `Completed` badge (100% done)  | Non-clickable indicator                                                            |
| Difficulty filter chips        | Filter course list client-side                                                     |
| Search input                   | Filter courses by title (debounced, 300ms)                                         |

---

### 3.2 Course Detail Page (`/courses/:slug`)

**Layout:**

```
┌──────────────────────────────────────────────────────────┐
│  Course Thumbnail Banner                                 │
│  Title | Description | [Enroll / Continue] button        │
├───────────────────────┬──────────────────────────────────┤
│  Module Accordion     │  Course Overview                 │
│  ▼ Module 1           │  - Difficulty                    │
│    ○ Lesson 1.1       │  - Duration estimate             │
│    ✓ Lesson 1.2 ✓     │  - What you'll learn             │
│  ▶ Module 2 (locked)  │  - Prerequisites                 │
└───────────────────────┴──────────────────────────────────┘
```

**Buttons & Actions:**

| Element                       | Action                                                    |
| ----------------------------- | --------------------------------------------------------- |
| `Enroll for Free`             | POST enroll → Unlock modules → Change to `Start Learning` |
| `Start Learning` / `Continue` | Navigate to first incomplete lesson                       |
| Lesson row click (unlocked)   | Navigate to that lesson                                   |
| Lesson row click (locked)     | Show tooltip: "Complete previous lessons first"           |
| Module header click           | Expand/collapse accordion (Framer Motion)                 |

**Lesson States:**

- `○` Not started (grey)
- `◐` In progress (purple, partial fill)
- `✓` Completed (green checkmark)
- `🔒` Locked (grey, lock icon)

---

### 3.3 Lesson Viewer (`/courses/:slug/:moduleId/:lessonId`)

**Layout:**

```
┌────────────────────────────────────────────────────────────┐
│  LESSON NAVBAR: ← Back | Module > Lesson Title | Progress  │
├────────────────┬───────────────────────────────────────────┤
│  LESSON        │  LESSON CONTENT (right panel or full)     │
│  SIDEBAR       │                                           │
│  - Lesson list │  [MDX Content renders here]               │
│    (current    │  Text, images, diagrams, callout boxes    │
│    highlighted)│                                           │
│                │  ─────────────────────────────────────── │
│  PROGRESS      │  [CODING PLAYGROUND if type=CODING]      │
│  ○ ○ ✓ ◐ ○    │  Block editor OR Monaco editor           │
│                │  Run button, output console              │
└────────────────┴──────────────────────────────────────────┤
│  FOOTER: [← Previous Lesson]  [Mark Complete ✓] [Next →]  │
└────────────────────────────────────────────────────────────┘
```

**Buttons & Actions:**

| Element                        | Action                                                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `← Previous Lesson`            | Navigate to previous lesson (disabled on first)                                                              |
| `Next →`                       | Navigate to next lesson (disabled until lesson marked complete)                                              |
| `Mark as Complete ✓`           | POST `/api/lessons/:id/complete` → Update progress → Animate checkmark → Unlock next lesson → Award XP toast |
| Lesson item in sidebar         | Navigate to that lesson (only if unlocked)                                                                   |
| `Run Code` (in coding lessons) | Submit to compile API → Show output                                                                          |
| `Reset Code`                   | Restore starter code (confirm dialog)                                                                        |

**Lesson Content Types:**

1. **READING** — MDX content only, no editor
2. **CODING** — MDX content + embedded playground below
3. **QUIZ** — MCQ questions (Phase 2)

**XP Award Animation:**
When lesson completed → floating `+10 XP` toast animates from `Mark Complete` button upward, fades out. XP counter in navbar increments with count-up animation.

---

## 🧱 4. Block Coding Editor

### 4.1 Editor Layout (`/editor` or `/editor/:projectId`)

```
┌───────────────────────────────────────────────────────────┐
│  TOPBAR: [← Back] ProjectName ✏️ | [Save] [Run ▶] [⚙️]   │
├──────────────────────────────┬────────────────────────────┤
│                              │  CODE PANEL (right)        │
│  BLOCKLY WORKSPACE           │  Generated Arduino code    │
│  (drag & drop blocks here)   │  (read-only / Monaco)      │
│                              │                            │
│                              │  ─────────────────────     │
│                              │  SERIAL OUTPUT             │
│                              │  (compile results)         │
└──────────────────────────────┴────────────────────────────┘
│  STATUSBAR: Board: Uno | Saved ✓ | Last saved 2 mins ago  │
└───────────────────────────────────────────────────────────┘
```

**Block Toolbox Categories:**

```
📌 Setup & Loop         → setup(), loop() scaffold
⚡ Digital I/O         → digitalWrite, digitalRead, pinMode
📊 Analog I/O          → analogRead, analogWrite
⏱️ Timing              → delay, millis, micros
🔢 Variables           → int, float, String, bool
🔁 Control             → if/else, while, for
➕ Math                → +, -, *, /, map(), constrain()
📝 Serial              → Serial.begin, Serial.print, Serial.println
💡 Built-in LED        → LED_BUILTIN shortcuts
🌐 WiFi (ESP, Phase 2) → WiFi.begin, WiFi.status
```

**Buttons & Actions:**

| Element                          | Action                                                                                                                            |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `Save` button (or Ctrl+S)        | PUT `/api/projects/:id` (debounce 500ms) → Show "Saved ✓" in statusbar                                                            |
| `Run ▶` button                   | Generate code from blocks → POST `/api/compile` → Stream output to console panel → Show success (green) or error (red) in console |
| Pencil icon next to name         | Inline rename: text input appears, Blur/Enter saves                                                                               |
| `⚙️` Settings gear               | Open Project Settings modal (board selection, etc.)                                                                               |
| `← Back`                         | If unsaved changes → confirmation dialog → Navigate to `/projects`                                                                |
| Block drag onto workspace        | Block snaps into place (Blockly native) → Code panel updates in real-time                                                         |
| Block right-click                | Context menu: Duplicate, Delete, Add Comment, Help                                                                                |
| `+` / `-` zoom buttons (Blockly) | Zoom workspace                                                                                                                    |
| Fit to screen button             | Auto-fit all blocks into view                                                                                                     |
| Undo / Redo (Ctrl+Z / Ctrl+Y)    | Undo/redo block actions                                                                                                           |
| Code panel toggle                | Show/hide right code panel                                                                                                        |

**Auto-save Behavior:**

- Saves automatically every 30 seconds if changes exist
- Visual indicator: "Saving..." → "Saved ✓" → fades
- On window close with unsaved changes: browser beforeunload warning

**Code Generation:**

- Every block change triggers code regeneration immediately (no delay)
- Generated code shown in read-only Monaco panel (right side)
- Code is syntax-highlighted C/C++

---

### 4.2 Run / Compile Flow

**When user clicks `Run ▶`:**

```
1. Button → spinner + "Compiling..." (disabled during run)
2. Block state → generate Arduino .ino code string
3. POST /api/compile { code, board: "arduino:avr:uno" }
4. Server → BullMQ queue → Docker sandbox → Arduino CLI
5. Animated step-by-step progress shown in console:
   Step 1: "📦 Packing your code..."          → ✓ (550ms)
   Step 2: "🔍 Checking for mistakes..."       → ✓ (550ms)
   Step 3: "⚙️ Building for Arduino Uno..."    → ✓ (550ms)
   Step 4: "✅ Almost done..."                 → ✓ (550ms)
6. Result renders → button returns to normal
```

---

### 4.3 Motivational Console System

> **Core Philosophy:** The console must NEVER make a child feel like they failed. Every state — even errors — must feel like an adventure, a puzzle, or a learning moment. Messages rotate randomly so kids never see the same text twice. Tone is: encouraging coach, never stern teacher.

---

#### 🟢 State 1 — Idle (no run yet)

**Visual:** Centered rocket icon (purple circle), friendly headline, subline.

| Element  | Value                                                                                                                 |
| -------- | --------------------------------------------------------------------------------------------------------------------- |
| Icon     | 🚀 in a soft purple circle                                                                                            |
| Title    | "Ready to launch your code!"                                                                                          |
| Subtitle | "Click the Run button above and let's see what your Arduino does. Every great inventor starts with that first click!" |

---

#### 🔄 State 2 — Compiling (in progress)

**Visual:** Animated step cards appearing one by one with spinner → green checkmark transition.

```
Step cards (appear sequentially, 550ms apart):
📦 Packing your code...      → ✓
🔍 Checking for mistakes...  → ✓
⚙️ Building for Arduino Uno... → ✓
✅ Almost done...            → ✓
```

Each step: rounded card, soft background, spinner replaces with checkmark on completion.

---

#### ✅ State 3 — Success

**Visual:** Green card with emoji, title, message, compile stats, XP badge, action buttons.

**Randomly selects one of 5 rotating messages:**

| #   | Icon | Title                                  | Message                                                                                                                         |
| --- | ---- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 🎉   | "Nailed it! Your code is perfect!"     | "Wow, that compiled without a single problem! Your Arduino is ready to roll. You're turning into a real engineer — keep going!" |
| 2   | 🚀   | "Liftoff! Code compiled successfully!" | "Houston, we have a program! Everything looks great. Your circuit is about to come alive. Ready to upload?"                     |
| 3   | ⚡   | "Zap! Compiled in a flash!"            | "Like lightning! Your code is clean, crisp, and ready. One more step and your LED will blink for real. Amazing work!"           |
| 4   | 🌟   | "Superstar code right there!"          | "Zero errors. Zero warnings. This is what clean code looks like! You should be proud — that's real Arduino magic."              |
| 5   | 🏆   | "Champion-level compile!"              | "Your code passed every check. Brilliant! This is exactly how professional embedded engineers work. Go team!"                   |

**Stats row** (below message):

- Compile time (e.g. "1.8s")
- Binary size (e.g. "2,340 bytes")
- Board target

**XP Badge:** Animated pop-in badge showing `+15 XP earned!` (or `+20 XP` for clean with no prior errors)

**Action Buttons:**

- `Upload to Board` (primary)
- `Share Project`

**Bottom motivational footnote:** (italic, muted)

> "Every time you compile clean code, a light blinks somewhere in the world ✨"

---

#### ❌ State 4 — Compile Error

**Visual:** Warm orange-red card (NOT harsh red — feels scary), emoji, friendly title, encouraging paragraph, clue hint box, raw error line, action buttons.

**Randomly selects one of 5 rotating messages:**

| #   | Icon | Title                                  | Message                                                                                                                                          |
| --- | ---- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | 🔍   | "Ooh, a tiny puzzle to solve!"         | "No worries at all — even the world's best programmers get errors every day! Errors are just clues. Let's decode this one together."             |
| 2   | 🛠️   | "Your code needs a small tune-up!"     | "Great try! You're super close — there's just one little thing the compiler wants you to fix. Think of it like a treasure hunt!"                 |
| 3   | 🧩   | "One missing piece — you've got this!" | "Imagine building LEGO — sometimes one piece is in the wrong spot. That's all this is! Errors make you a better coder, not a worse one."         |
| 4   | 🌈   | "Almost there, keep going!"            | "Did you know? Every programmer, including the people who built your favourite video games, gets errors like this. It's totally normal!"         |
| 5   | 💡   | "Error = learning moment!"             | "You just found a bug! That makes you a real bug-hunter. Debugging is one of the most important skills in coding. Here's what it's telling you:" |

**Hint Box** (purple left-border card, below the message):

- Label: `WHAT THE CLUE SAYS`
- Friendly translation of the error in plain language
- Example: "Check line 12: is everything spelled correctly? Arduino function names are case-sensitive — `digitalWrite` is different from `digitalwrite`!"

**Raw Error Line** (monospace, muted):

```
sketch.ino:12:8 — error: expected ';' before '}' token
```

**Action Buttons** (rotate label to match message tone):

- `Fix It With Me ↗` / `Show Me How ↗` / `Let's Debug ↗` (primary, links to hint for that error type)
- `See Hint Library`
- `Ask for Help`

**Bottom motivational footnote:**

> "Every error you fix is a skill you keep forever"

**Error → Hint translation table** (backend maps error type → friendly text):

| Arduino CLI Error             | Friendly Hint Shown                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------------------ |
| `expected ';'`                | "Looks like a missing semicolon! Add ; at the end of line {line}"                          |
| `undeclared identifier`       | "This variable hasn't been introduced yet. Declare it at the top with `int name = value;`" |
| `was not declared in scope`   | "Make sure this variable or function is spelled exactly right — it's case-sensitive!"      |
| `too few arguments`           | "This function needs more information! Check how many values it expects."                  |
| `no matching function`        | "The function name might have a small typo. Check the spelling carefully."                 |
| `expected primary-expression` | "Something is out of place nearby. Check for missing brackets `()` or `{}`"                |
| `multiple definitions`        | "You've named two things the same. Each variable/function needs a unique name."            |

---

#### ⚠️ State 5 — Warning (compiled but with notices)

**Visual:** Green success card on top (it DID compile!) + amber warning card below.

**Success card:** Same as State 3 (smaller) — "Compiled successfully!"

**Warning card — randomly selects one of 3 messages:**

| #   | Icon | Title                                  | Message                                                                                                                                   |
| --- | ---- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 🟡   | "Your code works, but here's a tip!"   | "Good news — your code compiled! There's just a small suggestion from the compiler to make your code even better. It's totally optional." |
| 2   | ✨   | "Compiled! A little polish available:" | "Nice work! The code will run fine as-is. The warning below is just the compiler being extra helpful — like a teacher's bonus tip!"       |
| 3   | 🎓   | "Compiled! Pro tip unlocked:"          | "Your code is working! Warnings aren't errors — they're tips from the compiler to level up your skills. Check it out when you're ready."  |

**Warning items:** Each warning shown as a chip with `Line N` badge + friendly restatement of the warning.

**Action Buttons:**

- `Upload Anyway` (primary)
- `Fix Warning`

---

#### ⏱️ State 6 — Timeout (30s exceeded)

**Visual:** Pink/rose card, emoji, friendly explanation, loop-fix hint box.

**Randomly selects one of 2 messages:**

| #   | Icon | Title                                   | Message                                                                                                                                                               |
| --- | ---- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | ⏳   | "That one took a while — let's fix it!" | "Your code ran for a long time and we had to stop it safely. This usually means there's an infinite loop or a very big calculation. Don't stress — it's an easy fix!" |
| 2   | 🌀   | "Looks like your code got a bit loopy!" | "Sometimes code runs forever — it's actually a super common beginner thing! Check if your `loop()` has a `delay()` or a stopping condition. You've got this!"         |

**Hint Box** (pink left-border):

```
Quick fix idea:
Inside your loop(), add a delay(1000); — it gives
the Arduino breathing room between cycles.
```

**Action Buttons:**

- `Fix & Retry` (primary)
- `Learn About Loops`

**Bottom footnote:**

> "Infinite loops are a rite of passage for every coder"

---

#### 📋 Console Tabs

The console panel has 3 tabs:

| Tab             | Content                                                              |
| --------------- | -------------------------------------------------------------------- |
| **Output**      | Current compile result (all states above)                            |
| **Quick Hints** | Static library of common error fixes (always visible, no run needed) |
| **History**     | Log of all runs this session: run number, outcome, timestamp         |

**History log entry format:**

```
✓  Run #4    Compiled     14:32
✗  Run #3    Error        14:29
⚠  Run #2    Warning      14:25
✓  Run #1    Compiled     14:20
```

---

#### 🎨 Console UI Design Spec

| Element                 | Spec                                                    |
| ----------------------- | ------------------------------------------------------- |
| Success card background | `#EAF3DE` (soft green), border `#C0DD97`                |
| Error card background   | `#FAECE7` (warm peach, NOT harsh red), border `#F5C4B3` |
| Warning card background | `#FAEEDA` (soft amber), border `#FAC775`                |
| Timeout card background | `#FBEAF0` (soft pink), border `#F4C0D1`                 |
| Hint box                | White/secondary bg, 3px colored left-border             |
| Font                    | Body text: Inter. Error lines: JetBrains Mono           |
| XP badge                | Purple pill, pop-in spring animation                    |
| Step cards              | Secondary bg, spinner → ✓ transition                    |
| Bottom footnote         | 11px, italic, muted, centered                           |

**Color philosophy:** No harsh reds for errors. Use warm peach/coral tones that feel like "oops!" not "WRONG!". Green feels celebratory not just functional. Amber for warnings is gentle, not alarming.

---

## 💻 5. Code Editor (Advanced Mode)

### 5.1 Layout

Same shell as Block Editor but workspace is replaced by Monaco:

```
┌───────────────────────────────────────────────────────────┐
│  TOPBAR: [← Back] ProjectName ✏️ | [Save] [Run ▶] [⚙️]   │
├──────────────────────────────┬────────────────────────────┤
│                              │  SERIAL OUTPUT / CONSOLE   │
│  MONACO CODE EDITOR          │                            │
│  (C/C++ with highlights)     │  Compile result displays   │
│                              │  here in real-time         │
│                              │                            │
│                              │                            │
└──────────────────────────────┴────────────────────────────┘
│  STATUSBAR: Ln 12, Col 4 | Arduino Uno | C++ | Saved ✓   │
└───────────────────────────────────────────────────────────┘
```

**Monaco Editor Features:**

- C/C++ syntax highlighting
- Basic Arduino API autocomplete (via custom language definitions)
- Error squiggles mapped from compile output
- Find & Replace (Ctrl+H)
- Multi-cursor editing
- Font size: adjustable via `⚙️` Settings

**Keyboard Shortcuts:**

| Shortcut       | Action              |
| -------------- | ------------------- |
| `Ctrl+S`       | Save project        |
| `Ctrl+Enter`   | Compile & Run       |
| `Ctrl+Z`       | Undo                |
| `Ctrl+Shift+Z` | Redo                |
| `Ctrl+/`       | Toggle line comment |
| `Ctrl+F`       | Find                |
| `Alt+Shift+F`  | Format document     |

---

### 5.2 Editor Type Toggle

Users can switch between Block and Code modes within a project:

- **Block → Code:** Confirmation dialog "This will generate code from your blocks. You can edit it freely but can't go back to blocks." → Converts + locks to code mode
- **Code → Block:** Not allowed (code is not reversible to blocks)

---

## 🗂️ 6. My Projects (`/projects`)

### Layout:

Grid or list view of user's projects

**Each Project Card Shows:**

- Project name
- Type badge (Block / Code)
- Board target
- Last updated date
- Thumbnail (code preview or block preview)

**Buttons & Actions:**

| Element                | Action                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------- |
| Project card click     | Navigate to `/editor/:projectId`                                                            |
| `⋮` menu on card       | Dropdown: Rename, Duplicate, Share/Make Public, Delete                                      |
| Rename                 | Inline edit with save on blur                                                               |
| Duplicate              | POST `/api/projects/:id/duplicate` → New project appears in list                            |
| Make Public / Private  | Toggle PATCH `/api/projects/:id` → Icon changes (globe / lock)                              |
| Delete                 | Confirmation modal → DELETE `/api/projects/:id` → Remove from list with slide-out animation |
| `+ New Project` button | Open New Project modal (same as dashboard)                                                  |
| List / Grid toggle     | Switch layout view (persisted in localStorage)                                              |
| Sort dropdown          | Sort by: Last Modified, Name, Type                                                          |

---

## 👤 7. User Profile (`/profile`)

**Sections:**

1. **Profile Header** — Avatar, Name, Email, Level badge, XP bar
2. **Stats Row** — Projects created, Lessons completed, Streak, Badges earned
3. **Badges Gallery** — Earned badges (color) + locked badges (greyed)
4. **Activity Feed** — Recent completions, projects, XP gains

**Buttons & Actions:**

| Element           | Action                                                     |
| ----------------- | ---------------------------------------------------------- |
| `Edit Profile`    | Toggle form: edit name, avatar upload                      |
| Avatar click      | Open avatar picker modal (preset avatars, Phase 2: upload) |
| `Save Changes`    | PATCH `/api/users/me` → Success toast                      |
| `Change Password` | Slide in form: current + new + confirm password            |
| Badge hover       | Tooltip showing badge name, description, how to earn       |

---

## ⚙️ 8. Settings & Preferences

**Accessible via:** `⚙️` in navbar dropdown

**Settings Sections:**

| Setting             | Options                              |
| ------------------- | ------------------------------------ |
| Theme               | Light / Dark / System                |
| Editor Font Size    | 12 / 14 / 16 / 18px                  |
| Default Board       | Arduino Uno / Nano / ESP8266 / ESP32 |
| Code Completion     | On / Off                             |
| Auto Save           | On (30s) / Off                       |
| Email Notifications | On / Off                             |

All settings saved via PATCH `/api/users/me/preferences` + stored locally.

---

## 🔔 9. Notification & Feedback System

### Toast Notifications

All actions produce feedback:

| Event            | Toast Type       | Message                            |
| ---------------- | ---------------- | ---------------------------------- |
| Project saved    | Success (green)  | "Project saved"                    |
| Lesson completed | Success + XP     | "Lesson complete! +10 XP"          |
| Compile success  | Success (green)  | "Compiled successfully"            |
| Compile error    | Error (red)      | "Compilation failed — see console" |
| Network error    | Error            | "Connection error. Please retry."  |
| Badge earned     | Special (purple) | "[Badge Name] badge earned! 🎉"    |

Toast position: Top-right. Duration: 3s (auto-dismiss). Max 3 toasts visible at once.

### Confirmation Dialogs

Triggered before destructive actions:

| Trigger                    | Dialog Message                                      |
| -------------------------- | --------------------------------------------------- |
| Delete project             | "Delete '[Project Name]'? This cannot be undone."   |
| Reset code                 | "Reset to starter code? Your changes will be lost." |
| Leave with unsaved changes | "You have unsaved changes. Leave anyway?"           |

---

## 🌐 10. Navigation Behavior

### Navbar (visible on all protected pages)

```
[🔷 Tinkergyan Logo] [Learn] [Build] ........... [XP: 420] [Avatar ▼]
```

| Element         | Action                                                   |
| --------------- | -------------------------------------------------------- |
| Logo            | Navigate to `/dashboard`                                 |
| `Learn`         | Navigate to `/courses`                                   |
| `Build`         | Navigate to `/editor` (new project)                      |
| XP display      | Show XP breakdown popover                                |
| Avatar dropdown | My Profile / My Projects / Settings / Logout             |
| `Logout`        | POST `/api/auth/logout` → Clear tokens → Navigate to `/` |

### Breadcrumb (on lesson pages)

```
Courses > [Course Name] > [Module Name] > [Lesson Name]
```

Each segment is a clickable link to that level.

---

## 📱 11. Responsive Behavior

| Breakpoint          | Behavior                                                                                 |
| ------------------- | ---------------------------------------------------------------------------------------- |
| Mobile (<768px)     | Single column, bottom nav bar, editor is mobile-restricted with "best on desktop" banner |
| Tablet (768–1024px) | Sidebar collapses to icon-only, block editor still functional                            |
| Desktop (>1024px)   | Full layout as designed                                                                  |

---

## ♿ 12. Accessibility

- All buttons have `aria-label` attributes
- Focus rings visible on keyboard navigation
- Color contrast minimum 4.5:1
- All images have alt text
- Modals trap focus and are dismissable by Escape key
- Toast notifications announced to screen readers via `aria-live`

---

_Document Version: 1.0 | Use this as the canonical reference for all frontend development and QA._
