import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { getAvatarGradient } from '../../lib/avatar';
import { KIND_LABEL, ROLE_LABEL } from '../../lib/admin-api';
import type { ProjectKind, Role } from '../../lib/admin-api';

export const card =
  'rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0F172A] shadow-2xs';

export function Card({
  title,
  action,
  children,
  className = '',
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`${card} ${className}`}>
      {title && (
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-100 dark:border-white/10">
          <h2 className="font-heading font-bold text-sm text-slate-800 dark:text-slate-100">
            {title}
          </h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = 'purple',
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: 'purple' | 'emerald' | 'sky' | 'amber' | 'rose';
}) {
  const bar = {
    purple: 'bg-purple-500',
    emerald: 'bg-emerald-500',
    sky: 'bg-sky-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
  }[tone];
  return (
    <div className={`${card} relative overflow-hidden p-5`}>
      <span className={`absolute left-0 top-0 h-full w-1 ${bar}`} />
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1.5 text-3xl font-black font-heading text-slate-900 dark:text-white">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  );
}

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <span
      className={`shrink-0 rounded-full flex items-center justify-center font-bold ${getAvatarGradient(name)}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {(name.trim()[0] ?? '?').toUpperCase()}
    </span>
  );
}

const pill = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold';

export function RolePill({ role }: { role: Role }) {
  const tone =
    role === 'SUPER_ADMIN'
      ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
      : role === 'ADMIN'
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
        : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300';
  return <span className={`${pill} ${tone}`}>{ROLE_LABEL[role]}</span>;
}

export function KindPill({ kind }: { kind: ProjectKind }) {
  const tone = {
    ai: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
    software: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
    hardware: 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300',
  }[kind];
  return <span className={`${pill} ${tone}`}>{KIND_LABEL[kind]}</span>;
}

export function VisibilityPill({ isPublic }: { isPublic: boolean }) {
  return (
    <span
      className={`${pill} ${
        isPublic
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
          : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'
      }`}
    >
      {isPublic ? 'Public' : 'Private'}
    </span>
  );
}

/** Text input that reports its value after the user stops typing. */
export function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const [local, setLocal] = useState(value);
  // Follow the URL when it changes from outside (e.g. back button, reset).
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    setLocal(value);
  }
  useEffect(() => {
    if (local === value) return;
    const t = setTimeout(() => onChange(local), 300);
    return () => clearTimeout(t);
  }, [local, value, onChange]);

  return (
    <label className="relative block w-full sm:w-72">
      <Search
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
      />
      <input
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0F172A] text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
      />
    </label>
  );
}

export function Select({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  label: string;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 px-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0F172A] text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Pager({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const btn =
    'h-8 w-8 rounded-lg border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-40 disabled:pointer-events-none';
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-slate-100 dark:border-white/10 text-xs text-slate-500 dark:text-slate-400">
      <span>
        {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-2">
        <button
          className={btn}
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="tabular-nums">
          Page {page} / {pages}
        </span>
        <button
          className={btn}
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

export const th =
  'px-5 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 whitespace-nowrap';
export const td = 'px-5 py-3 text-sm text-slate-700 dark:text-slate-200 align-middle';
export const rowCls =
  'border-t border-slate-100 dark:border-white/5 hover:bg-slate-50/80 dark:hover:bg-white/[0.03]';

export function StateMessage({ children }: { children: ReactNode }) {
  return (
    <div className="px-5 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
      {children}
    </div>
  );
}

export function PageTitle({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
      <div>
        <h1 className="font-heading font-black text-2xl text-slate-900 dark:text-white">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
