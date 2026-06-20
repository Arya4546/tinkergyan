/**
 * editor.store.ts
 *
 * Zustand store for all editor state. Keeps Editor.tsx clean — the page
 * component only reads state and dispatches actions; no async logic lives
 * in the component itself.
 *
 * Features:
 *   - Load existing project from API
 *   - Save / create project
 *   - Auto-save (debounced 30s)
 *   - Compile via /api/compile
 *   - Font size controls
 *   - Starter templates
 */
import { create } from 'zustand';
import { api } from '../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CompileError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
}

export interface CompileResult {
  success: boolean;
  stdout: string;
  stderr: string;
  errors: CompileError[];
  durationMs: number;
  engine: 'wandbox' | 'arduino' | 'mock';
  hexBase64?: string;
}

export type EditorMode = 'block' | 'code';

// ─── Starter Templates ───────────────────────────────────────────────────────

export interface StarterTemplate {
  id: string;
  title: string;
  desc: string;
  board: string;
  mode: EditorMode;
  code: string;
}

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: 'blink',
    title: 'Blink LED',
    desc: 'Classic LED blink on pin 13',
    board: 'arduino:avr:uno',
    mode: 'code',
    code: `// Blink LED — the "Hello World" of Arduino
// Toggles the built-in LED on pin 13 every second.

void setup() {
  pinMode(13, OUTPUT);
}

void loop() {
  digitalWrite(13, HIGH);
  delay(1000);
  digitalWrite(13, LOW);
  delay(1000);
}
`,
  },
  {
    id: 'serial-hello',
    title: 'Serial Hello',
    desc: 'Print to Serial Monitor',
    board: 'arduino:avr:uno',
    mode: 'code',
    code: `// Serial Hello World
// Opens serial at 9600 baud and prints a message every second.

void setup() {
  Serial.begin(9600);
  Serial.println("Tinkergyan booting...");
}

void loop() {
  Serial.println("Hello from Arduino!");
  delay(1000);
}
`,
  },
  {
    id: 'button-read',
    title: 'Button Read',
    desc: 'Read a push button on pin 2',
    board: 'arduino:avr:uno',
    mode: 'code',
    code: `// Button Read
// Reads a push button on pin 2 and lights LED on pin 13.

const int buttonPin = 2;
const int ledPin = 13;

void setup() {
  pinMode(buttonPin, INPUT_PULLUP);
  pinMode(ledPin, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int state = digitalRead(buttonPin);
  digitalWrite(ledPin, state == LOW ? HIGH : LOW);
  Serial.print("Button: ");
  Serial.println(state == LOW ? "PRESSED" : "RELEASED");
  delay(100);
}
`,
  },
  {
    id: 'analog-sensor',
    title: 'Analog Sensor',
    desc: 'Read analog value from A0',
    board: 'arduino:avr:uno',
    mode: 'code',
    code: `// Analog Sensor Reader
// Reads analog input on A0 and prints the value to Serial.

void setup() {
  Serial.begin(9600);
}

void loop() {
  int sensorValue = analogRead(A0);
  float voltage = sensorValue * (5.0 / 1023.0);
  Serial.print("Raw: ");
  Serial.print(sensorValue);
  Serial.print(" | Voltage: ");
  Serial.println(voltage);
  delay(250);
}
`,
  },
  {
    id: 'cpp-hello',
    title: 'C++ Hello World',
    desc: 'Standard C++ program (runs on Wandbox)',
    board: 'arduino:avr:uno',
    mode: 'code',
    code: `// Standard C++ Hello World
// This runs on a real GCC compiler via Wandbox.

#include <iostream>
#include <vector>
#include <string>

int main() {
    std::cout << "Hello from Tinkergyan!" << std::endl;

    std::vector<std::string> topics = {
        "Variables", "Loops", "Functions", "Arrays", "Pointers"
    };

    std::cout << "\\nC++ Topics to Learn:" << std::endl;
    for (size_t i = 0; i < topics.size(); i++) {
        std::cout << "  " << (i + 1) << ". " << topics[i] << std::endl;
    }

    return 0;
}
`,
  },
];

