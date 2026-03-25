import { FormEvent, useEffect, useState } from 'react';
import { apiRequest } from '../app/api';
import { useAuth } from '../app/auth';
import type { BudgetEntry } from '../app/types';
import { EmptyState, Field, PageContainer, SectionCard, StatCard, formatCurrency } from '../app/ui';

export function BudgetPage() {
  const { token } = useAuth();
  const [entries, setEntries] = useState<BudgetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ category: '', vendorName: '', plannedCost: 0, actualCost: 0, advancePaid: 0 });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest<BudgetEntry[]>('/api/budget', {}, token);
      setEntries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינה');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [token]);

  const totalPlanned = entries.reduce((sum, entry) => sum + entry.plannedCost, 0);
  const totalActual = entries.reduce((sum, entry) => sum + entry.actualCost, 0);

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await apiRequest('/api/budget', { method: 'POST', body: JSON.stringify(form) }, token);
      setForm({ category: '', vendorName: '', plannedCost: 0, actualCost: 0, advancePaid: 0 });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בשמירה');
    }
  };

  const removeEntry = async (id: string) => {
    try {
      await apiRequest(`/api/budget/${id}`, { method: 'DELETE' }, token);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה במחיקה');
    }
  };

  return (
    <PageContainer title="תקציב וספקים" subtitle="מבט אחד על מה שתוכנן, מה שולם בפועל וכמה יצא כבר כמקדמות." loading={loading} error={error}>
      <div className="grid gap-4 lg:grid-cols-3">
        <StatCard label="מתוכנן" value={formatCurrency(totalPlanned)} note="סך תכנון" tone="gold" />
        <StatCard label="בפועל" value={formatCurrency(totalActual)} note="הוצאה בפועל" tone="dark" />
        <StatCard label="פער" value={formatCurrency(totalPlanned - totalActual)} note="שארית / חריגה" tone={totalPlanned - totalActual >= 0 ? 'emerald' : 'rose'} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
        <SectionCard title="שורת תקציב חדשה" kicker="Vendor ledger">
          <form className="space-y-4" onSubmit={handleCreate}>
            <Field label="קטגוריה"><input className="input" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} required /></Field>
            <Field label="שם ספק"><input className="input" value={form.vendorName} onChange={(event) => setForm({ ...form, vendorName: event.target.value })} /></Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="מתוכנן"><input className="input" type="number" min="0" value={form.plannedCost} onChange={(event) => setForm({ ...form, plannedCost: Number(event.target.value) })} /></Field>
              <Field label="בפועל"><input className="input" type="number" min="0" value={form.actualCost} onChange={(event) => setForm({ ...form, actualCost: Number(event.target.value) })} /></Field>
              <Field label="מקדמה"><input className="input" type="number" min="0" value={form.advancePaid} onChange={(event) => setForm({ ...form, advancePaid: Number(event.target.value) })} /></Field>
            </div>
            <button className="btn btn-primary w-full justify-center">להוסיף שורה</button>
          </form>
        </SectionCard>
        <SectionCard title="מצב התקציב" kicker={`${entries.length} entries`}>
          {entries.length === 0 ? <EmptyState title="אין נתוני תקציב" text="כדאי להתחיל מהאולם, צילום, DJ, רב, איפור והסעות." /> : (
            <div className="space-y-3">
              {entries.map((entry) => (
                <div key={entry._id} className="rounded-[26px] border border-[#ece2d2] bg-[#fcfbf8] p-4 shadow-warm-xs">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-stone-900">{entry.category}</h3>
                      <p className="mt-1 text-sm text-stone-500">{entry.vendorName || 'ללא ספק מוגדר'} · מקדמה {formatCurrency(entry.advancePaid)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-left"><p className="text-xs uppercase tracking-[0.25em] text-stone-400">Planned</p><p className="font-bold text-stone-900">{formatCurrency(entry.plannedCost)}</p></div>
                      <div className="text-left"><p className="text-xs uppercase tracking-[0.25em] text-stone-400">Actual</p><p className="font-bold text-stone-900">{formatCurrency(entry.actualCost)}</p></div>
                      <button className="btn btn-danger" onClick={() => removeEntry(entry._id)}>מחיקה</button>
                    </div>
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
