import { useEffect, useState, type ReactNode } from 'react';
import type { Guest, Invitation, Task } from './types';

const TEXT = {
  controlCenter: '\u0043\u006f\u006e\u0074\u0072\u006f\u006c \u0063\u0065\u006e\u0074\u0065\u0072',
  emptySparkle: '\u2726',
  loading: '\u05d8\u05d5\u05e2\u05df \u05e0\u05ea\u05d5\u05e0\u05d9\u05dd...',
  pending: '\u05de\u05de\u05ea\u05d9\u05df',
  going: '\u05de\u05d2\u05d9\u05e2',
  maybe: '\u05d0\u05d5\u05dc\u05d9',
  notGoing: '\u05dc\u05d0 \u05de\u05d2\u05d9\u05e2',
  noDate: '\u05dc\u05dc\u05d0 \u05ea\u05d0\u05e8\u05d9\u05da',
  bureaucracy: '\u05d1\u05d9\u05e8\u05d5\u05e7\u05e8\u05d8\u05d9\u05d4',
  vendors: '\u05e1\u05e4\u05e7\u05d9\u05dd',
  attire: '\u05dc\u05d1\u05d5\u05e9',
  logistics: '\u05dc\u05d5\u05d2\u05d9\u05e1\u05d8\u05d9\u05e7\u05d4',
  extras: '\u05d0\u05e7\u05e1\u05d8\u05e8\u05d5\u05ea',
  groom: '\u05e6\u05d3 \u05d7\u05ea\u05df',
  bride: '\u05e6\u05d3 \u05db\u05dc\u05d4',
  mutual: '\u05e9\u05e0\u05d9 \u05d4\u05e6\u05d3\u05d3\u05d9\u05dd',
  family: '\u05de\u05e9\u05e4\u05d7\u05d4',
  friends: '\u05d7\u05d1\u05e8\u05d9\u05dd',
  work: '\u05e2\u05d1\u05d5\u05d3\u05d4',
  other: '\u05d0\u05d7\u05e8',
  none: '\u05dc\u05dc\u05d0',
  meat: '\u05d1\u05e9\u05e8',
  chicken: '\u05e2\u05d5\u05e3',
  vegan: '\u05d8\u05d1\u05e2\u05d5\u05e0\u05d9',
  kids: '\u05d9\u05dc\u05d3\u05d9\u05dd',
};

export function PageContainer({
  title,
  subtitle,
  loading,
  error,
  children,
}: {
  title: string;
  subtitle: string;
  loading?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.34em] text-gold-700">{TEXT.controlCenter}</p>
          <h1 className="mt-2 text-3xl font-bold text-stone-900 md:text-4xl">{title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-500 md:text-base">{subtitle}</p>
        </div>
      </div>
      {error && <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}
      {loading ? <LoadingBlock /> : children}
    </div>
  );
}

export function SectionCard({ title, kicker, children }: { title: string; kicker: string; children: ReactNode }) {
  return (
    <section className="card rounded-[32px] border border-[#ece2d2] bg-white/85 p-5 shadow-warm md:p-6">
      <div className="mb-5">
        <p className="text-xs uppercase tracking-[0.34em] text-stone-400">{kicker}</p>
        <h2 className="mt-2 text-2xl font-bold text-stone-900">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  note,
  tone,
  compact,
  className,
}: {
  label: string;
  value: string | number;
  note: string;
  tone: 'gold' | 'dark' | 'emerald' | 'rose';
  compact?: boolean;
  className?: string;
}) {
  const toneClass = {
    gold: 'from-[#f7eccd] to-[#fffaf0] border-[#e4d2a5]',
    dark: 'from-stone-950 to-stone-800 border-stone-800 text-white',
    emerald: 'from-emerald-50 to-white border-emerald-200',
    rose: 'from-rose-50 to-white border-rose-200',
  }[tone];
  const noteClass = tone === 'dark' ? 'text-stone-300' : 'text-stone-500';
  const valueClass = tone === 'dark' ? 'text-white' : 'text-stone-900';

  if (compact) {
    return (
      <div className={`rounded-[24px] border bg-gradient-to-br px-4 py-3.5 shadow-warm-sm flex flex-col justify-center ${toneClass} ${className ?? ''}`}>
        <div className="flex items-baseline justify-between gap-2">
          <p className={`text-xs font-semibold uppercase tracking-[0.22em] leading-none ${noteClass}`}>{label}</p>
          <p className={`text-2xl font-bold tabular-nums leading-none shrink-0 ${valueClass}`}>{value}</p>
        </div>
        <p className={`mt-1.5 text-xs leading-snug ${noteClass}`}>{note}</p>
      </div>
    );
  }

  return (
    <div className={`rounded-[28px] border bg-gradient-to-br px-5 py-5 shadow-warm-sm flex flex-col justify-between min-h-[116px] ${toneClass} ${className ?? ''}`}>
      <p className={`text-xs uppercase tracking-[0.3em] ${noteClass}`}>{label}</p>
      <div>
        <p className={`text-4xl font-bold leading-none ${valueClass}`}>{value}</p>
        <p className={`mt-2 text-sm ${noteClass}`}>{note}</p>
      </div>
    </div>
  );
}