// ─── State Interface ──────────────────────────────────────────────────────────

export interface EditorState {
  // ── Mode ──────────────────────────────────────────────────────────────────
  mode: EditorMode;
  setMode: (mode: EditorMode) => void;

  // ── Code ──────────────────────────────────────────────────────────────────
  generatedCode: string;
  manualCode: string;
  setGeneratedCode: (code: string) => void;
  setManualCode: (code: string) => void;

  // ── Board ─────────────────────────────────────────────────────────────────
  board: string;
  setBoard: (board: string) => void;

  // ── Font Size ─────────────────────────────────────────────────────────────
  fontSize: number;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;

  // ── Compile ───────────────────────────────────────────────────────────────
  isCompiling: boolean;
  compileResult: CompileResult | null;
  stdinInput: string;
  setStdinInput: (val: string) => void;
  compile: (code: string, target?: 'simulate' | 'firmware') => Promise<void>;
  clearResult: () => void;

  // ── Project ───────────────────────────────────────────────────────────────
  projectId: string | null;
  projectTitle: string;
  blockXml: string;
  isSaving: boolean;
  isLoading: boolean;
  isDirty: boolean;
  isPublic: boolean;
  setProjectTitle: (title: string) => void;
  setBlockXml: (xml: string) => void;
  saveProject: (blockXml: string) => Promise<void>;
  loadProject: (id: string) => Promise<void>;
  resetEditor: () => void;
  loadTemplate: (template: StarterTemplate) => void;
  markDirty: () => void;
  duplicateProject: () => Promise<string>;
  togglePublic: () => Promise<boolean>;

  // ── Auto-save ─────────────────────────────────────────────────────────────
  _autoSaveTimer: ReturnType<typeof setTimeout> | null;
  scheduleAutoSave: (getBlockXml: () => string) => void;
}

// ─── Initial State ────────────────────────────────────────────────────────────

