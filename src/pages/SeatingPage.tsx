import { useEffect, useState } from 'react';
import { apiRequest } from '../app/api';
import { useAuth } from '../app/auth';
import type { SeatingPlan, Warning } from '../app/types';
import { EmptyState, Field, mealLabel, PageContainer, SectionCard } from '../app/ui';

export function SeatingPage() {
  const { token } = useAuth();
  const [plan, setPlan] = useState<SeatingPlan>({ tables: [] });
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [config, setConfig] = useState({ tableCapacity: 12, knightEnabled: false, knightCount: 1, knightCapacity: 20, knightGroupNames: '' });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [planRes, warningsRes] = await Promise.all([
        apiRequest<SeatingPlan>('/api/seating/plan', {}, token),
        apiRequest<{ warnings: Warning[] }>('/api/wedding/warnings', {}, token),
      ]);
      setPlan(planRes);
      setWarnings(warningsRes.warnings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינה');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [token]);

  const handleOptimize = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await apiRequest<{ message: string; tablesCount: number; seatedGuests: number }>('/api/seating/optimize', {
        method: 'POST',
        body: JSON.stringify({
          tableCapacity: Number(config.tableCapacity),
          knightConfig: config.knightEnabled ? { enabled: true, count: Number(config.knightCount), capacity: Number(config.knightCapacity) } : { enabled: false, count: 0, capacity: 20 },
          knightGroupNames: config.knightGroupNames.split(',').map((item) => item.trim()).filter(Boolean),
        }),
      }, token);
      setMessage(`${response.message} · ${response.tablesCount} שולחנות · ${response.seatedGuests} אורחים`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בהרצת האופטימיזציה');
    } finally {
      setBusy(false);
    }
  };

  const handleClear = async () => {
    setBusy(true);
    try {
      await apiRequest('/api/seating/plan', { method: 'DELETE' }, token);
      setMessage('תוכנית ההושבה נוקתה.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בניקוי התוכנית');
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageContainer title="סידורי ישיבה" subtitle="המסך הזה מנהל את ההרצה מול ה-backend החדש, בלי לגעת במנוע ההושבה הקיים." loading={loading} error={error}>
      <div className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
        <SectionCard title="בקרת אופטימיזציה" kicker="Backend seating bridge">
          <div className="space-y-4">
            <Field label="קיבולת שולחן רגיל"><input className="input" type="number" min="1" max="50" value={config.tableCapacity} onChange={(event) => setConfig({ ...config, tableCapacity: Number(event.target.value) })} /></Field>
            <label className="flex items-center gap-3 rounded-2xl border border-[#ece2d2] bg-[#fcfbf8] px-4 py-3">
              <input type="checkbox" checked={config.knightEnabled} onChange={(event) => setConfig({ ...config, knightEnabled: event.target.checked })} />
              <span className="font-medium">להפעיל שולחנות אבירים</span>
            </label>
            {config.knightEnabled && <>
              <div className="grid grid-cols-2 gap-4">
                <Field label="כמות שולחנות אבירים"><input className="input" type="number" min="1" value={config.knightCount} onChange={(event) => setConfig({ ...config, knightCount: Number(event.target.value) })} /></Field>
                <Field label="קיבולת שולחן אבירים"><input className="input" type="number" min="1" value={config.knightCapacity} onChange={(event) => setConfig({ ...config, knightCapacity: Number(event.target.value) })} /></Field>
              </div>
              <Field label="קבוצות לאביר (מופרד בפסיקים)"><input className="input" value={config.knightGroupNames} onChange={(event) => setConfig({ ...config, knightGroupNames: event.target.value })} placeholder="friends, work" /></Field>
            </>}
            {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{message}</div>}
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-primary" disabled={busy} onClick={handleOptimize}>להריץ אופטימיזציה</button>
              <button className="btn btn-secondary" disabled={busy} onClick={() => void load()}>רענון</button>
              <button className="btn btn-danger" disabled={busy} onClick={handleClear}>ניקוי תוכנית</button>
            </div>
            <div className="rounded-[26px] border border-[#ece2d2] bg-[#fcfbf8] p-4">
              <p className="font-semibold text-stone-900">התראות רלוונטיות</p>
              <div className="mt-3 space-y-2">
                {warnings.length === 0 && <p className="text-sm text-stone-500">אין התראות חריגות כרגע.</p>}
                {warnings.map((warning) => <div key={warning.type} className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{warning.message}</div>)}
              </div>
            </div>
          </div>
        </SectionCard>
        <SectionCard title="תוכנית שולחנות" kicker={`${plan.tables.length} tables`}>
          {plan.tables.length === 0 ? <EmptyState title="אין תוכנית קיימת" text="הריצו אופטימיזציה כדי לייצר תצורת שולחנות עדכנית." /> : (
            <div className="grid gap-4 md:grid-cols-2">
              {plan.tables.map((table) => (
                <div key={table.tableId} className="rounded-[28px] border border-[#e9decb] bg-[linear-gradient(180deg,#fffdf9_0%,#f8f4ed_100%)] p-5 shadow-warm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-stone-400">Table {table.number}</p>
                      <h3 className="mt-2 text-2xl font-bold text-stone-900">{table.isKnight ? 'שולחן אבירים' : 'שולחן עגול'}</h3>
                    </div>
                    <span className="badge border-stone-200 bg-white text-stone-600">{table.assignedGuestIds.length}/{table.capacity}</span>
                  </div>
                  <div className="mt-4 space-y-2">
                    {table.assignedGuestIds.map((guest) => (
                      <div key={guest._id} className="flex items-center justify-between rounded-2xl bg-white/90 px-3 py-2 text-sm shadow-warm-xs">
                        <span>{guest.firstName} {guest.lastName}</span>
                        <span className="text-stone-400">{mealLabel(guest.mealPreference as never)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </PageContainer>
  );
}
