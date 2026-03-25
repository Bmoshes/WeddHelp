import { FormEvent, useEffect, useState } from 'react';
import { apiRequest } from '../app/api';
import { useAuth } from '../app/auth';
import type { Task } from '../app/types';
import { categoryLabel, EmptyState, Field, formatDate, PageContainer, SectionCard } from '../app/ui';

export function TasksPage() {
  const { token } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ title: '', category: 'logistics', dueDate: '' });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest<Task[]>('/api/tasks', {}, token);
      setTasks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת משימות');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [token]);

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await apiRequest('/api/tasks', { method: 'POST', body: JSON.stringify({ title: form.title, category: form.category, dueDate: form.dueDate || undefined }) }, token);
      setForm({ title: '', category: 'logistics', dueDate: '' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בשמירת משימה');
    }
  };

  const toggleTask = async (task: Task) => {
    try {
      await apiRequest(`/api/tasks/${task._id}`, { method: 'PATCH', body: JSON.stringify({ isDone: !task.isDone }) }, token);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בעדכון');
    }
  };

  const removeTask = async (id: string) => {
    try {
      await apiRequest(`/api/tasks/${id}`, { method: 'DELETE' }, token);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה במחיקה');
    }
  };

  return (
    <PageContainer title="משימות חכמות" subtitle="המערכת כבר פתחה צ'קליסט ישראלי מלא. מכאן אפשר לדייק, לסמן ולהוריד סיכון." loading={loading} error={error}>
      <div className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
        <SectionCard title="משימה חדשה" kicker="Manual override">
          <form className="space-y-4" onSubmit={handleCreate}>
            <Field label="כותרת"><input className="input" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="קטגוריה">
                <select className="input" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
                  <option value="bureaucracy">בירוקרטיה</option><option value="vendors">ספקים</option><option value="attire">לבוש</option><option value="logistics">לוגיסטיקה</option><option value="extras">אקסטרות</option>
                </select>
              </Field>
              <Field label="תאריך יעד"><input className="input" type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /></Field>
            </div>
            <button className="btn btn-primary w-full justify-center">להוסיף משימה</button>
          </form>
        </SectionCard>
        <SectionCard title="לוח משימות" kicker={`${tasks.length} items`}>
          {tasks.length === 0 ? <EmptyState title="אין משימות" text="אחרי ההרשמה הראשונית תופיע כאן רשימת ברירת המחדל של החתונה." /> : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div key={task._id} className="flex flex-col gap-3 rounded-[26px] border border-[#ece2d2] bg-[#fcfbf8] p-4 shadow-warm-xs md:flex-row md:items-center md:justify-between">
                  <label className="flex items-start gap-3">
                    <input className="mt-1" type="checkbox" checked={task.isDone} onChange={() => toggleTask(task)} />
                    <div>
                      <p className={`font-semibold ${task.isDone ? 'line-through text-stone-400' : 'text-stone-900'}`}>{task.title}</p>
                      <p className="mt-1 text-sm text-stone-500">{categoryLabel(task.category)} · {formatDate(task.dueDate)}</p>
                    </div>
                  </label>
                  <button className="btn btn-danger" onClick={() => removeTask(task._id)}>מחיקה</button>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </PageContainer>
  );
}
