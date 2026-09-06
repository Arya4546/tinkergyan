import { useEffect, useState } from 'react';
import { Trophy, Medal } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Loader } from '../components/ui/Loader';
import { useAuthStore } from '../stores/auth.store';
import { api } from '../services/api';
import { getAvatarGradient } from '../lib/avatar';

interface LeaderboardUser {
  id: string;
  name: string;
  avatar: string | null;
  xp: number;
  level: number;
}

const rankStyles = [
  {
    bg: 'bg-amber-50/90 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700/60 shadow-sm',
    medal: 'text-amber-500 fill-amber-500',
    label: '1st',
  },
  {
    bg: 'bg-purple-50/90 dark:bg-purple-950/30 border-purple-300 dark:border-purple-700/60 shadow-sm',
    medal: 'text-purple-500 fill-purple-400',
    label: '2nd',
  },
  {
    bg: 'bg-rose-50/90 dark:bg-rose-950/30 border-rose-300 dark:border-rose-700/60 shadow-sm',
    medal: 'text-rose-500 fill-rose-400',
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
        <Loader message="Summoning top makers..." />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col font-playful bg-transparent">
      <PageHeader
        icon={Trophy}
        title="Leaderboard"
        subtitle="Top makers ranked by experience points"
      />

      <div className="flex-1 overflow-y-auto p-6 lg:p-10 bg-transparent">
        {users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/40 text-amber-500 border border-amber-200/60 dark:border-amber-800/60 rounded-3xl flex items-center justify-center mb-4">
              <Trophy size={28} />
            </div>
            <p className="font-heading font-black text-xl text-tg-dark dark:text-white mb-1">
              No rankings yet
            </p>
            <p className="text-sm font-medium text-slate-400">
              Complete lessons and projects to earn XP and climb the leaderboard!
            </p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-3">
            {users.map((u, i) => {
              const isMe = u.id === currentUserId;
              const isTop3 = i < 3;
              const style = isTop3 ? rankStyles[i] : null;

              return (
                <div
                  key={u.id}
                  className={`flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all ${
                    isMe
                      ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-700 shadow-sm ring-2 ring-purple-500/20'
                      : isTop3 && style
                        ? `${style.bg}`
                        : 'bg-white/80 dark:bg-[#141824]/90 border-slate-200/80 dark:border-white/10 hover:border-purple-300 shadow-2xs'
                  }`}
                >
                  {/* Rank */}
                  <div className="w-8 text-center shrink-0">
                    {i < 3 ? (
                      <Medal size={22} className={rankStyles[i]?.medal ?? 'text-slate-400'} />
                    ) : (
                      <span className="font-heading font-black text-sm text-slate-400">
                        #{i + 1}
                      </span>
                    )}
                  </div>

                  {/* Avatar */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm overflow-hidden shrink-0 border border-slate-200/60 dark:border-white/10 ${!u.avatar ? getAvatarGradient(u.name) : 'bg-slate-200 dark:bg-slate-700'}`}
                  >
                    {u.avatar ? (
                      <img src={u.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      u.name.charAt(0).toUpperCase()
                    )}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className="font-heading font-bold text-sm text-tg-dark dark:text-white truncate">
                      {u.name}{' '}
                      {isMe && (
                        <span className="text-playful-primary dark:text-playful-highlight font-black text-xs ml-1">
                          (You)
                        </span>
                      )}
                    </p>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Level {u.level}
                    </p>
                  </div>

                  {/* XP */}
                  <div className="font-heading font-black text-base text-tg-dark dark:text-white tabular-nums shrink-0">
                    {u.xp.toLocaleString()}{' '}
                    <span className="text-xs font-bold text-playful-primary dark:text-playful-highlight">
                      XP
                    </span>
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
