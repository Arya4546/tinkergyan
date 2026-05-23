/**
 * Settings.tsx
 *
 * User preferences page: theme, editor defaults, auto-save, notifications.
 * Syncs with backend UserPreferences table.
 */
import { useEffect, useState } from 'react';
import { Settings2, Sun, Moon, Monitor, Save, Loader2, RotateCcw } from 'lucide-react';

import { api } from '../services/api';
import { useUIStore } from '../stores/ui.store';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Loader } from '../components/ui/Loader';

const BOARDS = [
  { value: 'arduino:avr:uno',           label: 'Arduino Uno' },
  { value: 'arduino:avr:mega',          label: 'Arduino Mega' },
  { value: 'esp8266:esp8266:nodemcuv2', label: 'NodeMCU (ESP8266)' },
];

const FONT_SIZES = [10, 12, 14, 16, 18, 20, 22, 24];

interface Preferences {
  theme:              'LIGHT' | 'DARK' | 'SYSTEM';
  editorFontSize:     number;
  defaultBoard:       string;
  autoSave:           boolean;
  codeCompletion:     boolean;
  emailNotifications: boolean;
}

const DEFAULTS: Preferences = {
  theme:              'SYSTEM',
  editorFontSize:     14,
  defaultBoard:       'arduino:avr:uno',
  autoSave:           true,
  codeCompletion:     true,
  emailNotifications: true,
};

function ToggleSwitch({ checked, onChange, label }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between w-full py-3 group"
    >
      <span className="font-mono text-xs font-bold uppercase tracking-widest text-slate-900 dark:text-white">
        {label}
      </span>
      <div className={`w-11 h-6 rounded-sm border-2 transition-colors relative ${
        checked
          ? 'bg-emerald-500 border-emerald-600'
          : 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700'
      }`}>
        <div className={`w-4 h-4 bg-white absolute top-0.5 transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`} />
      </div>
    </button>
  );
}

export default function Settings() {
  const addToast = useUIStore((s: any) => s.addToast);
  const setGlobalTheme = useUIStore((s) => s.setTheme);

  const [prefs, setPrefs]       = useState<Preferences>(DEFAULTS);
  const [isLoading, setLoading] = useState(true);
  const [isSaving, setSaving]   = useState(false);

  // Load preferences
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/user/preferences');
        const p = data.data.preferences;
        setPrefs({
          theme:              p.theme ?? 'SYSTEM',
          editorFontSize:     p.editorFontSize ?? 14,
          defaultBoard:       p.defaultBoard ?? 'arduino:avr:uno',
          autoSave:           p.autoSave ?? true,
          codeCompletion:     p.codeCompletion ?? true,
          emailNotifications: p.emailNotifications ?? true,
        });
      } catch {
        // Use defaults silently
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/user/preferences', prefs);
      // Sync theme globally
      setGlobalTheme(prefs.theme.toLowerCase() as 'light' | 'dark' | 'system');
      addToast({ type: 'success', title: 'SETTINGS_SAVED', message: 'Preferences updated.' });
    } catch {
      addToast({ type: 'error', title: 'SAVE_FAILED', message: 'Could not save settings.' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPrefs(DEFAULTS);
  };

  const updatePref = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader message="LOADING_SETTINGS..." />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col overflow-y-auto">
      <PageHeader icon={Settings2} title="Settings" subtitle="SYS_CONFIG">
        <Button
          variant="ghost"
          size="sm"
          className="h-12 px-4 rounded-none"
          onClick={handleReset}
        >
          <RotateCcw size={14} className="mr-2" />
          <span className="font-mono text-[10px] font-bold uppercase">Reset</span>
        </Button>
        <Button
          variant="primary"
          size="sm"
          className="h-12 px-6 rounded-none"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving
            ? <Loader2 size={14} className="animate-spin mr-2" />
            : <Save size={14} className="mr-2" />
          }
          <span className="font-mono text-[10px] font-bold uppercase">Save</span>
        </Button>
      </PageHeader>

      <div className="flex-1 p-6 lg:p-10 bg-white dark:bg-[#0A0A0A]">
        <div className="max-w-2xl mx-auto space-y-8">

          {/* ── Appearance ──────────────────────────────────── */}
          <section>
            <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
              <div className="w-1 h-4 bg-yellow-400" /> APPEARANCE
            </h2>
            <div className="hw-border bg-slate-50 dark:bg-[#111111] p-5">
              <span className="block font-mono text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                THEME
              </span>
              <div className="flex gap-2">
                {([
                  { value: 'LIGHT',  icon: Sun,     label: 'Light' },
                  { value: 'DARK',   icon: Moon,    label: 'Dark' },
                  { value: 'SYSTEM', icon: Monitor, label: 'System' },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => updatePref('theme', opt.value)}
                    className={`flex-1 h-12 hw-border flex items-center justify-center gap-2 font-mono text-[10px] font-bold uppercase tracking-widest transition-colors ${
                      prefs.theme === opt.value
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                        : 'bg-white dark:bg-[#000000] text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <opt.icon size={14} /> {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* ── Editor Defaults ──────────────────────────────── */}
          <section>
            <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
              <div className="w-1 h-4 bg-blue-400" /> EDITOR_DEFAULTS
            </h2>
            <div className="hw-border bg-slate-50 dark:bg-[#111111] p-5 space-y-5">
              {/* Default Board */}
              <div>
                <span className="block font-mono text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                  DEFAULT_BOARD
                </span>
                <select
                  value={prefs.defaultBoard}
                  onChange={(e) => updatePref('defaultBoard', e.target.value)}
                  className="w-full h-12 px-4 hw-border bg-white dark:bg-[#000000] font-mono text-xs font-bold uppercase tracking-widest text-slate-900 dark:text-white outline-none cursor-pointer"
                >
                  {BOARDS.map((b) => (
                    <option key={b.value} value={b.value}>{b.label}</option>
                  ))}
                </select>
              </div>

              {/* Font Size */}
              <div>
                <span className="block font-mono text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                  EDITOR_FONT_SIZE — {prefs.editorFontSize}px
                </span>
                <div className="flex gap-1">
                  {FONT_SIZES.map((size) => (
                    <button
                      key={size}
                      onClick={() => updatePref('editorFontSize', size)}
                      className={`flex-1 h-10 hw-border font-mono text-[10px] font-bold transition-colors ${
                        prefs.editorFontSize === size
                          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                          : 'bg-white dark:bg-[#000000] text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ── Behavior ──────────────────────────────── */}
          <section>
            <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
              <div className="w-1 h-4 bg-emerald-400" /> BEHAVIOR
            </h2>
            <div className="hw-border bg-slate-50 dark:bg-[#111111] px-5 divide-y divide-slate-200 dark:divide-slate-800">
              <ToggleSwitch
                label="AUTO_SAVE"
                checked={prefs.autoSave}
                onChange={(v) => updatePref('autoSave', v)}
              />
              <ToggleSwitch
                label="CODE_COMPLETION"
                checked={prefs.codeCompletion}
                onChange={(v) => updatePref('codeCompletion', v)}
              />
              <ToggleSwitch
                label="EMAIL_NOTIFICATIONS"
                checked={prefs.emailNotifications}
                onChange={(v) => updatePref('emailNotifications', v)}
              />
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
