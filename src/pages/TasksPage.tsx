import { FormEvent, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { apiRequest } from '../app/api';
import { useAuth } from '../app/auth';
import type { Task } from '../app/types';
import { categoryLabel, EmptyState, Field, formatDate, PageContainer, SectionCard, SmartNumberInput } from '../app/ui';

type PaymentDraft = {
  paidAmount: number;
  remainingCashDue: number;
  paymentMethod: Task['paymentMethod'];
};

// Backward-compatible: show payment fields for tasks with the model flag, OR for categories where
// every template task requires payment (vendors, attire). Covers existing DB records without the flag.
function isPaymentTask(task: Task): boolean {
  return task.requiresPayment === true || task.category === 'vendors' || task.category === 'attire';
}

const DEFAULT_DRAFT: PaymentDraft = {
  paidAmount: 0,
  remainingCashDue: 0,
  paymentMethod: 'none',
};

function draftFromTask(task: Task): PaymentDraft {
  return {
    paidAmount: task.paidAmount ?? 0,
    remainingCashDue: task.remainingCashDue ?? 0,
    paymentMethod: task.paymentMethod ?? 'none',
  };
}

export function TasksPage() {
  const { token } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ title: '', category: 'logistics', dueDate: '', requiresPayment: false });
  const [paymentDrafts, setPaymentDrafts] = useState<Record<string, PaymentDraft>>({});

  // Scroll lock: capture scrollY before a mutation, restore it synchronously after React commits.
  // This prevents any browser scroll-to-focused-element behaviour triggered by label→checkbox
  // focus dispatch or by layout shifts from state updates.
  const scrollLockRef = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (scrollLockRef.current !== null) {
      window.scrollTo(0, scrollLockRef.current);
      scrollLockRef.current = null;
    }
  });

  // Initial load only — sets loading=true which triggers the full-page spinner.
  // Never call this from mutations; use applyTasks instead.
  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest<Task[]>('/api/tasks', {}, token);
      setTasks(data);
      setPaymentDrafts(Object.fromEntries(data.map((t) => [t._id, draftFromTask(t)])));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת משימות');
    } finally {
      setLoading(false);
    }
  };

  // Apply a fresh server task list WITHOUT touching loading state and WITHOUT
  // overwriting payment drafts the user is currently editing.
  // Only adds draft entries for task IDs not already tracked (e.g. auto-created envelope tasks).
  const applyTasks = (data: Task[]) => {
    setTasks(data);
    setPaymentDrafts((current) => {
      let changed = false;
      const next = { ...current };
      for (const task of data) {
        if (!(task._id in next)) {
          next[task._id] = draftFromTask(task);
          changed = true;
        }
      }
      // Remove drafts for tasks that were deleted
      for (const id of Object.keys(next)) {
        if (!data.some((t) => t._id === id)) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : current;
    });
  };

  // Silent refresh — no spinner, no draft reset, scroll position preserved.
  const syncTasks = async () => {
    try {
      const data = await apiRequest<Task[]>('/api/tasks', {}, token);
      applyTasks(data);
    } catch {
      // best-effort — ignore errors on background sync
    }
  };

  useEffect(() => {
    void load();
  }, [token]);

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const created = await apiRequest<Task>(
        '/api/tasks',
        {
          method: 'POST',
          body: JSON.stringify({
            title: form.title,
            category: form.category,
            dueDate: form.dueDate || undefined,
            requiresPayment: form.requiresPayment,
          }),
        },
        token,
      );
      setForm({ title: '', category: 'logistics', dueDate: '', requiresPayment: false });
      // Add new task directly — no full refresh needed
      setTasks((current) => [...current, created]);
      setPaymentDrafts((current) => ({ ...current, [created._id]: draftFromTask(created) }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בשמירת משימה');
    }
  };

  const updateDraft = (taskId: string, field: keyof PaymentDraft, value: number | PaymentDraft['paymentMethod']) => {
    setPaymentDrafts((current) => ({
      ...current,
      [taskId]: {
        ...(current[taskId] ?? DEFAULT_DRAFT),
        [field]: value,
      },
    }));
  };

  const savePayment = async (task: Task) => {
    try {
      const draft = paymentDrafts[task._id] ?? DEFAULT_DRAFT;
      const updated = await apiRequest<Task>(
        `/api/tasks/${task._id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            paidAmount: draft.paidAmount,
            remainingCashDue: draft.remainingCashDue,
            paymentMethod: draft.paymentMethod,
          }),
        },
        token,
      );
      // Apply the confirmed task in place
      setTasks((current) => current.map((t) => (t._id === task._id ? updated : t)));
      // Background sync picks up any envelope task or budget entry created as a side effect
      void syncTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בשמירת התשלום');
    }
  };

  const toggleTask = async (task: Task) => {
    const draft = paymentDrafts[task._id] ?? DEFAULT_DRAFT;
    if (!task.isDone && isPaymentTask(task) && !(draft.paidAmount > 0)) {
      setError('כדי לסמן משימה זו כבוצעת צריך להזין כמה שולם.');
      return;
    }
    // Capture scroll BEFORE any state update so useLayoutEffect can restore it after React commits.
    scrollLockRef.current = window.scrollY;
    setError('');

    // Optimistic update — flip the checkbox immediately, no wait
    setTasks((current) => current.map((t) => (t._id === task._id ? { ...t, isDone: !task.isDone } : t)));

    try {
      const updated = await apiRequest<Task>(
        `/api/tasks/${task._id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            isDone: !task.isDone,
            paidAmount: draft.paidAmount,
            remainingCashDue: draft.remainingCashDue,
            paymentMethod: draft.paymentMethod,
          }),
        },
        token,
      );
      // Confirm with server response — single targeted state update, no full refresh
      setTasks((current) => current.map((t) => (t._id === task._id ? updated : t)));
    } catch (err) {
      // Revert optimistic update
      setTasks((current) => current.map((t) => (t._id === task._id ? task : t)));
      setError(err instanceof Error ? err.message : 'שגיאה בעדכון');
    }
  };

  const removeTask = async (id: string) => {
    // Optimistic removal
    setTasks((current) => current.filter((t) => t._id !== id));
    setPaymentDrafts((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    try {
      await apiRequest(`/api/tasks/${id}`, { method: 'DELETE' }, token);
    } catch (err) {
      // Revert on failure
      await syncTasks();
      setError(err instanceof Error ? err.message : 'שגיאה במחיקה');
    }
  };

  return (
    <PageContainer
      title="משימות חכמות"
      subtitle="המערכת כבר פתחה צ'קליסט ישראלי מלא. מכאן אפשר לדייק, לסמן, ולהזין גם תשלומים לספקים."
      loading={loading}
      error={error}
    >
      <div className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
        <SectionCard title="משימה חדשה" kicker="Manual override">
          <form className="space-y-4" onSubmit={handleCreate}>
            <Field label="כותרת">
              <input className="input" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="קטגוריה">
                <select className="input" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
                  <option value="bureaucracy">בירוקרטיה</option>
                  <option value="vendors">ספקים</option>
                  <option value="attire">לבוש</option>
                  <option value="logistics">לוגיסטיקה</option>
                  <option value="extras">אקסטרות</option>
                </select>
              </Field>
              <Field label="תאריך יעד">
                <input className="input" type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} />
              </Field>
            </div>
            <label className="flex cursor-pointer items-center gap-3 rounded-[18px] border border-[#ece2d2] bg-[#faf8f2] px-4 py-3">
              <input
                type="checkbox"
                checked={form.requiresPayment}
                onChange={(event) => setForm({ ...form, requiresPayment: event.target.checked })}
              />
              <span className="text-sm font-semibold text-stone-700">משימה בתשלום</span>
              <span className="text-xs text-stone-400">יופיעו שדות תשלום ותיעוד לתקציב</span>
            </label>
            <button className="btn btn-primary w-full justify-center">להוסיף משימה</button>
          </form>
        </SectionCard>

        <SectionCard title="לוח משימות" kicker={`${tasks.length} items`}>
          {tasks.length === 0 ? (
            <EmptyState title="אין משימות" text="אחרי ההרשמה הראשונית תופיע כאן רשימת ברירת המחדל של החתונה." />
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div key={task._id} className="flex flex-col gap-3 rounded-[26px] border border-[#ece2d2] bg-[#fcfbf8] p-4 shadow-warm-xs">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <label className="flex items-start gap-3">
                      <input className="mt-1" type="checkbox" checked={task.isDone} onChange={() => void toggleTask(task)} />
                      <div>
                        <p className={`font-semibold ${task.isDone ? 'line-through text-stone-400' : 'text-stone-900'}`}>{task.title}</p>
                        <p className="mt-1 text-sm text-stone-500">{categoryLabel(task.category)} · {formatDate(task.dueDate)}</p>
                      </div>
                    </label>
                    <button className="btn btn-danger" onClick={() => void removeTask(task._id)}>מחיקה</button>
                  </div>

                  {isPaymentTask(task) ? (
                    <div className="rounded-[22px] border border-[#eadfcd] bg-white p-4">
                      <div className="grid gap-3 md:grid-cols-3">
                        <Field label="כמה שולם">
                          <SmartNumberInput
                            className="input"
                            value={paymentDrafts[task._id]?.paidAmount ?? 0}
                            onChange={(value) => updateDraft(task._id, 'paidAmount', Number(value))}
                          />
                        </Field>
                        <Field label="נותר במזומן">
                          <SmartNumberInput
                            className="input"
                            value={paymentDrafts[task._id]?.remainingCashDue ?? 0}
                            onChange={(value) => updateDraft(task._id, 'remainingCashDue', Number(value))}
                          />
                        </Field>
                        <Field label="אמצעי תשלום">
                          <select
                            className="input"
                            value={paymentDrafts[task._id]?.paymentMethod ?? 'none'}
                            onChange={(event) => updateDraft(task._id, 'paymentMethod', event.target.value as PaymentDraft['paymentMethod'])}
                          >
                            <option value="none">לא הוגדר</option>
                            <option value="cash">מזומן</option>
                            <option value="credit">אשראי</option>
                            <option value="bank_transfer">העברה בנקאית</option>
                            <option value="mixed">מעורב</option>
                          </select>
                        </Field>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button className="btn btn-secondary" type="button" onClick={() => void savePayment(task)}>שמור תשלום</button>
                        {(paymentDrafts[task._id]?.remainingCashDue ?? 0) > 0 ? (
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                            תיווצר משימת מעטפה אוטומטית לפני החתונה
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </PageContainer>
  );
}
