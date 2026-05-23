/**
 * Leaderboard.tsx
 *
 * Top users ranked by XP. Public page.
 */
import { useEffect, useState } from 'react';
import { Trophy, Medal, Loader2 } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuthStore } from '../stores/auth.store';
import { api } from '../services/api';

interface LeaderboardUser {
  id: string;
  name: string;
  avatar: string | null;
  xp: number;
  level: number;
}

export default function Leaderboard() {
  const [users, setUsers]     = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const currentUserId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    api.get('/user/leaderboard')
      .then((res: { data: { data: { leaderboard: LeaderboardUser[] } } }) => setUsers(res.data.data.leaderboard))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-emerald-500" size={32} />
      </div>
    );
  }

  const rankColor = (i: number) => {
    if (i === 0) return 'text-yellow-400';
    if (i === 1) return 'text-slate-300';
    if (i === 2) return 'text-amber-600';
    return 'text-slate-500';
  };

  const rankBg = (i: number) => {
    if (i === 0) return 'bg-yellow-500/5 border-yellow-500/30';
    if (i === 1) return 'bg-slate-300/5 border-slate-300/30';
    if (i === 2) return 'bg-amber-600/5 border-amber-600/30';
    return '';
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leaderboard"
        subtitle="Top makers by XP"
        icon={Trophy}
      />

      {users.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No rankings yet"
          subtitle="Complete lessons and projects to earn XP and climb the ranks."
        />
      ) : (
        <div className="space-y-2">
          {users.map((u, i) => {
            const isMe = u.id === currentUserId;
            return (
              <div
                key={u.id}
                className={`hw-border flex items-center gap-4 px-4 py-3 transition-colors ${
                  isMe ? 'bg-emerald-500/5 border-emerald-500/40' : rankBg(i)
                }`}
              >
                {/* Rank */}
                <div className={`w-8 text-center font-mono text-sm font-bold ${rankColor(i)}`}>
                  {i < 3 ? <Medal size={18} className={rankColor(i)} /> : `#${i + 1}`}
                </div>

                {/* Avatar */}
                <div className="w-8 h-8 bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-mono text-xs font-bold uppercase text-slate-500">
                  {u.avatar ? (
                    <img src={u.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    u.name.charAt(0)
                  )}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <span className="font-mono text-xs font-bold uppercase tracking-widest text-slate-900 dark:text-white truncate block">
                    {u.name} {isMe && <span className="text-emerald-500 ml-1">(You)</span>}
                  </span>
                  <span className="font-mono text-[10px] text-slate-400 uppercase">
                    Level {u.level}
                  </span>
                </div>

                {/* XP */}
                <div className="font-mono text-sm font-bold text-emerald-500 tabular-nums">
                  {u.xp.toLocaleString()} XP
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
