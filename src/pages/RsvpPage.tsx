import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiRequest } from '../app/api';
import { Field, LoadingBlock } from '../app/ui';

export function RsvpPage() {
  const { token } = useParams<{ token: string }>();
  const [invitation, setInvitation] = useState<{ householdName: string; rsvpStatus: string; guestCount: number } | null>(null);
  const [status, setStatus] = useState<'going' | 'not_going' | 'maybe'>('going');
  const [giftAmount, setGiftAmount] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!token) {
        setError('קישור RSVP לא תקין');
        setLoading(false);
        return;
      }
      try {
        const data = await apiRequest<{ householdName: string; rsvpStatus: 'pending' | 'going' | 'not_going' | 'maybe'; guestCount: number }>(`/api/rsvp/${token}`);
        setInvitation(data);
        setStatus(data.rsvpStatus === 'pending' ? 'going' : data.rsvpStatus === 'not_going' ? 'not_going' : data.rsvpStatus === 'maybe' ? 'maybe' : 'going');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'שגיאה בטעינת ההזמנה');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [token]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      const response = await apiRequest<{ message: string }>(`/api/rsvp/${token}`, {
        method: 'PATCH',
        body: JSON.stringify({ rsvpStatus: status, giftAmount: giftAmount ? Number(giftAmount) : undefined }),
      });
      setMessage(response.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בשמירה');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f9f3e6_0%,#f5efe4_55%,#f2ebe0_100%)] px-4 py-6">
      <div className="mx-auto max-w-md">
        <div className="overflow-hidden rounded-[34px] border border-white/70 bg-white/90 shadow-warm-xl backdrop-blur-xl">
          <div className="bg-stone-950 px-6 py-8 text-white">
            <p className="text-xs uppercase tracking-[0.35em] text-stone-300">RSVP</p>
            <h1 className="mt-4 text-3xl font-bold leading-tight">נשמח לחגוג איתכם</h1>
            <p className="mt-3 text-sm leading-6 text-stone-300">עמוד תשובה מהיר, מותאם לנייד, בלי חיכוך ובלי בלבול.</p>
          </div>
          <div className="p-5 md:p-6">
            {loading ? <LoadingBlock /> : error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div> : invitation ? (
              <form className="space-y-5" onSubmit={submit}>
                <div className="rounded-[26px] border border-[#ece2d2] bg-[#fcfbf8] p-5">
                  <p className="text-sm text-stone-500">משק בית</p>
                  <h2 className="mt-1 text-2xl font-bold text-stone-900">{invitation.householdName}</h2>
                  <p className="mt-2 text-sm text-stone-500">{invitation.guestCount} מקומות שמורים בהזמנה זו</p>
                </div>
                <div className="grid gap-3">
                  {[
                    ['going', 'אנחנו מגיעים'],
                    ['maybe', 'עדיין בודקים'],
                    ['not_going', 'לא נוכל להגיע'],
                  ].map(([value, label]) => (
                    <label key={value} className={`flex cursor-pointer items-center justify-between rounded-[24px] border px-4 py-4 transition ${status === value ? 'border-gold-400 bg-gold-50 shadow-warm-sm' : 'border-[#ece2d2] bg-white'}`}>
                      <span className="font-semibold text-stone-900">{label}</span>
                      <input type="radio" name="rsvpStatus" value={value} checked={status === value} onChange={() => setStatus(value as 'going' | 'not_going' | 'maybe')} />
                    </label>
                  ))}
                </div>
                <Field label="סכום מתנה (אופציונלי)"><input className="input" type="number" min="0" value={giftAmount} onChange={(event) => setGiftAmount(event.target.value)} /></Field>
                {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{message}</div>}
                <button className="btn btn-primary w-full justify-center py-3 text-base" disabled={saving}>{saving ? 'שומר...' : 'לשלוח תשובה'}</button>
              </form>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
