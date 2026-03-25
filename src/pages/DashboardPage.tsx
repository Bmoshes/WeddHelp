import { useEffect, useState } from 'react';
import { apiRequest } from '../app/api';
import { useAuth } from '../app/auth';
import type { AlcoholEstimate, Guest, Invitation, SeatingPlan, Task, Warning } from '../app/types';
import { categoryLabel, EmptyState, MiniMetric, PageContainer, ProgressRow, SectionCard, StatCard, formatDate } from '../app/ui';

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

  return (
    <PageContainer title={`שלום ${wedding?.coupleName || ''}`} subtitle="היום אתם מסתכלים על חתונה כמערכת אחת: תגובות, ישיבה, כסף ולוגיסטיקה." loading={loading} error={error}>
      <div className="grid gap-4 lg:grid-cols-4">
        <StatCard label="הזמנות פעילות" value={invitations.length} note={`${goingInvitations} אישרו הגעה`} tone="dark" />
        <StatCard label="אורחים במערכת" value={guests.length} note={`${plan.tables.length} שולחנות בתוכנית`} tone="gold" />
        <StatCard label="משימות הושלמו" value={`${completion}%`} note={`${tasks.filter((task) => task.isDone).length}/${tasks.length || 0}`} tone="emerald" />
        <StatCard label="התראות" value={warnings.length} note={warnings[0]?.message || 'כרגע שקט'} tone="rose" />
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
          <div className="space-y-3">
            {[
              ['pending', 'ממתינים'],
              ['going', 'מגיעים'],
              ['maybe', 'אולי'],
              ['not_going', 'לא מגיעים'],
            ].map(([status, label]) => (
              <ProgressRow key={status} label={label} value={invitations.filter((invitation) => invitation.rsvpStatus === status).length} total={Math.max(invitations.length, 1)} />
            ))}
          </div>
        </SectionCard>

        <SectionCard title="משימות קרובות" kicker="Next moves">
          {tasks.length === 0 ? (
            <EmptyState title="אין משימות" text="המערכת תתחיל להתמלא ברגע שתוסיפו פעילות." />
          ) : (
            <div className="space-y-3">
              {tasks.slice(0, 5).map((task) => (
                <div key={task._id} className="flex items-center justify-between rounded-2xl border border-[#eee5d6] bg-[#fbfaf7] px-4 py-3">
                  <div>
                    <p className={`font-semibold ${task.isDone ? 'line-through text-stone-400' : 'text-stone-900'}`}>{task.title}</p>
                    <p className="text-sm text-stone-500">{formatDate(task.dueDate)} · {categoryLabel(task.category)}</p>
                  </div>
                  <span className={`badge ${task.isDone ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-stone-200 bg-white text-stone-600'}`}>{task.isDone ? 'בוצע' : 'פתוח'}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </PageContainer>
  );
}
