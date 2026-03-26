import { useEffect, useState } from 'react';
import { apiRequest } from '../app/api';
import { useAuth } from '../app/auth';
import type { AlcoholEstimate, Guest, Invitation, SeatingPlan, Task, Warning } from '../app/types';
import { categoryLabel, EmptyState, MiniMetric, PageContainer, SectionCard, StatCard, formatDate } from '../app/ui';

type RsvpSlice = {
  key: Invitation['rsvpStatus'];
  label: string;
  value: number;
  color: string;
};

function getWeddingCountdown(weddingDate?: string) {
  if (!weddingDate) {
    return { value: '--', note: 'אין תאריך חתונה מוגדר' };
  }

  const parsed = new Date(weddingDate);
  if (Number.isNaN(parsed.getTime())) {
    return { value: '--', note: 'תאריך החתונה לא תקין' };
  }

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfWeddingDay = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  const daysUntilWedding = Math.ceil((startOfWeddingDay.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilWedding > 0) {
    return { value: daysUntilWedding, note: `עד ${formatDate(weddingDate)}` };
  }

  if (daysUntilWedding === 0) {
    return { value: 'היום', note: 'החתונה מתקיימת היום' };
  }

  return { value: Math.abs(daysUntilWedding), note: `עברו ${Math.abs(daysUntilWedding)} ימים מהאירוע` };
}

export function DashboardPage() {
  const { token, wedding } = useAuth();
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [alcohol, setAlcohol] = useState<AlcoholEstimate | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [plan, setPlan] = useState<SeatingPlan>({ tables: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [warningsRes, alcoholRes, invitationsRes, guestsRes, tasksRes, planRes] = await Promise.all([
          apiRequest<{ warnings: Warning[] }>('/api/wedding/warnings', {}, token),
          apiRequest<AlcoholEstimate>('/api/wedding/alcohol-calculator', {}, token),
          apiRequest<Invitation[]>('/api/invitations', {}, token),
          apiRequest<Guest[]>('/api/guests', {}, token),
          apiRequest<Task[]>('/api/tasks', {}, token),
          apiRequest<SeatingPlan>('/api/seating/plan', {}, token),
        ]);
        setWarnings(warningsRes.warnings);
        setAlcohol(alcoholRes);
        setInvitations(invitationsRes);
        setGuests(guestsRes);
        setTasks(tasksRes);
        setPlan(planRes);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'שגיאה בטעינת הדשבורד');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [token]);

  const goingInvitations = invitations.filter((invitation) => invitation.rsvpStatus === 'going').length;
  const completion = tasks.length ? Math.round((tasks.filter((task) => task.isDone).length / tasks.length) * 100) : 0;
  const rsvpSlices: RsvpSlice[] = [
    { key: 'going', label: 'מגיעים', value: invitations.filter((invitation) => invitation.rsvpStatus === 'going').length, color: '#22c55e' },
    { key: 'pending', label: 'ממתינים', value: invitations.filter((invitation) => invitation.rsvpStatus === 'pending').length, color: '#eab308' },
    { key: 'maybe', label: 'אולי', value: invitations.filter((invitation) => invitation.rsvpStatus === 'maybe').length, color: '#f97316' },
    { key: 'not_going', label: 'לא מגיעים', value: invitations.filter((invitation) => invitation.rsvpStatus === 'not_going').length, color: '#f43f5e' },
  ];
  const totalInvitations = Math.max(invitations.length, 1);
  const confirmedPct = Math.round((rsvpSlices[0].value / totalInvitations) * 100);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const weddingCountdown = getWeddingCountdown(wedding?.weddingDate);
  let offsetCursor = 0;

  return (
    <PageContainer
      title={`שלום ${wedding?.coupleName || ''}`}
      subtitle="היום אתם מסתכלים על החתונה כמערכת אחת: תגובות, ישיבה, כסף ולוגיסטיקה."
      loading={loading}
      error={error}
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-[1.8fr_1fr_1fr_1fr_1fr]">
        <StatCard label="ימים לחתונה" value={weddingCountdown.value} note={weddingCountdown.note} tone="gold" className="col-span-2 lg:col-span-1" />
        <StatCard compact label="הזמנות פעילות" value={invitations.length} note={`${goingInvitations} אישרו הגעה`} tone="dark" />
        <StatCard compact label="אורחים במערכת" value={guests.length} note={`${plan.tables.length} שולחנות בתוכנית`} tone="gold" />
        <StatCard compact label="משימות הושלמו" value={`${completion}%`} note={`${tasks.filter((task) => task.isDone).length}/${tasks.length || 0}`} tone="emerald" />
        <StatCard compact label="התראות" value={warnings.length} note={warnings[0]?.message || 'כרגע שקט'} tone="rose" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard title="פוקוס להיום" kicker="Smart warnings">
          {warnings.length === 0 ? (
            <EmptyState title="המערכת נקייה" text="אין כרגע חריגות דחופות. זה הזמן להתקדם עם משימות ו-RSVP." />
          ) : (
            <div className="space-y-3">
              {warnings.map((warning) => (
                <div key={warning.type} className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                  <p className="font-semibold text-stone-900">{warning.message}</p>
                  <p className="mt-1 text-sm text-stone-500">{warning.count ? `כמות: ${warning.count}` : 'דורש בדיקה ידנית'}</p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="אלכוהול מחושב" kicker="Israeli averages">
          {alcohol ? (
            <div className="grid grid-cols-2 gap-3">
              <MiniMetric label="בירה" value={alcohol.beer_bottles} />
              <MiniMetric label="יין" value={alcohol.wine_bottles} />
              <MiniMetric label="וודקה" value={alcohol.vodka_bottles} />
              <MiniMetric label="וויסקי" value={alcohol.whiskey_bottles} />
              <MiniMetric label="ערק" value={alcohol.arak_bottles} />
              <MiniMetric label="מאושרים" value={alcohol.confirmedAdults} />
            </div>
          ) : (
            <EmptyState title="אין נתון עדיין" text="ברגע שיהיו מאושרי הגעה, יופיעו כאן כמויות מומלצות." />
          )}
        </SectionCard>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <SectionCard title="RSVP לפי סטטוס" kicker="Invitation funnel">
          <div className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)] md:items-center">
            <div className="flex flex-col items-center justify-center">
              <div className="relative">
                <svg width="160" height="160" viewBox="0 0 160 160" className="-rotate-90 overflow-visible">
                  <circle cx="80" cy="80" r={radius} fill="none" stroke="#f1ece2" strokeWidth="14" />
                  {rsvpSlices
                    .filter((slice) => slice.value > 0)
                    .map((slice) => {
                      const segmentLength = (slice.value / totalInvitations) * circumference;
                      const dashArray = `${segmentLength} ${circumference - segmentLength}`;
                      const dashOffset = -offsetCursor;
                      offsetCursor += segmentLength;

                      return (
                        <circle
                          key={slice.key}
                          cx="80"
                          cy="80"
                          r={radius}
                          fill="none"
                          stroke={slice.color}
                          strokeWidth="14"
                          strokeLinecap="round"
                          strokeDasharray={dashArray}
                          strokeDashoffset={dashOffset}
                        />
                      );
                    })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-bold text-stone-900">{confirmedPct}%</span>
                  <span className="mt-1 text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">אישרו</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {rsvpSlices.map((slice) => {
                const pct = Math.round((slice.value / totalInvitations) * 100);
                return (
                  <div key={slice.key} className="rounded-[24px] border border-[#ece2d2] bg-[#fcfbf8] px-4 py-3 shadow-warm-xs">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: slice.color }} />
                        <span className="font-semibold text-stone-800">{slice.label}</span>
                      </div>
                      <div className="text-left">
                        <div className="text-lg font-bold text-stone-900">{pct}%</div>
                        <div className="text-xs text-stone-400">
                          {slice.value} מתוך {invitations.length}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="משימות קרובות" kicker="Next moves">
          {tasks.length === 0 ? (
            <EmptyState title="אין משימות" text="המערכת תתחיל להתמלא ברגע שתוסיפו פעילויות." />
          ) : (
            <div className="space-y-3">
              {tasks.slice(0, 5).map((task) => (
                <div key={task._id} className="flex items-center justify-between rounded-2xl border border-[#eee5d6] bg-[#fbfaf7] px-4 py-3">
                  <div>
                    <p className={`font-semibold ${task.isDone ? 'line-through text-stone-400' : 'text-stone-900'}`}>{task.title}</p>
                    <p className="text-sm text-stone-500">
                      {formatDate(task.dueDate)} · {categoryLabel(task.category)}
                    </p>
                  </div>
                  <span className={`badge ${task.isDone ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-stone-200 bg-white text-stone-600'}`}>
                    {task.isDone ? 'בוצע' : 'פתוח'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </PageContainer>
  );
}
