import { FormEvent, useEffect, useRef, useState } from 'react';
import { API_BASE_URL, apiRequest } from '../app/api';
import { useAuth } from '../app/auth';
import type { BudgetEntry } from '../app/types';
import { EmptyState, Field, PageContainer, SectionCard, SmartNumberInput, StatCard, formatCurrency } from '../app/ui';

type EntryDraft = {
  plannedCost: number;
  actualCost: number;
  remainingCashAmount: number;
  remainingCreditAmount: number;
  remainingBankTransferAmount: number;
};

function draftFromEntry(entry: BudgetEntry): EntryDraft {
  return {
    plannedCost: entry.plannedCost,
    actualCost: entry.actualCost,
    remainingCashAmount: entry.remainingCashAmount ?? 0,
    remainingCreditAmount: entry.remainingCreditAmount ?? 0,
    remainingBankTransferAmount: entry.remainingBankTransferAmount ?? 0,
  };
}

export function BudgetPage() {
  const { token } = useAuth();
  const [entries, setEntries] = useState<BudgetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ category: '', vendorName: '', plannedCost: 0 });
  const [drafts, setDrafts] = useState<Record<string, EntryDraft>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const applyEntries = (data: BudgetEntry[]) => {
    setEntries(data);
    setDrafts((current) => {
      let changed = false;
      const next = { ...current };
      for (const entry of data) {
        if (!(entry._id in next)) {
          next[entry._id] = draftFromEntry(entry);
          changed = true;
        }
      }
      for (const id of Object.keys(next)) {
        if (!data.some((e) => e._id === id)) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : current;
    });
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest<BudgetEntry[]>('/api/budget', {}, token);
      applyEntries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינה');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [token]);

  // ── Summary totals ──────────────────────────────────────────────────────────
  const totalPlanned = entries.reduce((s, e) => s + e.plannedCost, 0);
  const totalPaid    = entries.reduce((s, e) => s + e.actualCost, 0);
  const totalRemaining = totalPlanned - totalPaid;
  const totalCash  = entries.reduce((s, e) => s + (e.remainingCashAmount ?? 0), 0);
  const totalCredit = entries.reduce((s, e) => s + (e.remainingCreditAmount ?? 0), 0);
  const totalBank  = entries.reduce((s, e) => s + (e.remainingBankTransferAmount ?? 0), 0);

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const created = await apiRequest<BudgetEntry>('/api/budget', { method: 'POST', body: JSON.stringify(form) }, token);
      setEntries((current) => [...current, created]);
      setDrafts((current) => ({ ...current, [created._id]: draftFromEntry(created) }));
      setForm({ category: '', vendorName: '', plannedCost: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בשמירה');
    }
  };

  const updateDraft = (id: string, field: keyof EntryDraft, value: number) => {
    setDrafts((current) => ({
      ...current,
      [id]: { ...(current[id] ?? draftFromEntry(entries.find((e) => e._id === id)!)), [field]: value },
    }));
  };

  const saveEntry = async (id: string) => {
    const draft = drafts[id];
    const remaining = Math.max(0, draft.plannedCost - draft.actualCost);
    const breakdownTotal = draft.remainingCashAmount + draft.remainingCreditAmount + draft.remainingBankTransferAmount;
    if (Math.round(breakdownTotal * 100) / 100 > Math.round(remaining * 100) / 100) {
      setError('סכום פירוט אמצעי התשלום (מזומן + אשראי + העברה) עולה על הסכום שנותר לתשלום');
      return;
    }
    try {
      const updated = await apiRequest<BudgetEntry>(
        `/api/budget/${id}`,
        { method: 'PATCH', body: JSON.stringify(draft) },
        token,
      );
      setEntries((current) => current.map((e) => (e._id === id ? updated : e)));
      setDrafts((current) => ({ ...current, [id]: draftFromEntry(updated) }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בשמירה');
    }
  };

  const removeEntry = async (id: string) => {
    setEntries((current) => current.filter((e) => e._id !== id));
    setDrafts((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    try {
      await apiRequest(`/api/budget/${id}`, { method: 'DELETE' }, token);
    } catch (err) {
      await load();
      setError(err instanceof Error ? err.message : 'שגיאה במחיקה');
    }
  };

  const uploadProof = async (id: string, file: File) => {
    try {
      const formData = new FormData();
      formData.append('proof', file);
      const updated = await apiRequest<BudgetEntry>(`/api/budget/${id}/proofs`, { method: 'POST', body: formData }, token);
      setEntries((current) => current.map((e) => (e._id === id ? updated : e)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בהעלאת הקובץ');
    }
  };

  const deleteProof = async (entryId: string, filename: string) => {
    try {
      const updated = await apiRequest<BudgetEntry>(`/api/budget/${entryId}/proofs/${filename}`, { method: 'DELETE' }, token);
      setEntries((current) => current.map((e) => (e._id === entryId ? updated : e)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה במחיקת הקובץ');
    }
  };

  return (
    <PageContainer
      title="תקציב וספקים"
      subtitle="מבט אחד על מה שתוכנן, מה שולם, וכמה נותר — עם פירוט לפי אמצעי תשלום ואסמכתאות."
      loading={loading}
      error={error}
    >
      {/* ── Top summary cards ─────────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <StatCard label="מתוכנן" value={formatCurrency(totalPlanned)} note="סך תכנון" tone="gold" />
        <StatCard label="שולם כבר" value={formatCurrency(totalPaid)} note="כל מה שיצא" tone="dark" />
        <StatCard
          label="נותר לתשלום"
          value={formatCurrency(Math.max(0, totalRemaining))}
          note="מתוכנן פחות שולם"
          tone={totalRemaining <= 0 ? 'emerald' : 'rose'}
        />
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <StatCard compact label="נותר במזומן" value={formatCurrency(totalCash)} note="מזומן שצריך להכין" tone="gold" />
        <StatCard compact label="נותר באשראי" value={formatCurrency(totalCredit)} note="חיוב אשראי צפוי" tone="dark" />
        <StatCard compact label="נותר בהעברה" value={formatCurrency(totalBank)} note="העברה בנקאית" tone="dark" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
        {/* ── Create form ───────────────────────────────────────────────────────── */}
        <SectionCard title="שורת תקציב חדשה" kicker="Vendor ledger">
          <form className="space-y-4" onSubmit={handleCreate}>
            <Field label="קטגוריה">
              <input
                className="input"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                required
              />
            </Field>
            <Field label="שם ספק">
              <input
                className="input"
                value={form.vendorName}
                onChange={(e) => setForm({ ...form, vendorName: e.target.value })}
              />
            </Field>
            <Field label="מתוכנן (₪)">
              <SmartNumberInput
                value={form.plannedCost}
                onChange={(v) => setForm({ ...form, plannedCost: Number(v) })}
              />
            </Field>
            <button className="btn btn-primary w-full justify-center">להוסיף שורה</button>
          </form>
        </SectionCard>

        {/* ── Entry list ────────────────────────────────────────────────────────── */}
        <SectionCard title="מצב התקציב" kicker={`${entries.length} entries`}>
          {entries.length === 0 ? (
            <EmptyState title="אין נתוני תקציב" text="כדאי להתחיל מהאולם, צילום, DJ, רב, איפור, והסעות." />
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => {
                const draft = drafts[entry._id];
                if (!draft) return null;
                const remaining = draft.plannedCost - draft.actualCost;

                return (
                  <div key={entry._id} className="rounded-[26px] border border-[#ece2d2] bg-[#fcfbf8] p-4 shadow-warm-xs">
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-bold text-stone-900">{entry.category}</h3>
                        {entry.vendorName && <p className="text-sm text-stone-500">{entry.vendorName}</p>}
                      </div>
                      <button className="btn btn-danger shrink-0" onClick={() => void removeEntry(entry._id)}>
                        מחיקה
                      </button>
                    </div>

                    {/* Planned / Paid / Remaining */}
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <Field label="מתוכנן (₪)">
                        <SmartNumberInput
                          value={draft.plannedCost}
                          onChange={(v) => updateDraft(entry._id, 'plannedCost', Number(v))}
                        />
                      </Field>
                      <Field label="שולם (₪)">
                        <SmartNumberInput
                          value={draft.actualCost}
                          onChange={(v) => updateDraft(entry._id, 'actualCost', Number(v))}
                        />
                      </Field>
                      <div className="flex flex-col justify-end">
                        <span className="mb-2 block text-sm font-semibold text-stone-700">נותר (₪)</span>
                        <div className="input flex items-center bg-stone-50">
                          <span className={`font-semibold tabular-nums ${remaining > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {formatCurrency(remaining)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Remaining breakdown by method */}
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <Field label="נותר במזומן (₪)">
                        <SmartNumberInput
                          value={draft.remainingCashAmount}
                          onChange={(v) => updateDraft(entry._id, 'remainingCashAmount', Number(v))}
                        />
                      </Field>
                      <Field label="נותר באשראי (₪)">
                        <SmartNumberInput
                          value={draft.remainingCreditAmount}
                          onChange={(v) => updateDraft(entry._id, 'remainingCreditAmount', Number(v))}
                        />
                      </Field>
                      <Field label="נותר בהעברה (₪)">
                        <SmartNumberInput
                          value={draft.remainingBankTransferAmount}
                          onChange={(v) => updateDraft(entry._id, 'remainingBankTransferAmount', Number(v))}
                        />
                      </Field>
                    </div>

                    {/* Actions: save + upload proof */}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button className="btn btn-secondary" type="button" onClick={() => void saveEntry(entry._id)}>
                        שמור
                      </button>
                      <button
                        className="btn btn-secondary"
                        type="button"
                        onClick={() => fileInputRefs.current[entry._id]?.click()}
                      >
                        העלאת אסמכתא
                      </button>
                      <input
                        ref={(el) => { fileInputRefs.current[entry._id] = el; }}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void uploadProof(entry._id, file);
                          e.target.value = '';
                        }}
                      />
                      {(entry.paymentProofs?.length ?? 0) > 0 && (
                        <span className="text-xs text-stone-400">{entry.paymentProofs!.length} אסמכתא/ות</span>
                      )}
                    </div>

                    {/* Proof thumbnails */}
                    {(entry.paymentProofs?.length ?? 0) > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {entry.paymentProofs!.map((proof) => (
                          <div key={proof.filename} className="relative">
                            <a
                              href={`${API_BASE_URL}/uploads/proofs/${proof.filename}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <img
                                src={`${API_BASE_URL}/uploads/proofs/${proof.filename}`}
                                alt={proof.originalName}
                                className="h-16 w-16 rounded-[14px] border border-[#ece2d2] object-cover"
                              />
                            </a>
                            <button
                              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold leading-none text-white shadow"
                              title={`מחק: ${proof.originalName}`}
                              onClick={() => void deleteProof(entry._id, proof.filename)}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>
    </PageContainer>
  );
}
