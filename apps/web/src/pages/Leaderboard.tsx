import { useEffect, useState } from 'react';
import { Trophy, Medal, Loader2 } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { useAuthStore } from '../stores/auth.store';
import { api } from '../services/api';

interface LeaderboardUser {
  id: string;
  name: string;
  avatar: string | null;
  xp: number;
  level: number;
}

const rankStyles = [
  {
    bg: 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-900/30',
    medal: 'text-amber-500',
    label: '1st',
  },
  {
    bg: 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700',
    medal: 'text-slate-400',
    label: '2nd',
  },
  {
    bg: 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-900/30',
    medal: 'text-orange-600',
    label: '3rd',
  },
];

export default function Leaderboard() {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const currentUserId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    api
      .get('/user/leaderboard')
      .then((res: { data: { data: { leaderboard: LeaderboardUser[] } } }) =>
        setUsers(res.data.data.leaderboard),
      )
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-emerald-500" size={28} />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      <PageHeader icon={Trophy} title="Leaderboard" subtitle="Top makers ranked by XP" />

      <div className="flex-1 overflow-y-auto p-6 lg:p-10 bg-white dark:bg-[#111111]">
        {users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
              <Trophy size={24} className="text-slate-400" />
            </div>
            <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">No rankings yet</p>
            <p className="text-sm text-slate-400">
              Complete lessons and projects to earn XP and climb the ranks.
            </p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-2">
            {users.map((u, i) => {
              const isMe = u.id === currentUserId;
              const isTop3 = i < 3;
              const style = isTop3 ? rankStyles[i] : null;

              return (
                <div
                  key={u.id}
                  className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl border transition-all ${
                    isMe
                      ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800'
                      : isTop3 && style
                        ? `${style.bg}`
                        : 'bg-white dark:bg-[#1a1a1a] border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {/* Rank */}
                  <div className="w-8 text-center shrink-0">
                    {i < 3 ? (
                      <Medal size={20} className={rankStyles[i]?.medal ?? 'text-slate-400'} />
                    ) : (
                      <span className="text-sm font-bold text-slate-400">#{i + 1}</span>
                    )}
                  </div>

                  {/* Avatar */}
                  <div className="w-9 h-9 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center font-bold text-sm text-slate-600 dark:text-slate-300 overflow-hidden shrink-0">
                    {u.avatar ? (
                      <img src={u.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      u.name.charAt(0).toUpperCase()
                    )}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                      {u.name}{' '}
                      {isMe && <span className="text-emerald-500 font-bold text-xs">(You)</span>}
                    </p>
                    <p className="text-xs text-slate-500">Level {u.level}</p>
                  </div>

                  {/* XP */}
                  <div className="font-bold text-sm text-slate-900 dark:text-white tabular-nums shrink-0">
                    {u.xp.toLocaleString()}{' '}
                    <span className="text-xs font-semibold text-slate-400">XP</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
