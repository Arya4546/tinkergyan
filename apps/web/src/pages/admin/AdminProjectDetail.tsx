import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { adminApi, formatBytes, formatDateTime, parseBlockState } from '../../lib/admin-api';
import { Card, KindPill, RolePill, StateMessage, VisibilityPill } from '../../components/admin/ui';

const Fact = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex justify-between gap-4 py-2 border-t first:border-t-0 border-slate-100 dark:border-white/5 text-sm">
    <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
    <dd className="font-semibold text-right text-slate-800 dark:text-slate-100 break-all">
      {value}
    </dd>
  </div>
);

const Code = ({ children, label }: { children: string; label: string }) => (
  <pre
    aria-label={label}
    className="m-0 max-h-[28rem] overflow-auto px-5 py-4 text-xs leading-relaxed font-mono bg-slate-50 dark:bg-black/30 text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-all"
  >
    {children}
  </pre>
);

const ClassChips = ({ title, names }: { title: string; names: string[] }) =>
  names.length === 0 ? null : (
    <div className="px-5 py-3 border-t first:border-t-0 border-slate-100 dark:border-white/5">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
        {title}
      </p>
      <div className="flex flex-wrap gap-2">
        {names.map((n) => (
          <span
            key={n}
            className="rounded-lg bg-slate-100 dark:bg-white/10 px-2.5 py-1 text-sm font-semibold"
          >
            {n}
          </span>
        ))}
      </div>
    </div>
  );

export default function AdminProjectDetail() {
  const { id = '' } = useParams();
  const [showRaw, setShowRaw] = useState(false);
  const {
    data: p,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['admin', 'project', id],
    queryFn: () => adminApi.project(id),
    enabled: !!id,
    retry: false,
  });
  const state = useMemo(() => (p ? parseBlockState(p.blockState) : null), [p]);

  const back = (
    <Link
      to="/admin/projects"
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white mb-4"
    >
      <ArrowLeft size={15} /> All projects
    </Link>
  );

  if (isLoading) return <StateMessage>Loading project…</StateMessage>;
  if (isError || !p || !state) {
    const notFound = (error as { response?: { status?: number } } | null)?.response?.status === 404;
    return (
      <>
        {back}
        <StateMessage>
          {notFound ? 'That project does not exist.' : "Couldn't load this project."}
        </StateMessage>
      </>
    );
  }

  const hasAi =
    p.kind === 'ai' ||
    state.imageClasses.length +
      state.audioClasses.length +
      state.poseClasses.length +
      state.textClasses.length >
      0;
  const datasetTotal =
    state.datasetBytes.image + state.datasetBytes.audio + state.datasetBytes.pose;

  return (
    <>
      {back}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <h1 className="font-heading font-black text-2xl break-all">{p.title}</h1>
        <KindPill kind={p.kind} />
        <VisibilityPill isPublic={p.isPublic} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Details">
          <dl className="px-5 py-2">
            <Fact
              label="Owner"
              value={
                <Link to={`/admin/users/${p.user.id}`} className="hover:underline">
                  {p.user.name}
                </Link>
              }
            />
            <Fact label="Owner email" value={p.user.email} />
            <Fact label="Owner role" value={<RolePill role={p.user.role} />} />
            <Fact label="Format" value={p.type === 'BLOCK' ? 'Blocks' : 'Code'} />
            <Fact
              label="Board"
              value={<span className="font-mono text-xs">{p.boardTarget}</span>}
            />
            <Fact label="Forks" value={p.forkCount} />
            {p.forkedFrom && (
              <Fact
                label="Forked from"
                value={
                  <Link
                    to={`/admin/projects/${p.forkedFrom}`}
                    className="hover:underline font-mono text-xs"
                  >
                    {p.forkedFrom}
                  </Link>
                }
              />
            )}
            <Fact label="Created" value={formatDateTime(p.createdAt)} />
            <Fact label="Last saved" value={formatDateTime(p.updatedAt)} />
            <Fact label="Project ID" value={<span className="font-mono text-xs">{p.id}</span>} />
          </dl>
        </Card>

        <div className="lg:col-span-2 flex flex-col gap-4">
          {hasAi && (
            <Card title="AI Studio content">
              <div className="px-5 py-3 text-sm text-slate-600 dark:text-slate-300 flex flex-wrap gap-x-6 gap-y-1">
                {state.aiKind && (
                  <span>
                    Model type: <b className="capitalize">{state.aiKind}</b>
                  </span>
                )}
                {state.aiTab && (
                  <span>
                    Last tab: <b className="capitalize">{state.aiTab}</b>
                  </span>
                )}
                <span>
                  Saved dataset: <b>{datasetTotal ? formatBytes(datasetTotal) : 'none'}</b>
                </span>
              </div>
              <ClassChips
                title={`Image classes (${state.imageClasses.length})`}
                names={state.imageClasses}
              />
              <ClassChips
                title={`Audio classes (${state.audioClasses.length})`}
                names={state.audioClasses}
              />
              <ClassChips
                title={`Pose classes (${state.poseClasses.length})`}
                names={state.poseClasses}
              />
              {state.textClasses.map((c) => (
                <div
                  key={c.name}
                  className="px-5 py-3 border-t border-slate-100 dark:border-white/5"
                >
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                    Text class “{c.name}” · {c.sentences.length} sentences
                  </p>
                  <ul className="list-disc pl-5 text-sm space-y-0.5">
                    {c.sentences.map((s, i) => (
                      <li key={i} className="break-words">
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {state.imageClasses.length +
                state.audioClasses.length +
                state.poseClasses.length +
                state.textClasses.length ===
                0 && (
                <p className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-white/5">
                  No classes were saved in this project.
                </p>
              )}
            </Card>
          )}

          {p.code && (
            <Card title="Code">
              <Code label="Project code">{p.code}</Code>
            </Card>
          )}

          <Card title="Blocks (Blockly XML)">
            {state.blockXml ? (
              <Code label="Blockly XML">{state.blockXml}</Code>
            ) : (
              <StateMessage>No blocks saved.</StateMessage>
            )}
            {state.spriteCount > 0 && (
              <p className="px-5 py-3 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-white/5">
                {state.spriteCount} simulator sprite{state.spriteCount === 1 ? '' : 's'} saved with
                this project.
              </p>
            )}
          </Card>

          <Card
            title="Raw saved data"
            action={
              <button
                onClick={() => setShowRaw((v) => !v)}
                className="text-xs font-semibold text-purple-600 dark:text-playful-highlight"
              >
                {showRaw ? 'Hide' : `Show (${formatBytes(state.raw.length)})`}
              </button>
            }
          >
            {showRaw ? (
              <Code label="Raw blockState">
                {state.raw.length > 200_000
                  ? `${state.raw.slice(0, 200_000)}\n… truncated`
                  : state.raw}
              </Code>
            ) : (
              <p className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400">
                Exactly what is stored in the database for this project.
              </p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