const INITIAL_STATE = {
  mode: 'block' as EditorMode,
  generatedCode: '',
  manualCode: '',
  board: 'arduino:avr:uno',
  fontSize: 14,
  isCompiling: false,
  compileResult: null as CompileResult | null,
  stdinInput: '',
  projectId: null as string | null,
  projectTitle: 'New_Project',
  blockXml: '',
  isSaving: false,
  isLoading: false,
  isDirty: false,
  isPublic: false,
  _autoSaveTimer: null as ReturnType<typeof setTimeout> | null,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useEditorStore = create<EditorState>()((set, get) => ({
  ...INITIAL_STATE,

  // ── Mode ──────────────────────────────────────────────────────────────────
  setMode: (mode) => set({ mode }),

  // ── Code ──────────────────────────────────────────────────────────────────
  setGeneratedCode: (generatedCode) => set({ generatedCode, isDirty: true }),
  setManualCode: (manualCode) => set({ manualCode, isDirty: true }),

  // ── Board ─────────────────────────────────────────────────────────────────
  setBoard: (board) => set({ board, isDirty: true }),

  // ── Font Size ─────────────────────────────────────────────────────────────
  increaseFontSize: () => set((s) => ({ fontSize: Math.min(s.fontSize + 2, 28) })),
  decreaseFontSize: () => set((s) => ({ fontSize: Math.max(s.fontSize - 2, 10) })),

  setStdinInput: (val: string) => set({ stdinInput: val }),

  // ── Compile ───────────────────────────────────────────────────────────────
  compile: async (code: string, target?: 'simulate' | 'firmware') => {
    set({ isCompiling: true, compileResult: null });
    try {
      const { data } = await api.post('/compile', {
        code,
        board: get().board,
        stdin: get().stdinInput,
        target,
      });
      set({ compileResult: data.data.result as CompileResult });
    } catch (err: any) {
      const message = err?.response?.data?.error?.message ?? 'Compilation failed unexpectedly';
      set({
        compileResult: {
          success: false,
          stdout: '',
          stderr: message,
          errors: [{ line: 0, column: 0, severity: 'error', message }],
          durationMs: 0,
          engine: 'wandbox',
        },
      });
    } finally {
      set({ isCompiling: false });
    }
  },

  clearResult: () => set({ compileResult: null }),

  // ── Project ───────────────────────────────────────────────────────────────
  setProjectTitle: (projectTitle) => set({ projectTitle, isDirty: true }),
  setBlockXml: (blockXml) => set({ blockXml }),

  loadProject: async (id: string) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get(`/projects/${id}`);
      const project = data.data.project;
      set({
        projectId: project.id,
        projectTitle: project.title,
        mode: project.type === 'CODE' ? 'code' : 'block',
        board: project.boardTarget || 'arduino:avr:uno',
        manualCode: project.code || '',
        generatedCode: project.code || '',
        blockXml: typeof project.blockState === 'string' ? project.blockState : '',
        isPublic: !!project.isPublic,
        isDirty: false,
        compileResult: null,
      });
    } catch {
      // If project can't be loaded, stay on empty editor
    } finally {
      set({ isLoading: false });
    }
  },

  resetEditor: () => {
    const timer = get()._autoSaveTimer;
    if (timer) clearTimeout(timer);
    set({ ...INITIAL_STATE });
  },

  loadTemplate: (template: StarterTemplate) => {
    const timer = get()._autoSaveTimer;
    if (timer) clearTimeout(timer);
    set({
      ...INITIAL_STATE,
      projectTitle: template.title,
      mode: template.mode,
      board: template.board,
      manualCode: template.code,
      generatedCode: '',
      isDirty: true,
    });
  },

  markDirty: () => set({ isDirty: true }),

  saveProject: async (blockXml: string) => {
    const { projectId, projectTitle, generatedCode, board, mode, manualCode } = get();
    set({ isSaving: true });
    try {
      const code = mode === 'code' ? manualCode : generatedCode;
      if (projectId) {
        await api.patch(`/projects/${projectId}`, {
          title: projectTitle,
          code,
          blockState: blockXml,
          boardTarget: board,
        });
      } else {
        const { data } = await api.post('/projects', {
          title: projectTitle,
          type: mode === 'block' ? 'BLOCK' : 'CODE',
          code,
          blockState: blockXml,
          boardTarget: board,
        });
        set({ projectId: data.data.project.id });
      }
      set({ isDirty: false, blockXml });
    } finally {
      set({ isSaving: false });
    }
  },

  duplicateProject: async () => {
    const { projectId } = get();
    if (!projectId) throw new Error('No project to duplicate');
    const { data } = await api.post(`/projects/${projectId}/fork`);
    const newProject = data.data.project;
    set({
      projectId: newProject.id,
      projectTitle: newProject.title,
      isDirty: false,
    });
    return newProject.id;
  },

  togglePublic: async () => {
    const { projectId, isPublic } = get();
    if (!projectId) throw new Error('No project to toggle');
    const newStatus = !isPublic;
    await api.patch(`/projects/${projectId}`, { isPublic: newStatus });
    set({ isPublic: newStatus });
    return newStatus;
  },

  // ── Auto-save ─────────────────────────────────────────────────────────────
  scheduleAutoSave: (getBlockXml: () => string) => {
    const timer = get()._autoSaveTimer;
    if (timer) clearTimeout(timer);

    const newTimer = setTimeout(async () => {
      const state = get();
      if (!state.isDirty || state.isSaving || state.isCompiling) return;
      try {
        await state.saveProject(getBlockXml());
      } catch {
        // Silent fail — user can manually save
      }
    }, 30_000);

    set({ _autoSaveTimer: newTimer });
  },
}));
