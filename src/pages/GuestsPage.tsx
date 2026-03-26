import { FormEvent, useEffect, useState } from 'react';
import { apiRequest } from '../app/api';
import { useAuth } from '../app/auth';
import type { Guest, Invitation } from '../app/types';
import { EmptyState, Field, mealLabel, PageContainer, SectionCard, SmartNumberInput } from '../app/ui';

export function GuestsPage() {
  const { token } = useAuth();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    invitationId: '',
    firstName: '',
    lastName: '',
    mealPreference: 'none',
    age: '',
    notes: '',
  });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [guestData, invitationData] = await Promise.all([
        apiRequest<Guest[]>('/api/guests', {}, token),
        apiRequest<Invitation[]>('/api/invitations', {}, token),
      ]);
      setGuests(guestData);
      setInvitations(invitationData);
      if (!form.invitationId && invitationData[0]) {
        setForm((current) => ({ ...current, invitationId: invitationData[0]._id }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינה');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [token]);

  const invitationById = new Map(invitations.map((invitation) => [invitation._id, invitation]));

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await apiRequest(
        '/api/guests',
        {
          method: 'POST',
          body: JSON.stringify({
            invitationId: form.invitationId,
            firstName: form.firstName,
            lastName: form.lastName || undefined,
            mealPreference: form.mealPreference,
            age: form.age ? Number(form.age) : undefined,
            notes: form.notes || undefined,
          }),
        },
        token,
      );
      setForm((current) => ({ ...current, firstName: '', lastName: '', age: '', notes: '' }));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בהוספה');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiRequest(`/api/guests/${id}`, { method: 'DELETE' }, token);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה במחיקה');
    }
  };

  return (
    <PageContainer
      title="אורחים"
      subtitle="כל אורח הוא seat אמיתי: שיוך להזמנה, העדפת ארוחה, גיל והערות."
      loading={loading}
      error={error}
    >
      <div className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
        <SectionCard title="הוספת אורח" kicker="Per-seat record">
          <form className="space-y-4" onSubmit={handleCreate}>
            <Field label="משויך להזמנה">
              <select className="input" value={form.invitationId} onChange={(event) => setForm({ ...form, invitationId: event.target.value })} required>
                <option value="">בחרו משק בית</option>
                {invitations.map((invitation) => (
                  <option key={invitation._id} value={invitation._id}>
                    {invitation.householdName}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="שם פרטי">
                <input className="input" value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} required />
              </Field>
              <Field label="שם משפחה">
                <input className="input" value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="ארוחה">
                <select className="input" value={form.mealPreference} onChange={(event) => setForm({ ...form, mealPreference: event.target.value })}>
                  <option value="none">ללא</option>
                  <option value="meat">בשר</option>
                  <option value="chicken">עוף</option>
                  <option value="vegan">טבעוני</option>
                  <option value="kids">ילדים</option>
                </select>
              </Field>
              <Field label="גיל">
                <SmartNumberInput className="input" min={0} max={120} value={form.age} onChange={(age) => setForm({ ...form, age: String(age) })} />
              </Field>
            </div>
            <Field label="הערות">
              <textarea className="input min-h-[112px]" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
            </Field>
            <button className="btn btn-primary w-full justify-center">להוסיף אורח</button>
          </form>
        </SectionCard>

        <SectionCard title="רשימת אורחים" kicker={`${guests.length} seats`}>
          {guests.length === 0 ? (
            <EmptyState title="אין עדיין אורחים" text="אחרי יצירת הזמנה אפשר להוסיף אורחים אחד אחד או לייבא מאקסל." />
          ) : (
            <div className="space-y-3">
              {guests.map((guest) => (
                <div key={guest._id} className="flex flex-col gap-3 rounded-[26px] border border-[#ece2d2] bg-[#fcfbf8] p-4 shadow-warm-xs md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-stone-900">
                      {guest.firstName} {guest.lastName}
                    </h3>
                    <p className="mt-1 text-sm text-stone-500">
                      {invitationById.get(guest.invitationId)?.householdName || 'הזמנה לא ידועה'} · {mealLabel(guest.mealPreference)} ·{' '}
                      {guest.assignedTableId ? `שולחן ${guest.assignedTableId}` : 'ללא שולחן'}
                    </p>
                    {guest.relationshipGroup ? (
                      <p className="mt-0.5 text-xs text-stone-400">
                        קבוצת קשר: <span className="font-medium text-stone-600">{guest.relationshipGroup}</span>
                      </p>
                    ) : null}
                  </div>
                  <button className="btn btn-danger" onClick={() => handleDelete(guest._id)}>
                    מחיקה
                  </button>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </PageContainer>
  );
}
