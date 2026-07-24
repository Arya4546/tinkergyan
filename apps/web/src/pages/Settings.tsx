import { useEffect, useState } from 'react';
import { Settings2, Sun, Moon, Monitor, Save, Loader2, RotateCcw, Lock } from 'lucide-react';
import { api } from '../services/api';
import { useUIStore } from '../stores/ui.store';
import { PageHeader } from '../components/ui/PageHeader';
import { Loader } from '../components/ui/Loader';
import { BOARDS } from '../lib/boards';

const FONT_SIZES = [10, 12, 14, 16, 18, 20, 22, 24];

interface Preferences {
  theme: 'LIGHT' | 'DARK' | 'SYSTEM';
  editorFontSize: number;
  defaultBoard: string;
  autoSave: boolean;
  codeCompletion: boolean;
  emailNotifications: boolean;
}

const DEFAULTS: Preferences = {
  theme: 'SYSTEM',
  editorFontSize: 14,
  defaultBoard: 'arduino:avr:uno',
  autoSave: true,
  codeCompletion: true,
  emailNotifications: true,
};

function ToggleSwitch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between w-full py-4 text-left"
    >
      <div>
        <p className="text-sm font-semibold text-slate-900 dark:text-white">{label}</p>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>
      <div
        className={`w-10 h-6 rounded-full transition-colors shrink-0 ml-4 relative ${checked ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}
      >
        <div
          className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform shadow-sm ${checked ? 'translate-x-5' : 'translate-x-1'}`}
        />
      </div>
    </button>
  );
}

export default function Settings() {
  const addToast = useUIStore((s) => s.addToast);
  const setGlobalTheme = useUIStore((s) => s.setTheme);
  const [prefs, setPrefs] = useState<Preferences>(DEFAULTS);
  const [isLoading, setLoading] = useState(true);
  const [isSaving, setSaving] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPwd, setChangingPwd] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const response = await api.get<{ data: { preferences: Preferences } }>('/user/preferences');
        const p = response.data.data.preferences;
        setPrefs({
          theme: p.theme ?? 'SYSTEM',
          editorFontSize: p.editorFontSize ?? 14,
          defaultBoard: p.defaultBoard ?? 'arduino:avr:uno',
          autoSave: p.autoSave ?? true,
          codeCompletion: p.codeCompletion ?? true,
          emailNotifications: p.emailNotifications ?? true,
        });
      } catch {
        /* use defaults */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = () => {
    setSaving(true);
    void (async () => {
      try {
        await api.put('/user/preferences', prefs);
        setGlobalTheme(prefs.theme.toLowerCase() as 'light' | 'dark' | 'system');
        addToast({
          type: 'success',
          title: 'Settings saved',
          message: 'Your preferences have been updated.',
        });
      } catch {
        addToast({ type: 'error', title: 'Error', message: 'Could not save settings.' });
      } finally {
        setSaving(false);
      }
    })();
  };

  const updatePref = <K extends keyof Preferences>(key: K, value: Preferences[K]) =>
    setPrefs((prev) => ({ ...prev, [key]: value }));

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setChangingPwd(true);
    void (async () => {
      try {
        await api.patch('/auth/password', { oldPassword, newPassword });
        addToast({ type: 'success', title: 'Password updated', message: 'Please log in again.' });
        setTimeout(() => (window.location.href = '/login'), 1500);
      } catch {
        addToast({ type: 'error', title: 'Error', message: 'Check your current password.' });
      } finally {
        setChangingPwd(false);
      }
    })();
  };

  if (isLoading)
    return (
      <div className="flex items-center justify-center h-full">
        <Loader message="Loading settings..." />
      </div>
    );

  const iClass =
    'w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111111] text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500';
  const btnClass = (active: boolean) =>
    `h-10 px-3 rounded-lg text-sm font-semibold transition-colors border ${active ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent' : 'bg-white dark:bg-[#111111] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`;

  return (
    <div className="w-full h-full flex flex-col overflow-y-auto">
      <PageHeader icon={Settings2} title="Settings" subtitle="Manage your preferences">
        <button
          onClick={() => setPrefs(DEFAULTS)}
          className="h-9 px-4 text-sm font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
        >
          <RotateCcw size={14} /> Reset
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="h-9 px-4 text-sm font-semibold bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl hover:bg-emerald-500 hover:text-white transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
        </button>
      </PageHeader>

      <div className="flex-1 p-6 lg:p-10 bg-white dark:bg-[#111111]">
        <div className="max-w-2xl mx-auto space-y-8">
          <section>
            <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
              Appearance
            </h2>
            <div className="bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Theme</p>
              <div className="flex gap-2">
                {(
                  [
                    { value: 'LIGHT', icon: Sun, label: 'Light' },
                    { value: 'DARK', icon: Moon, label: 'Dark' },
                    { value: 'SYSTEM', icon: Monitor, label: 'System' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => updatePref('theme', opt.value)}
                    className={`flex-1 h-10 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors border ${prefs.theme === opt.value ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent' : 'bg-white dark:bg-[#111111] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'}`}
                  >
                    <opt.icon size={15} /> {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
              Editor Settings
            </h2>
            <div className="bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Default Board
                </label>
                <select
                  value={prefs.defaultBoard}
                  onChange={(e) => updatePref('defaultBoard', e.target.value)}
                  className={iClass}
                >
                  {BOARDS.map((b) => (
                    <option key={b.fqbn} value={b.fqbn}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Font Size — <span className="text-emerald-600">{prefs.editorFontSize}px</span>
                </p>
                <div className="flex gap-1.5 flex-wrap">
                  {FONT_SIZES.map((size) => (
                    <button
                      key={size}
                      onClick={() => updatePref('editorFontSize', size)}
                      className={btnClass(prefs.editorFontSize === size)}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
              Behavior
            </h2>
            <div className="bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800 rounded-2xl px-5 divide-y divide-slate-200 dark:divide-slate-800">
              <ToggleSwitch
                label="Auto Save"
                description="Save your work automatically while editing"
                checked={prefs.autoSave}
                onChange={(v) => updatePref('autoSave', v)}
              />
              <ToggleSwitch
                label="Code Completion"
                description="Show code suggestions as you type"
                checked={prefs.codeCompletion}
                onChange={(v) => updatePref('codeCompletion', v)}
              />
              <ToggleSwitch
                label="Email Notifications"
                description="Receive updates about courses and achievements"
                checked={prefs.emailNotifications}
                onChange={(v) => updatePref('emailNotifications', v)}
              />
            </div>
          </section>

          <section>
            <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
              Security
            </h2>
            <div className="bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
                Change Password
              </p>
              <form onSubmit={handleChangePassword} className="space-y-3">
                <input
                  type="password"
                  placeholder="Current password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className={iClass}
                  required
                />
                <input
                  type="password"
                  placeholder="New password (8+ chars, 1 uppercase, 1 number)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={iClass}
                  required
                  minLength={8}
                />
                <button
                  type="submit"
                  disabled={isChangingPwd || !oldPassword || !newPassword}
                  className="h-10 px-5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isChangingPwd ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Lock size={14} />
                  )}{' '}
                  Update Password
                </button>
              </form>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
