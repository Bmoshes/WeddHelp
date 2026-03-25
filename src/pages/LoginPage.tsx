import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { apiRequest } from '../app/api';
import { useAuth } from '../app/auth';
import type { Wedding } from '../app/types';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, token } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      const payload = await apiRequest<{ token: string; wedding: Wedding }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
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
    <AuthFrame
      title="חוזרים לחדר הבקרה של החתונה"
      subtitle="היכנסו כדי להמשיך לנהל RSVP, הושבה, תקציב ומשימות ממקום אחד."
      asideTitle="Wedding Management OS"
      asideText="מערכת ניהול אלגנטית, עברית ו-RTL, שנבנתה סביב אירועים ישראליים אמיתיים."
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-stone-700">אימייל</span>
          <input className="input" type="email" dir="ltr" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-stone-700">סיסמה</span>
          <input className="input" type="password" dir="ltr" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </label>
        {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}
        <button className="btn btn-primary w-full justify-center bg-stone-950 py-3 text-base hover:bg-stone-800" disabled={loading}>
          {loading ? 'טוען...' : 'להתחבר'}
        </button>
        <p className="text-center text-sm text-stone-500">
          עוד אין חשבון? <NavLink className="font-semibold text-gold-700 hover:text-gold-800" to="/register">פתיחת חשבון</NavLink>
        </p>
      </form>
    </AuthFrame>
  );
}

function AuthFrame({
  title,
  subtitle,
  asideTitle,
  asideText,
  children,
}: {
  title: string;
  subtitle: string;
  asideTitle: string;
  asideText: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#f8f1df_0%,#f3ede3_45%,#efe7d4_100%)] px-4 py-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl overflow-hidden rounded-[36px] border border-white/70 bg-white/80 shadow-warm-xl backdrop-blur-xl lg:grid-cols-[1.1fr_0.9fr]">
        <div className="relative hidden overflow-hidden bg-stone-950 p-10 text-white lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(251,191,36,0.3),transparent_30%),radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.12),transparent_22%),radial-gradient(circle_at_50%_90%,rgba(217,119,6,0.28),transparent_26%)]" />
          <div className="relative flex h-full flex-col justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.45em] text-stone-300">WeddHelp</p>
              <h1 className="mt-6 max-w-md text-5xl font-bold leading-[1.05]">{asideTitle}</h1>
              <p className="mt-6 max-w-lg text-lg leading-8 text-stone-300">{asideText}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                ['RSVP', 'מובייל-פרסט לאורחים'],
                ['Checklist', '33 משימות פתיחה'],
                ['Seating', 'Black box preserved'],
                ['Budget', 'תמונה כספית ברורה'],
              ].map(([label, note]) => (
                <div key={label} className="rounded-[26px] border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                  <p className="text-xs uppercase tracking-[0.24em] text-stone-400">{label}</p>
                  <p className="mt-2 text-sm text-stone-300">{note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center p-6 md:p-10">
          <div className="mx-auto w-full max-w-md">
            <p className="text-xs uppercase tracking-[0.35em] text-gold-700">Access</p>
            <h2 className="mt-3 text-3xl font-bold text-stone-900">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-stone-500">{subtitle}</p>
            <div className="mt-8">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