export function MiniMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[24px] border border-[#ece2d2] bg-[#fcfbf8] px-4 py-4 shadow-warm-xs">
      <p className="text-xs uppercase tracking-[0.24em] text-stone-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-stone-900">{value}</p>
    </div>
  );
}

export function ProgressRow({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = Math.round((value / total) * 100);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-semibold text-stone-700">{label}</span>
        <span className="text-stone-500">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-stone-100">
        <div className="h-full rounded-full bg-gradient-to-l from-gold-500 to-gold-300" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex min-h-[180px] flex-col items-center justify-center rounded-[28px] border border-dashed border-[#e0d5c0] bg-[#faf8f2] px-6 text-center">
      <div className="text-4xl">{TEXT.emptySparkle}</div>
      <p className="mt-4 text-lg font-bold text-stone-900">{title}</p>
      <p className="mt-2 max-w-md text-sm leading-6 text-stone-500">{text}</p>
    </div>
  );
}

export function LoadingBlock() {
  return (
    <div className="flex min-h-[240px] items-center justify-center rounded-[30px] border border-dashed border-[#e2d6bf] bg-[#fbfaf6]">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-stone-200 border-t-gold-500" />
        <p className="mt-4 text-sm font-medium text-stone-500">{TEXT.loading}</p>
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-stone-700">{label}</span>
      {children}
    </label>
  );
}

export function SmartNumberInput({
  value,
  onChange,
  min = 0,
  max,
  className = 'input',
  placeholder = '0',
}: {
  value: number | string;
  onChange: (value: number | string) => void;
  min?: number;
  max?: number;
  className?: string;
  placeholder?: string;
}) {
  const isStringMode = typeof value === 'string';
  const normalizeFromValue = (nextValue: number | string) => {
    if (nextValue === '' || nextValue === 0 || nextValue === '0') {
      return '';
    }

    return String(nextValue);
  };

  const [displayValue, setDisplayValue] = useState(normalizeFromValue(value));

  useEffect(() => {
    setDisplayValue(normalizeFromValue(value));
  }, [value]);

  const clampValue = (rawValue: string) => {
    if (rawValue === '') {
      return rawValue;
    }

    let numericValue = Number(rawValue);

    if (Number.isFinite(min)) {
      numericValue = Math.max(min, numericValue);
    }

    if (typeof max === 'number') {
      numericValue = Math.min(max, numericValue);
    }

    return String(numericValue);
  };

  return (
    <input
      className={className}
      type="text"
      inputMode="numeric"
      dir="ltr"
      value={displayValue}
      placeholder={placeholder}
      onFocus={(event) => {
        if (event.currentTarget.value) {
          event.currentTarget.select();
        }
      }}
      onChange={(event) => {
        const digitsOnly = event.target.value.replace(/[^\d]/g, '');
        setDisplayValue(digitsOnly);
        onChange(isStringMode ? digitsOnly : digitsOnly === '' ? 0 : Number(digitsOnly));
      }}
      onBlur={() => {
        const normalized = clampValue(displayValue);
        setDisplayValue(normalized);
        onChange(isStringMode ? normalized : normalized === '' ? 0 : Number(normalized));
      }}
    />
  );
}

export function StatusPill({ status }: { status: Invitation['rsvpStatus'] }) {
  const map = {
    pending: 'border-stone-200 bg-white text-stone-600',
    going: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    maybe: 'border-amber-200 bg-amber-50 text-amber-700',
    not_going: 'border-rose-200 bg-rose-50 text-rose-700',
  };
  const label = {
    pending: TEXT.pending,
    going: TEXT.going,
    maybe: TEXT.maybe,
    not_going: TEXT.notGoing,
  };
  return <span className={`badge ${map[status]}`}>{label[status]}</span>;
}

export function formatDate(value?: string | null) {
  if (!value) return TEXT.noDate;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return TEXT.noDate;
  return new Intl.DateTimeFormat('he-IL', { dateStyle: 'medium' }).format(date);
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(value || 0);
}

export function categoryLabel(category: Task['category']) {
  return {
    bureaucracy: TEXT.bureaucracy,
    vendors: TEXT.vendors,
    attire: TEXT.attire,
    logistics: TEXT.logistics,
    extras: TEXT.extras,
  }[category];
}

export function sideLabel(side: Invitation['side']) {
  return {
    groom: TEXT.groom,
    bride: TEXT.bride,
    mutual: TEXT.mutual,
  }[side];
}

export function seatingSideLabel(side: string) {
  return {
    groom: TEXT.groom,
    bride: TEXT.bride,
    both: TEXT.mutual,
  }[side as 'groom' | 'bride' | 'both'] || TEXT.mutual;
}

export function groupLabel(group: Invitation['group']) {
  return {
    family: TEXT.family,
    friends: TEXT.friends,
    work: TEXT.work,
    other: TEXT.other,
  }[group];
}

export function mealLabel(meal?: Guest['mealPreference']) {
  if (!meal) return TEXT.none;
  return {
    none: TEXT.none,
    meat: TEXT.meat,
    chicken: TEXT.chicken,
    vegan: TEXT.vegan,
    kids: TEXT.kids,
  }[meal];
}
