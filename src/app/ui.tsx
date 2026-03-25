import type { ReactNode } from 'react';
import type { Guest, Invitation, Task } from './types';

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
          <p className="text-xs uppercase tracking-[0.34em] text-gold-700">Control center</p>
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

export function StatCard({ label, value, note, tone }: { label: string; value: string | number; note: string; tone: 'gold' | 'dark' | 'emerald' | 'rose' }) {
  const toneClass = {
    gold: 'from-[#f7eccd] to-[#fffaf0] border-[#e4d2a5]',
    dark: 'from-stone-950 to-stone-800 border-stone-800 text-white',
    emerald: 'from-emerald-50 to-white border-emerald-200',
    rose: 'from-rose-50 to-white border-rose-200',
  }[tone];
  const noteClass = tone === 'dark' ? 'text-stone-300' : 'text-stone-500';
  const valueClass = tone === 'dark' ? 'text-white' : 'text-stone-900';

  return (
    <div className={`rounded-[28px] border bg-gradient-to-br px-5 py-5 shadow-warm-sm ${toneClass}`}>
      <p className={`text-xs uppercase tracking-[0.3em] ${noteClass}`}>{label}</p>
      <p className={`mt-4 text-4xl font-bold ${valueClass}`}>{value}</p>
      <p className={`mt-3 text-sm ${noteClass}`}>{note}</p>
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
      <div className="text-4xl">✦</div>
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
        <p className="mt-4 text-sm font-medium text-stone-500">טוען נתונים...</p>
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

export function StatusPill({ status }: { status: Invitation['rsvpStatus'] }) {
  const map = {
    pending: 'border-stone-200 bg-white text-stone-600',
    going: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    maybe: 'border-amber-200 bg-amber-50 text-amber-700',
    not_going: 'border-rose-200 bg-rose-50 text-rose-700',
  };
  const label = {
    pending: 'ממתין',
    going: 'מגיע',
    maybe: 'אולי',
    not_going: 'לא מגיע',
  };
  return <span className={`badge ${map[status]}`}>{label[status]}</span>;
}

export function formatDate(value?: string | null) {
  if (!value) return 'ללא תאריך';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'ללא תאריך';
  return new Intl.DateTimeFormat('he-IL', { dateStyle: 'medium' }).format(date);
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(value || 0);
}

export function categoryLabel(category: Task['category']) {
  return {
    bureaucracy: 'בירוקרטיה',
    vendors: 'ספקים',
    attire: 'לבוש',
    logistics: 'לוגיסטיקה',
    extras: 'אקסטרות',
  }[category];
}

export function sideLabel(side: Invitation['side']) {
  return {
    groom: 'צד חתן',
    bride: 'צד כלה',
    mutual: 'שני הצדדים',
  }[side];
}

export function groupLabel(group: Invitation['group']) {
  return {
    family: 'משפחה',
    friends: 'חברים',
    work: 'עבודה',
    other: 'אחר',
  }[group];
}

export function mealLabel(meal?: Guest['mealPreference']) {
  if (!meal) return 'ללא';
  return {
    none: 'ללא',
    meat: 'בשר',
    chicken: 'עוף',
    vegan: 'טבעוני',
    kids: 'ילדים',
  }[meal];
}
