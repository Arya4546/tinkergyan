import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { adminApi, formatDate, timeAgo } from '../../lib/admin-api';
import {
  Card,
  KindPill,
  Pager,
  PageTitle,
  SearchBox,
  Select,
  StateMessage,
  VisibilityPill,
  rowCls,
  td,
  th,
} from '../../components/admin/ui';

const PAGE_SIZE = 20;

export default function AdminProjects() {
  const [params, setParams] = useSearchParams();
  const search = params.get('search') ?? '';
  const kind = params.get('kind') ?? '';
  const visibility = params.get('visibility') ?? '';
  const userId = params.get('userId') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);

  const set = useCallback(
    (patch: Record<string, string>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(patch)) {
            if (v) next.set(k, v);
            else next.delete(k);
          }
          if (!('page' in patch)) next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ['admin', 'projects', { search, kind, visibility, userId, page }],
    queryFn: () =>
      adminApi.projects({ search, kind, visibility, userId, page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageTitle title="Projects" subtitle={data ? `${data.total} projects` : 'All projects'}>
        <SearchBox
          value={search}
          onChange={(v) => set({ search: v })}
          placeholder="Search title or owner"
        />
        <Select
          label="Type"
          value={kind}
          onChange={(v) => set({ kind: v })}
          options={[
            { value: '', label: 'All types' },
            { value: 'hardware', label: 'Hardware' },
            { value: 'software', label: 'Software' },
            { value: 'python', label: 'Python' },
            { value: 'ai', label: 'AI Studio' },
          ]}
        />
        <Select
          label="Visibility"
          value={visibility}
          onChange={(v) => set({ visibility: v })}
          options={[
            { value: '', label: 'Public & private' },
            { value: 'public', label: 'Public' },
            { value: 'private', label: 'Private' },
          ]}
        />
      </PageTitle>

      {userId && (
        <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
          Showing one user's projects.{' '}
          <button className="underline font-semibold" onClick={() => set({ userId: '' })}>
            Show everyone's
          </button>
        </p>
      )}

      <Card className={isFetching && !isLoading ? 'opacity-70 transition-opacity' : ''}>
        {isLoading ? (
          <StateMessage>Loading projects…</StateMessage>
        ) : isError || !data ? (
          <StateMessage>Couldn't load projects.</StateMessage>
        ) : data.projects.length === 0 ? (
          <StateMessage>No projects match.</StateMessage>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px]">
                <thead>
                  <tr>
                    <th className={th}>Project</th>
                    <th className={th}>Type</th>
                    <th className={th}>Owner</th>
                    <th className={th}>Board</th>
                    <th className={th}>Visibility</th>
                    <th className={th}>Forks</th>
                    <th className={th}>Updated</th>
                    <th className={th}>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {data.projects.map((p) => (
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
                      <td className={td}>
                        <Link
                          to={`/admin/users/${p.user.id}`}
                          className="block min-w-0 hover:underline"
                        >
                          <span className="block truncate">{p.user.name}</span>
                          <span className="block text-xs text-slate-500 dark:text-slate-400 truncate">
                            {p.user.email}
                          </span>
                        </Link>
                      </td>
                      <td className={`${td} font-mono text-xs`}>{p.boardTarget}</td>
                      <td className={td}>
                        <VisibilityPill isPublic={p.isPublic} />
                      </td>
                      <td className={`${td} tabular-nums`}>{p.forkCount}</td>
                      <td className={`${td} whitespace-nowrap`}>{timeAgo(p.updatedAt)}</td>
                      <td className={`${td} whitespace-nowrap`}>{formatDate(p.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager
              page={data.page}
              pageSize={data.pageSize}
              total={data.total}
              onPage={(p) => set({ page: String(p) })}
            />
          </>
        )}
      </Card>
    </>
  );
}
