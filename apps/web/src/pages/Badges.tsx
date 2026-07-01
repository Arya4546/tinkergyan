import { useEffect, useState } from 'react';
import { Award, Lock, Loader2 } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { api } from '../services/api';

interface Badge {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  triggerType: string;
  earned: boolean;
  earnedAt: string | null;
}

export default function Badges() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/user/badges')
      .then((res: { data: { data: { badges: Badge[] } } }) => setBadges(res.data.data.badges))
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

  const earned = badges.filter((b) => b.earned);
  const locked = badges.filter((b) => !b.earned);

  return (
    <div className="w-full h-full flex flex-col">
      <PageHeader
        icon={Award}
        title="Achievements"
        subtitle={`${earned.length} of ${badges.length} earned`}
      />

      <div className="flex-1 overflow-y-auto p-6 lg:p-10 bg-white dark:bg-[#111111]">
        {/* Earned */}
        {earned.length > 0 && (
          <div className="mb-10">
            <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full" />
              Earned ({earned.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {earned.map((b) => (
                <div
                  key={b.id}
                  className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-900/30 rounded-2xl p-5 flex items-start gap-4"
                >
                  <span className="text-3xl shrink-0">{b.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base text-slate-900 dark:text-white mb-1">
                      {b.title}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                      {b.description}
                    </p>
                    {b.earnedAt && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-2">
                        Earned {new Date(b.earnedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Locked */}
        {locked.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Lock size={12} />
              Locked ({locked.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {locked.map((b) => (
                <div
                  key={b.id}
                  className="bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-start gap-4 opacity-50"
                >
                  <span className="text-3xl shrink-0 grayscale">{b.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base text-slate-700 dark:text-slate-300 mb-1">
                      {b.title}
                    </h3>
                    <p className="text-sm text-slate-400 leading-relaxed">{b.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {badges.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
              <Award size={24} className="text-slate-400" />
            </div>
            <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
              No achievements yet
            </p>
            <p className="text-sm text-slate-400">Complete courses and projects to earn badges.</p>
          </div>
        )}
      </div>
    </div>
  );
}
