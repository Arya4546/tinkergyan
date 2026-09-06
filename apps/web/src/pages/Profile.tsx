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
import { Loader } from '../components/ui/Loader';
import { useUIStore } from '../stores/ui.store';
import { getAvatarGradient } from '../lib/avatar';

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
        <Loader message="Loading maker identity..." />
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
      color: 'bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400',
    },
    {
      label: 'Level',
      value: profile.level,
      icon: Zap,
      color: 'bg-purple-100 dark:bg-purple-950/50 text-playful-primary dark:text-playful-highlight',
    },
    {
      label: 'Day Streak',
      value: profile.streak,
      icon: Zap,
      color: 'bg-rose-100 dark:bg-rose-950/50 text-playful-secondary',
    },
    {
      label: 'Projects Built',
      value: profile.projectCount,
      icon: FolderCode,
      color: 'bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400',
    },
  ];

  return (
    <div className="w-full h-full flex flex-col font-playful overflow-y-auto bg-transparent">
      <PageHeader icon={User} title="My Profile" subtitle="Manage your maker identity and stats" />

      <div className="flex-1 p-6 lg:p-10 bg-transparent">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Profile Card */}
          <div className="bg-white/80 dark:bg-[#141824]/90 border border-slate-200/80 dark:border-white/10 rounded-3xl overflow-hidden shadow-2xs">
            <div className="p-6 sm:p-8 flex flex-col sm:flex-row gap-6 items-start">
              {/* Avatar */}
              <div
                className={`w-20 h-20 rounded-3xl flex items-center justify-center shrink-0 shadow-sm border-2 border-white dark:border-slate-800 ${!profile.avatar ? getAvatarGradient(profile.name) : 'bg-slate-200 dark:bg-slate-700'}`}
              >
                {profile.avatar ? (
                  <img
                    src={profile.avatar}
                    alt=""
                    className="w-full h-full object-cover rounded-3xl"
                  />
                ) : (
                  <span className="text-3xl font-heading font-black">
                    {profile.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              <div className="flex-1 space-y-5 w-full">
                {/* Name edit */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                    Display Name
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 h-11 px-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#11141E] text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-playful-primary transition-all"
                    />
                    <button
                      onClick={() => {
                        void handleSaveName();
                      }}
                      disabled={isSaving || editName === profile.name || !editName.trim()}
                      className="h-11 px-5 bg-gradient-to-r from-playful-primary to-purple-600 hover:from-purple-600 hover:to-playful-primary text-white text-xs font-black rounded-xl transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shrink-0 cursor-pointer"
                    >
                      {isSaving ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Save size={15} />
                      )}
                      Save
                    </button>
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                    Email Address
                  </label>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {profile.email}
                  </p>
                </div>

                {/* Join date */}
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                  <Calendar size={14} />
                  Joined {joinDate}
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div>
            <h2 className="font-heading font-black text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">
              Your Stats
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="bg-white/80 dark:bg-[#141824]/90 border border-slate-200/80 dark:border-white/10 rounded-3xl p-5 flex flex-col gap-3 shadow-2xs hover:shadow-lg hover:-translate-y-1 transition-all"
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${stat.color}`}
                  >
                    <stat.icon size={18} />
                  </div>
                  <div>
                    <p className="font-heading font-black text-2xl text-tg-dark dark:text-white">
                      {stat.value}
                    </p>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                      {stat.label}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Info */}
          <div className="bg-white/80 dark:bg-[#141824]/90 border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xs">
            <h2 className="font-heading font-black text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-5">
              Activity
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-2">
                  <GraduationCap size={15} /> Quests Enrolled
                </p>
                <p className="font-heading font-black text-2xl text-tg-dark dark:text-white">
                  {profile.enrollmentCount}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Last Active
                </p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
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
