import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { adminApi, formatDate, timeAgo } from '../../lib/admin-api';
import {
  Avatar,
  Card,
  Pager,
  PageTitle,
  RolePill,
  SearchBox,
  Select,
  StateMessage,
  rowCls,
  td,
  th,
} from '../../components/admin/ui';

const PAGE_SIZE = 20;

export default function AdminUsers() {
  const [params, setParams] = useSearchParams();
  const search = params.get('search') ?? '';
  const role = params.get('role') ?? '';
  const sort = params.get('sort') ?? 'newest';
  const page = Math.max(1, Number(params.get('page')) || 1);

  const set = useCallback(
    (patch: Record<string, string>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(patch)) {
            if (v && v !== 'newest') next.set(k, v);
            else next.delete(k);
          }
          // Any filter change goes back to page 1.
          if (!('page' in patch)) next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ['admin', 'users', { search, role, sort, page }],
    queryFn: () => adminApi.users({ search, role, sort, page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageTitle title="Users" subtitle={data ? `${data.total} accounts` : 'All accounts'}>
        <SearchBox
          value={search}
          onChange={(v) => set({ search: v })}
          placeholder="Search name or email"
        />
        <Select
          label="Role"
          value={role}
          onChange={(v) => set({ role: v })}
          options={[
            { value: '', label: 'All roles' },
            { value: 'USER', label: 'Students' },
            { value: 'SUPER_ADMIN', label: 'Super admins' },
          ]}
        />
        <Select
          label="Sort"
          value={sort}
          onChange={(v) => set({ sort: v })}
          options={[
            { value: 'newest', label: 'Newest first' },
            { value: 'oldest', label: 'Oldest first' },
            { value: 'xp', label: 'Most XP' },
            { value: 'active', label: 'Recently active' },
            { value: 'name', label: 'Name A–Z' },
          ]}
        />
      </PageTitle>

      <Card className={isFetching && !isLoading ? 'opacity-70 transition-opacity' : ''}>
        {isLoading ? (
          <StateMessage>Loading users…</StateMessage>
        ) : isError || !data ? (
          <StateMessage>Couldn't load users.</StateMessage>
        ) : data.users.length === 0 ? (
          <StateMessage>No users match.</StateMessage>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px]">
                <thead>
                  <tr>
                    <th className={th}>User</th>
                    <th className={th}>Role</th>
                    <th className={th}>Projects</th>
                    <th className={th}>Courses</th>
                    <th className={th}>XP / Level</th>
                    <th className={th}>Streak</th>
                    <th className={th}>Last active</th>
                    <th className={th}>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((u) => (
                    <tr key={u.id} className={rowCls}>
                      <td className={td}>
                        <Link to={`/admin/users/${u.id}`} className="flex items-center gap-3 group">
                          <Avatar name={u.name} />
                          <span className="min-w-0">
                            <span className="block font-semibold truncate group-hover:text-purple-600 dark:group-hover:text-playful-highlight">
                              {u.name}
                            </span>
                            <span className="block text-xs text-slate-500 dark:text-slate-400 truncate">
                              {u.email}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className={td}>
                        <RolePill role={u.role} />
                      </td>
                      <td className={`${td} tabular-nums`}>{u.projectCount}</td>
                      <td className={`${td} tabular-nums`}>{u.enrollmentCount}</td>
                      <td className={`${td} tabular-nums`}>
                        {u.xp} <span className="text-slate-400">· Lv {u.level}</span>
                      </td>
                      <td className={`${td} tabular-nums`}>{u.streak}d</td>
                      <td className={`${td} whitespace-nowrap`}>{timeAgo(u.lastActiveAt)}</td>
                      <td className={`${td} whitespace-nowrap`}>{formatDate(u.createdAt)}</td>
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
