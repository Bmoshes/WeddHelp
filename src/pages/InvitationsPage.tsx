import { FormEvent, useEffect, useState } from 'react';
import { apiRequest } from '../app/api';
import { useAuth } from '../app/auth';
import type { Invitation } from '../app/types';
import { EmptyState, Field, groupLabel, PageContainer, SectionCard, sideLabel, StatusPill } from '../app/ui';

export function InvitationsPage() {
  const { token } = useAuth();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({
    householdName: '',
    whatsappNumber: '',
    rsvpStatus: 'pending',
    side: 'mutual',
    group: 'other',
    giftAmount: 0,
  });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest<Invitation[]>('/api/invitations', {}, token);
      setInvitations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת ההזמנות');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [token]);

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    setNotice('');
    try {
      await apiRequest('/api/invitations', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          giftAmount: Number(form.giftAmount) || 0,
          whatsappNumber: form.whatsappNumber || undefined,
        }),
      }, token);
      setForm({ householdName: '', whatsappNumber: '', rsvpStatus: 'pending', side: 'mutual', group: 'other', giftAmount: 0 });
      setNotice('הזמנה נוספה בהצלחה.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בשמירה');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiRequest(`/api/invitations/${id}`, { method: 'DELETE' }, token);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה במחיקה');
    }
  };

  const handleWhatsappLink = async (id: string) => {
    try {
      const response = await apiRequest<{ link: string }>(`/api/invitations/${id}/whatsapp-link`, {}, token);
      await navigator.clipboard.writeText(response.link);
      setNotice('קישור הווטסאפ הועתק ללוח.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה ביצירת הקישור');
    }
  };

  const getPhoneState = (value?: string | null) => {
    const digits = String(value || '').replace(/\D/g, '');
    if (!digits) return { label: 'ללא מספר וואטסאפ', valid: false, missing: true };
    if (digits.length !== 9) return { label: digits, valid: false, missing: false };
    return { label: digits, valid: true, missing: false };
  };

  return (
    <PageContainer title="הזמנות ומשקי בית" subtitle="כאן מתחיל כל ה-flow הציבורי: RSVP, WhatsApp, שיוך צד וקבוצות." loading={loading} error={error}>
      <div className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
        <SectionCard title="הזמנה חדשה" kicker="Household record">
          <form className="space-y-4" onSubmit={handleCreate}>
            <Field label="שם משק בית"><input className="input" value={form.householdName} onChange={(event) => setForm({ ...form, householdName: event.target.value })} required /></Field>
            <Field label="מספר וואטסאפ"><input className="input" dir="ltr" value={form.whatsappNumber} onChange={(event) => setForm({ ...form, whatsappNumber: event.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="צד">
                <select className="input" value={form.side} onChange={(event) => setForm({ ...form, side: event.target.value })}>
                  <option value="mutual">שניהם</option>
                  <option value="groom">חתן</option>
                  <option value="bride">כלה</option>
                </select>
              </Field>
              <Field label="קבוצה">
                <select className="input" value={form.group} onChange={(event) => setForm({ ...form, group: event.target.value })}>
                  <option value="other">אחר</option>
                  <option value="family">משפחה</option>
                  <option value="friends">חברים</option>
                  <option value="work">עבודה</option>
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="סטטוס RSVP">
                <select className="input" value={form.rsvpStatus} onChange={(event) => setForm({ ...form, rsvpStatus: event.target.value })}>
                  <option value="pending">ממתין</option>
                  <option value="going">מגיע</option>
                  <option value="maybe">אולי</option>
                  <option value="not_going">לא מגיע</option>
                </select>
              </Field>
              <Field label="סכום מתנה"><input className="input" type="number" min="0" value={form.giftAmount} onChange={(event) => setForm({ ...form, giftAmount: Number(event.target.value) })} /></Field>
            </div>
            <button className="btn btn-primary w-full justify-center">להוסיף הזמנה</button>
          </form>
        </SectionCard>
        <SectionCard title="רשימת הזמנות" kicker={`${invitations.length} households`}>
          {notice && <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{notice}</div>}
          {invitations.length === 0 ? <EmptyState title="אין עדיין הזמנות" text="התחילו ממשק בית ראשון או ייבאו רשימה מאקסל." /> : (
            <div className="space-y-3">
              {invitations.map((invitation) => (
                <div key={invitation._id} className="rounded-[26px] border border-[#ece2d2] bg-[#fcfbf8] p-4 shadow-warm-xs">
                  {(() => {
                    const phone = getPhoneState(invitation.whatsappNumber);
                    return (
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-stone-900">{invitation.householdName}</h3>
                        <StatusPill status={invitation.rsvpStatus} />
                        <span className={`badge ${phone.valid ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
                          {phone.valid ? 'וואטסאפ תקין' : phone.missing ? 'ללא מספר' : 'מספר לא חוקי'}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-stone-500">{sideLabel(invitation.side)} · {groupLabel(invitation.group)} · {phone.label}</p>
                      {!phone.valid && !phone.missing ? (
                        <p className="mt-1 text-xs text-red-600">מספר וואטסאפ תקין חייב להכיל בדיוק 9 ספרות, בלי 0 בתחילת המספר.</p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button className="btn btn-secondary" disabled={!phone.valid} onClick={() => handleWhatsappLink(invitation._id)}>קישור RSVP</button>
                      <button className="btn btn-danger" onClick={() => handleDelete(invitation._id)}>מחיקה</button>
                    </div>
                  </div>
                    );
                  })()}
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </PageContainer>
  );
}
