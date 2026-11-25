import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { adminApi, KIND_LABEL, timeAgo } from '../../lib/admin-api';
import {
  Avatar,
  Card,
  KindPill,
  PageTitle,
  RolePill,
  StateMessage,
  StatCard,
} from '../../components/admin/ui';

export default function AdminOverview() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: adminApi.stats,
  });

  if (isLoading) return <StateMessage>Loading overview…</StateMessage>;
  if (isError || !data) {
    return (
      <StateMessage>
        Couldn't load the overview.{' '}
        <button className="underline font-semibold" onClick={() => void refetch()}>
          Try again
        </button>
      </StateMessage>
    );
  }

  const { users, projects, learning, signupsByDay } = data;
  const maxSignups = Math.max(1, ...signupsByDay.map((d) => d.count));
  const mix = [
    { key: 'hardware', n: projects.hardware, bar: 'bg-purple-500' },
    { key: 'software', n: projects.software, bar: 'bg-sky-500' },
    { key: 'python', n: projects.python ?? 0, bar: 'bg-amber-500' },
    { key: 'ai', n: projects.ai, bar: 'bg-rose-500' },
  ] as const;

  return (
    <>
      <PageTitle title="Overview" subtitle="Everything happening on TinkerGyan at a glance." />

      <div className="grid gap-4 grid-cols-2 xl:grid-cols-4">
        <StatCard label="Students" value={users.total} hint={`+${users.new7d} this week`} />
        <StatCard
          label="Active this week"
          value={users.active7d}
          hint={`${users.new30d} joined in 30 days`}
          tone="emerald"
        />
        <StatCard
          label="Projects"
          value={projects.total}
          hint={`${projects.public} shared in the gallery`}
          tone="sky"
        />
        <StatCard
          label="Enrollments"
          value={learning.enrollments}
          hint={`${learning.completedLessons} lessons completed`}
          tone="amber"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3 mt-4">
        <Card title="New students, last 14 days" className="lg:col-span-2">
          <div className="p-5">
            <div className="flex items-end gap-1.5 h-36" role="img" aria-label="Sign-ups per day">
              {signupsByDay.map((d) => (
                <div
                  key={d.date}
                  className="flex-1 flex flex-col items-center justify-end h-full gap-1"
                >
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">
                    {d.count || ''}
                  </span>
                  <div
                    title={`${d.date}: ${d.count}`}
                    className="w-full rounded-t-md bg-purple-500/80 dark:bg-purple-400/80 min-h-[3px]"
                    style={{ height: `${(d.count / maxSignups) * 100}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-[10px] text-slate-400">
              <span>{signupsByDay[0]?.date.slice(5)}</span>
              <span>{signupsByDay[signupsByDay.length - 1]?.date.slice(5)}</span>
            </div>
          </div>
        </Card>

        <Card title="Projects by type">
          <div className="p-5 flex flex-col gap-4">
            {mix.map((m) => (
              <div key={m.key}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {KIND_LABEL[m.key]}
                  </span>
                  <span className="tabular-nums text-slate-500 dark:text-slate-400">{m.n}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${m.bar}`}
                    style={{ width: `${projects.total ? (m.n / projects.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {learning.publishedCourses} of {learning.totalCourses} courses published
            </p>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 mt-4">
        <Card
          title="Newest accounts"
          action={
            <Link
              to="/admin/users"
              className="text-xs font-semibold text-purple-600 dark:text-playful-highlight"
            >
              All users
            </Link>
          }
        >
          <ul>
            {data.recentUsers.map((u) => (
              <li
                key={u.id}
                className="border-t first:border-t-0 border-slate-100 dark:border-white/5"
              >
                <Link
                  to={`/admin/users/${u.id}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                >
                  <Avatar name={u.name} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold truncate">{u.name}</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400 truncate">
                      {u.email}
                    </span>
                  </span>
                  <RolePill role={u.role} />
                  <span className="text-xs text-slate-400 whitespace-nowrap">
                    {timeAgo(u.createdAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card
          title="Recently updated projects"
          action={
            <Link
              to="/admin/projects"
              className="text-xs font-semibold text-purple-600 dark:text-playful-highlight"
            >
              All projects
            </Link>
          }
        >
          <ul>
            {data.recentProjects.length === 0 && <StateMessage>No projects yet.</StateMessage>}
            {data.recentProjects.map((p) => (
              <li
                key={p.id}
                className="border-t first:border-t-0 border-slate-100 dark:border-white/5"
              >
                <Link
                  to={`/admin/projects/${p.id}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold truncate">{p.title}</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400 truncate">
                      by {p.user.name}
                    </span>
                  </span>
                  <KindPill kind={p.kind} />
                  <span className="text-xs text-slate-400 whitespace-nowrap">
                    {timeAgo(p.updatedAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
