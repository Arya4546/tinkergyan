import { useEffect, useState } from 'react';
import { Settings2, Sun, Moon, Monitor, Save, Loader2, RotateCcw, Lock } from 'lucide-react';
import { api } from '../services/api';
import { useUIStore } from '../stores/ui.store';
import { PageHeader } from '../components/ui/PageHeader';
import { Loader } from '../components/ui/Loader';
import { CustomSelect } from '../components/ui/CustomSelect';
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
      className="flex items-center justify-between w-full py-4 text-left cursor-pointer"
    >
      <div>
        <p className="text-sm font-bold text-tg-dark dark:text-white">{label}</p>
        {description && (
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            {description}
          </p>
        )}
      </div>
      <div
        className={`w-11 h-6 rounded-full transition-colors shrink-0 ml-4 relative ${checked ? 'bg-playful-primary' : 'bg-slate-200 dark:bg-slate-700'}`}
      >
        <div
          className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform shadow-xs ${checked ? 'translate-x-6' : 'translate-x-1'}`}
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
    'w-full h-11 px-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#11141E] text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-playful-primary transition-all';
  const btnClass = (active: boolean) =>
    `h-10 px-3.5 rounded-xl text-xs font-bold transition-all border ${active ? 'bg-playful-primary text-white border-transparent shadow-xs' : 'bg-white dark:bg-[#11141E] text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-white/5'}`;

  return (
    <div className="w-full h-full flex flex-col font-playful overflow-y-auto bg-transparent">
      <PageHeader icon={Settings2} title="Settings" subtitle="Manage your workbench preferences">
        <button
          onClick={() => setPrefs(DEFAULTS)}
          className="h-10 px-4 text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors flex items-center gap-2 cursor-pointer"
        >
          <RotateCcw size={14} /> Reset
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="h-10 px-5 text-xs font-black bg-gradient-to-r from-playful-primary to-purple-600 hover:from-purple-600 hover:to-playful-primary text-white rounded-xl shadow-xs hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={15} />} Save
          Settings
        </button>
      </PageHeader>

      <div className="flex-1 p-6 lg:p-10 bg-transparent">
        <div className="max-w-2xl mx-auto space-y-8">
          <section>
            <h2 className="font-heading font-black text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">
              Appearance
            </h2>
            <div className="bg-white/80 dark:bg-[#141824]/90 border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 shadow-2xs">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                Theme
              </p>
              <div className="flex gap-2.5">
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
                    className={`flex-1 h-11 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all border cursor-pointer ${prefs.theme === opt.value ? 'bg-playful-primary text-white border-transparent shadow-xs' : 'bg-white dark:bg-[#11141E] text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-800 hover:bg-slate-50'}`}
                  >
                    <opt.icon size={15} /> {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-heading font-black text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">
              Editor Settings
            </h2>
            <div className="bg-white/80 dark:bg-[#141824]/90 border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 space-y-5 shadow-2xs">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Default Target Board
                </label>
                <CustomSelect
                  value={prefs.defaultBoard}
                  onChange={(val) => updatePref('defaultBoard', val)}
                  options={BOARDS.map((b) => ({ value: b.fqbn, label: b.label }))}
                  className="w-full"
                />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Font Size —{' '}
                  <span className="text-playful-primary dark:text-playful-highlight font-black">
                    {prefs.editorFontSize}px
                  </span>
                </p>
                <div className="flex gap-2 flex-wrap">
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
            <h2 className="font-heading font-black text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">
              Behavior
            </h2>
            <div className="bg-white/80 dark:bg-[#141824]/90 border border-slate-200/80 dark:border-white/10 rounded-3xl px-6 divide-y divide-slate-100 dark:divide-slate-800 shadow-2xs">
              <ToggleSwitch
                label="Auto Save"
                description="Save your workbench code and blocks automatically"
                checked={prefs.autoSave}
                onChange={(v) => updatePref('autoSave', v)}
              />
              <ToggleSwitch
                label="Code Completion"
                description="Show C++ suggestions and pin tooltips while typing"
                checked={prefs.codeCompletion}
                onChange={(v) => updatePref('codeCompletion', v)}
              />
              <ToggleSwitch
                label="Email Notifications"
                description="Receive alerts about new courses, quest progress, and badges"
                checked={prefs.emailNotifications}
                onChange={(v) => updatePref('emailNotifications', v)}
              />
            </div>
          </section>

          <section>
            <h2 className="font-heading font-black text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">
              Security
            </h2>
            <div className="bg-white/80 dark:bg-[#141824]/90 border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 shadow-2xs">
              <p className="font-heading font-bold text-sm text-tg-dark dark:text-white mb-4">
                Change Password
              </p>
              <form onSubmit={handleChangePassword} className="space-y-3.5">
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
                  className="h-11 px-6 bg-rose-500 hover:bg-rose-600 text-white text-xs font-black rounded-xl transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  {isChangingPwd ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Lock size={15} />
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
