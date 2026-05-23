/**
 * Profile.tsx
 *
 * User profile page showing identity, stats, and editable name.
 */
import { useEffect, useState } from 'react';
import { User, Zap, Activity, Cpu, FolderCode, GraduationCap, Save, Loader2, Calendar } from 'lucide-react';

import { useAuthStore } from '../stores/auth.store';
import { api } from '../services/api';
import { PageHeader } from '../components/ui/PageHeader';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useUIStore } from '../stores/ui.store';
import { Loader } from '../components/ui/Loader';

interface ProfileData {
  id:              string;
  name:            string;
  email:           string;
  avatar:          string | null;
  xp:              number;
  level:           number;
  streak:          number;
  lastActiveAt:    string;
  role:            string;
  createdAt:       string;
  projectCount:    number;
  enrollmentCount: number;
}

export default function Profile() {
  const authUser = useAuthStore((s) => s.user);
  const setUser  = useAuthStore((s) => s.setUser);
  const addToast = useUIStore((s: any) => s.addToast);

  const [profile, setProfile]   = useState<ProfileData | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [isSaving, setSaving]   = useState(false);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/user/profile');
        const p = data.data.profile as ProfileData;
        setProfile(p);
        setEditName(p.name);
      } catch {
        addToast({ type: 'error', title: 'LOAD_FAILED', message: 'Could not load profile.' });
      } finally {
        setLoading(false);
      }
    })();
  }, [addToast]);

  const handleSaveName = async () => {
    if (!editName.trim() || editName === profile?.name) return;
    setSaving(true);
    try {
      const { data } = await api.patch('/user/profile', { name: editName.trim() });
      const updated = data.data.profile;
      setProfile((prev) => prev ? { ...prev, name: updated.name } : null);
      // Sync auth store
      if (authUser) setUser({ ...authUser, name: updated.name });
      addToast({ type: 'success', title: 'PROFILE_UPDATED', message: 'Name saved.' });
    } catch {
      addToast({ type: 'error', title: 'SAVE_FAILED', message: 'Could not update profile.' });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader message="LOADING_PROFILE..." />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="font-mono text-xs text-red-400 uppercase">PROFILE_LOAD_ERROR</p>
      </div>
    );
  }

  const joinDate = new Date(profile.createdAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="w-full h-full flex flex-col overflow-y-auto">
      <PageHeader icon={User} title="ID Card" subtitle="OPERATOR_PROFILE" />

      <div className="flex-1 p-6 lg:p-10 bg-white dark:bg-[#0A0A0A]">
        <div className="max-w-3xl mx-auto space-y-8">

          {/* Identity Card */}
          <div className="hw-border bg-slate-50 dark:bg-[#111111] overflow-hidden">
            <div className="bg-slate-900 dark:bg-white px-6 py-4 flex items-center justify-between">
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-white dark:text-slate-900">
                OPERATOR_DOSSIER
              </span>
              <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 uppercase">
                {profile.role}
              </span>
            </div>

            <div className="p-6 flex flex-col sm:flex-row gap-6">
              {/* Avatar */}
              <div className="w-20 h-20 bg-slate-900 dark:bg-white flex items-center justify-center shrink-0">
                <span className="font-mono font-bold text-3xl text-white dark:text-slate-900">
                  {profile.name.charAt(0).toUpperCase()}
                </span>
              </div>

              <div className="flex-1 space-y-4">
                {/* Name edit */}
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <Input
                      label="DISPLAY_NAME"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-12 px-4 rounded-none border border-slate-900 dark:border-slate-800 shrink-0"
                    onClick={handleSaveName}
                    disabled={isSaving || editName === profile.name}
                  >
                    {isSaving
                      ? <Loader2 size={12} className="animate-spin mr-2" />
                      : <Save size={12} className="mr-2" />
                    }
                    <span className="font-mono text-[10px] font-bold uppercase">Save</span>
                  </Button>
                </div>

                {/* Email (read-only) */}
                <div>
                  <span className="block font-mono text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-widest">
                    EMAIL_ADDRESS
                  </span>
                  <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                    {profile.email}
                  </span>
                </div>

                {/* Join date */}
                <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400 uppercase tracking-widest">
                  <Calendar size={10} /> Joined {joinDate}
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'XP_TOTAL',    value: profile.xp,              icon: Activity, color: 'text-yellow-400' },
              { label: 'LEVEL',       value: profile.level,           icon: Cpu,      color: 'text-emerald-400' },
              { label: 'STREAK',      value: `${profile.streak}d`,    icon: Zap,      color: 'text-orange-400' },
              { label: 'PROJECTS',    value: profile.projectCount,    icon: FolderCode, color: 'text-blue-400' },
            ].map((stat) => (
              <div key={stat.label} className="hw-border bg-slate-50 dark:bg-[#111111] p-5 flex flex-col relative overflow-hidden group">
                <div className="absolute right-2 bottom-2 opacity-5 group-hover:opacity-10 transition-opacity">
                  <stat.icon size={60} />
                </div>
                <span className="font-mono text-[10px] text-slate-500 tracking-widest uppercase mb-2">
                  {stat.label}
                </span>
                <span className={`font-mono text-3xl font-bold tracking-tighter ${stat.color}`}>
                  {stat.value}
                </span>
              </div>
            ))}
          </div>

          {/* Additional Info */}
          <div className="hw-border bg-slate-50 dark:bg-[#111111] p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <span className="block font-mono text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-widest">
                  COURSES_ENROLLED
                </span>
                <div className="flex items-center gap-2">
                  <GraduationCap size={14} className="text-emerald-500" />
                  <span className="font-mono text-lg font-bold text-slate-900 dark:text-white">
                    {profile.enrollmentCount}
                  </span>
                </div>
              </div>
              <div>
                <span className="block font-mono text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-widest">
                  LAST_ACTIVE
                </span>
                <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                  {new Date(profile.lastActiveAt).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
