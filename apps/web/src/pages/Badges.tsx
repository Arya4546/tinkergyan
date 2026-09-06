import { useEffect, useState } from 'react';
import { Award, Lock } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Loader } from '../components/ui/Loader';
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
        <Loader message="Checking maker achievements..." />
      </div>
    );
  }

  const earned = badges.filter((b) => b.earned);
  const locked = badges.filter((b) => !b.earned);

  return (
    <div className="w-full h-full flex flex-col font-playful bg-transparent">
      <PageHeader
        icon={Award}
        title="Achievements"
        subtitle={`${earned.length} of ${badges.length} maker badges earned`}
      />

      <div className="flex-1 overflow-y-auto p-6 lg:p-10 bg-transparent">
        {/* Earned */}
        {earned.length > 0 && (
          <div className="mb-10">
            <h2 className="font-heading font-black text-xs text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse" />
              Earned Badges ({earned.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {earned.map((b) => (
                <div
                  key={b.id}
                  className="bg-gradient-to-br from-amber-50/80 via-white/80 to-purple-50/50 dark:from-amber-950/20 dark:via-[#141824]/90 dark:to-purple-950/20 border border-amber-300/70 dark:border-amber-700/60 rounded-3xl p-6 flex items-start gap-4 shadow-2xs hover:shadow-xl hover:-translate-y-1 transition-all"
                >
                  <span className="text-4xl shrink-0 drop-shadow-sm">{b.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-heading font-black text-lg text-tg-dark dark:text-white mb-1">
                      {b.title}
                    </h3>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                      {b.description}
                    </p>
                    {b.earnedAt && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 font-extrabold mt-3">
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
            <h2 className="font-heading font-black text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Lock size={13} />
              Locked Badges ({locked.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {locked.map((b) => (
                <div
                  key={b.id}
                  className="bg-white/40 dark:bg-[#141824]/40 border border-slate-200/50 dark:border-white/5 rounded-3xl p-6 flex items-start gap-4 opacity-60 hover:opacity-80 transition-opacity"
                >
                  <span className="text-4xl shrink-0 grayscale">{b.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-heading font-black text-lg text-slate-700 dark:text-slate-300 mb-1">
                      {b.title}
                    </h3>
                    <p className="text-xs font-medium text-slate-400 leading-relaxed">
                      {b.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {badges.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-purple-50 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-800/60 rounded-3xl flex items-center justify-center mb-4 text-playful-primary dark:text-playful-highlight">
              <Award size={28} />
            </div>
            <p className="font-heading font-black text-xl text-tg-dark dark:text-white mb-1">
              No achievements yet
            </p>
            <p className="text-sm font-medium text-slate-400">
              Complete quests and maker projects to earn badges!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
