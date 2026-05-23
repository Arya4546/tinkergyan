/**
 * Badges.tsx
 *
 * User's achievement badges — earned and locked.
 */
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
  const [badges, setBadges]   = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/user/badges')
      .then((res: { data: { data: { badges: Badge[] } } }) => setBadges(res.data.data.badges))
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

  const earned = badges.filter((b) => b.earned);
  const locked = badges.filter((b) => !b.earned);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Badges"
        subtitle={`${earned.length} of ${badges.length} earned`}
        icon={Award}
      />

      {/* Earned */}
      {earned.length > 0 && (
        <div>
          <h2 className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-3">
            ✅ Earned
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {earned.map((b) => (
              <div
                key={b.id}
                className="hw-border bg-emerald-500/5 border-emerald-500/30 p-4 flex items-start gap-3"
              >
                <span className="text-2xl">{b.icon}</span>
                <div>
                  <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-emerald-400">
                    {b.title}
                  </h3>
                  <p className="font-mono text-[10px] text-slate-400 mt-1">
                    {b.description}
                  </p>
                  {b.earnedAt && (
                    <p className="font-mono text-[9px] text-slate-500 mt-2 uppercase">
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
          <h2 className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
            <Lock size={10} className="inline mr-1" /> Locked
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {locked.map((b) => (
              <div
                key={b.id}
                className="hw-border bg-slate-50 dark:bg-[#0a0a0a] p-4 flex items-start gap-3 opacity-50"
              >
                <span className="text-2xl grayscale">{b.icon}</span>
                <div>
                  <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-slate-500">
                    {b.title}
                  </h3>
                  <p className="font-mono text-[10px] text-slate-400 mt-1">
                    {b.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
