import { useEffect, useState } from 'react';
import {
  User,
  Zap,
  TrendingUp,
  FolderCode,
  GraduationCap,
  Save,
  Loader2,
  Calendar,
} from 'lucide-react';
import { useAuthStore } from '../stores/auth.store';
import { api } from '../services/api';
import { PageHeader } from '../components/ui/PageHeader';
import { useUIStore } from '../stores/ui.store';

interface ProfileData {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  xp: number;
  level: number;
  streak: number;
  lastActiveAt: string;
  role: string;
  createdAt: string;
  projectCount: number;
  enrollmentCount: number;
}

export default function Profile() {
  const authUser = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const addToast = useUIStore((s) => s.addToast);

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [isSaving, setSaving] = useState(false);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const response = await api.get<{ data: { profile: ProfileData } }>('/user/profile');
        const p = response.data.data.profile;
        setProfile(p);
        setEditName(p.name);
      } catch {
        addToast({ type: 'error', title: 'Error', message: 'Could not load profile.' });
      } finally {
        setLoading(false);
      }
    })();
  }, [addToast]);

  const handleSaveName = async () => {
    if (!editName.trim() || editName === profile?.name) return;
    setSaving(true);
    try {
      const response = await api.patch<{ data: { profile: { name: string } } }>('/user/profile', {
        name: editName.trim(),
      });
      const updated = response.data.data.profile;
      setProfile((prev) => (prev ? { ...prev, name: updated.name } : null));
      if (authUser) setUser({ ...authUser, name: updated.name });
      addToast({ type: 'success', title: 'Profile updated', message: 'Your name has been saved.' });
    } catch {
      addToast({ type: 'error', title: 'Error', message: 'Could not update profile.' });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-emerald-500" size={28} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-red-500 font-medium">Failed to load profile. Please refresh.</p>
      </div>
    );
  }

  const joinDate = new Date(profile.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const stats = [
    {
      label: 'Total XP',
      value: profile.xp.toLocaleString(),
      icon: TrendingUp,
      color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    },
    {
      label: 'Level',
      value: profile.level,
      icon: Zap,
      color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Day Streak',
      value: profile.streak,
      icon: Zap,
      color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
    },
    {
      label: 'Projects',
      value: profile.projectCount,
      icon: FolderCode,
      color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    },
  ];

  return (
    <div className="w-full h-full flex flex-col overflow-y-auto">
      <PageHeader icon={User} title="My Profile" subtitle="Manage your account details" />

      <div className="flex-1 p-6 lg:p-10 bg-white dark:bg-[#111111]">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Profile Card */}
          <div className="bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-6 flex flex-col sm:flex-row gap-6 items-start">
              {/* Avatar */}
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center shrink-0">
                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {profile.name.charAt(0).toUpperCase()}
                </span>
              </div>

              <div className="flex-1 space-y-5">
                {/* Name edit */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Display Name
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111111] text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                    <button
                      onClick={() => {
                        void handleSaveName();
                      }}
                      disabled={isSaving || editName === profile.name || !editName.trim()}
                      className="h-10 px-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-semibold rounded-xl hover:bg-emerald-500 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shrink-0"
                    >
                      {isSaving ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Save size={14} />
                      )}
                      Save
                    </button>
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Email Address
                  </label>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {profile.email}
                  </p>
                </div>

                {/* Join date */}
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Calendar size={14} />
                  Joined {joinDate}
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div>
            <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
              Your Stats
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col gap-3"
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${stat.color}`}
                  >
                    <stat.icon size={16} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                      {stat.value}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Info */}
          <div className="bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
            <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-5">
              Activity
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-2">
                  <GraduationCap size={14} /> Courses Enrolled
                </p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">
                  {profile.enrollmentCount}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Last Active
                </p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {new Date(profile.lastActiveAt).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
