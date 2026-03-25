import { FormEvent, useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { apiRequest } from '../app/api';
import { useAuth } from '../app/auth';
import type { Wedding } from '../app/types';

export function RegisterPage() {
  const navigate = useNavigate();
  const { login, token } = useAuth();
  const [form, setForm] = useState({
    coupleName: '',
    weddingDate: '',
    venue: '',
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (token) navigate('/app', { replace: true });
  }, [navigate, token]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = await apiRequest<{ token: string; wedding: Wedding }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      login(payload);
      navigate('/app', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה לא צפויה');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#f8f1df_0%,#f3ede3_45%,#efe7d4_100%)] px-4 py-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl overflow-hidden rounded-[36px] border border-white/70 bg-white/80 shadow-warm-xl backdrop-blur-xl lg:grid-cols-[1.1fr_0.9fr]">
        <div className="relative hidden overflow-hidden bg-stone-950 p-10 text-white lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(251,191,36,0.3),transparent_30%),radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.12),transparent_22%),radial-gradient(circle_at_50%_90%,rgba(217,119,6,0.28),transparent_26%)]" />
          <div className="relative flex h-full flex-col justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.45em] text-stone-300">WeddHelp</p>
              <h1 className="mt-6 max-w-md text-5xl font-bold leading-[1.05]">פותחים סביבת ניהול חתונה שנראית כמו פרודקט, לא כמו אקסל.</h1>
              <p className="mt-6 max-w-lg text-lg leading-8 text-stone-300">המערכת תייצר לכם checklist, תאסוף RSVP, תנהל תקציב ותשמור את ההושבה דרך backend אחד יציב.</p>
            </div>
          </div>
        </div>
        <div className="flex items-center p-6 md:p-10">
          <form className="mx-auto w-full max-w-md space-y-5" onSubmit={handleSubmit}>
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-gold-700">Create account</p>
              <h2 className="mt-3 text-3xl font-bold text-stone-900">פותחים בסיס עבודה חדש</h2>
            </div>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-stone-700">שם הזוג</span>
              <input className="input" value={form.coupleName} onChange={(event) => setForm({ ...form, coupleName: event.target.value })} required />
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-stone-700">תאריך חתונה</span>
                <input className="input" type="date" value={form.weddingDate} onChange={(event) => setForm({ ...form, weddingDate: event.target.value })} required />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-stone-700">אולם</span>
                <input className="input" value={form.venue} onChange={(event) => setForm({ ...form, venue: event.target.value })} />
              </label>
            </div>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-stone-700">אימייל</span>
              <input className="input" type="email" dir="ltr" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-stone-700">סיסמה</span>
              <input className="input" type="password" dir="ltr" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
            </label>
            {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}
            <button className="btn btn-primary w-full justify-center bg-stone-950 py-3 text-base hover:bg-stone-800" disabled={loading}>
              {loading ? 'פותח...' : 'לפתוח חשבון'}
            </button>
            <p className="text-center text-sm text-stone-500">
              כבר יש חשבון? <NavLink className="font-semibold text-gold-700 hover:text-gold-800" to="/login">התחברות</NavLink>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
