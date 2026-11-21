import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { adminApi, formatDate, formatDateTime, timeAgo } from '../../lib/admin-api';
import {
  Avatar,
  Card,
  KindPill,
  RolePill,
  StateMessage,
  VisibilityPill,
  StatCard,
  rowCls,
  td,
  th,
} from '../../components/admin/ui';

const Fact = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex justify-between gap-4 py-2 border-t first:border-t-0 border-slate-100 dark:border-white/5 text-sm">
    <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
    <dd className="font-semibold text-right text-slate-800 dark:text-slate-100 break-all">
      {value}
    </dd>
  </div>
);

export default function AdminUserDetail() {
  const { id = '' } = useParams();
  const {
    data: u,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['admin', 'user', id],
    queryFn: () => adminApi.user(id),
    enabled: !!id,
    retry: false,
  });

  const back = (
    <Link
      to="/admin/users"
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white mb-4"
    >
      <ArrowLeft size={15} /> All users
    </Link>
  );

  if (isLoading) return <StateMessage>Loading user…</StateMessage>;
  if (isError || !u) {
    const notFound = (error as { response?: { status?: number } } | null)?.response?.status === 404;
    return (
      <>
        {back}
        <StateMessage>
          {notFound ? 'That user does not exist.' : "Couldn't load this user."}
        </StateMessage>
      </>
    );
  }

  return (
    <>
      {back}
      <div className={`${'flex flex-wrap items-center gap-4 mb-6'}`}>
        <Avatar name={u.name} size={56} />
        <div className="min-w-0">
          <h1 className="font-heading font-black text-2xl truncate">{u.name}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 break-all">{u.email}</p>
        </div>
        <RolePill role={u.role} />
      </div>

      <div className="grid gap-4 grid-cols-2 xl:grid-cols-4">
        <StatCard label="XP" value={u.xp} hint={`Level ${u.level}`} />
        <StatCard label="Streak" value={`${u.streak}d`} tone="amber" />
        <StatCard label="Projects" value={u.totals.projects} tone="sky" />
        <StatCard
          label="Lessons done"
          value={u.totals.completedLessons}
          hint={`${u.totals.badges} badge${u.totals.badges === 1 ? '' : 's'}`}
          tone="emerald"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3 mt-4">
        <Card title="Account">
          <dl className="px-5 py-2">
            <Fact label="User ID" value={<span className="font-mono text-xs">{u.id}</span>} />
            <Fact label="Joined" value={formatDateTime(u.createdAt)} />
            <Fact label="Last active" value={`${timeAgo(u.lastActiveAt)}`} />
            <Fact label="Profile updated" value={formatDate(u.updatedAt)} />
          </dl>
        </Card>
        <Card title="Preferences">
          {u.preferences ? (
            <dl className="px-5 py-2">
              <Fact label="Theme" value={u.preferences.theme} />
              <Fact
                label="Default board"
                value={<span className="font-mono text-xs">{u.preferences.defaultBoard}</span>}
              />
              <Fact label="Editor font size" value={u.preferences.editorFontSize} />
              <Fact label="Auto save" value={u.preferences.autoSave ? 'On' : 'Off'} />
              <Fact label="Code completion" value={u.preferences.codeCompletion ? 'On' : 'Off'} />
              <Fact
                label="Email notifications"
                value={u.preferences.emailNotifications ? 'On' : 'Off'}
              />
            </dl>
          ) : (
            <StateMessage>Never changed — defaults apply.</StateMessage>
          )}
        </Card>
        <Card title={`Badges (${u.badges.length})`}>
          {u.badges.length === 0 ? (
            <StateMessage>No badges yet.</StateMessage>
          ) : (
            <ul className="px-5 py-2">
              {u.badges.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center gap-3 py-2 border-t first:border-t-0 border-slate-100 dark:border-white/5"
                >
                  <span className="text-xl" aria-hidden>
                    {b.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold truncate">{b.title}</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400 truncate">
                      {b.description}
                    </span>
                  </span>
                  <span className="text-xs text-slate-400 whitespace-nowrap">
                    {formatDate(b.earnedAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title={`Courses (${u.enrollments.length})`} className="mt-4">
        {u.enrollments.length === 0 ? (
          <StateMessage>Not enrolled in any course.</StateMessage>
        ) : (
          <ul>
            {u.enrollments.map((e) => (
              <li
                key={e.course.id}
                className="px-5 py-3.5 border-t first:border-t-0 border-slate-100 dark:border-white/5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <span className="text-sm font-semibold">{e.course.title}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {e.completedLessons}/{e.totalLessons} lessons · enrolled{' '}
                    {formatDate(e.enrolledAt)}
                  </span>
                </div>
                <div
                  className="h-2 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden"
                  role="progressbar"
                  aria-valuenow={e.percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${e.percent}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card
        title={`Projects (${u.projects.length})`}
        className="mt-4"
        action={
          u.projects.length > 0 ? (
            <Link
              to={`/admin/projects?userId=${u.id}`}
              className="text-xs font-semibold text-purple-600 dark:text-playful-highlight"
            >
              Open in projects list
            </Link>
          ) : undefined
        }
      >
        {u.projects.length === 0 ? (
          <StateMessage>No projects yet.</StateMessage>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr>
                  <th className={th}>Project</th>
                  <th className={th}>Type</th>
                  <th className={th}>Board</th>
                  <th className={th}>Visibility</th>
                  <th className={th}>Updated</th>
                  <th className={th}>Created</th>
                </tr>
              </thead>
              <tbody>
                {u.projects.map((p) => (
                  <tr key={p.id} className={rowCls}>
                    <td className={td}>
                      <Link
                        to={`/admin/projects/${p.id}`}
                        className="font-semibold hover:text-purple-600 dark:hover:text-playful-highlight"
                      >
                        {p.title}
                      </Link>
                    </td>
                    <td className={td}>
                      <KindPill kind={p.kind} />
                    </td>
                    <td className={`${td} font-mono text-xs`}>{p.boardTarget}</td>
                    <td className={td}>
                      <VisibilityPill isPublic={p.isPublic} />
                    </td>
                    <td className={`${td} whitespace-nowrap`}>{timeAgo(p.updatedAt)}</td>
                    <td className={`${td} whitespace-nowrap`}>{formatDate(p.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
