import { ChangeEvent, useEffect, useState } from 'react';
import { apiRequest } from '../app/api';
import { useAuth } from '../app/auth';
import type { AlcoholEstimate, Warning } from '../app/types';
import { EmptyState, MiniMetric, PageContainer, SectionCard } from '../app/ui';

export function ToolsPage() {
  const { token } = useAuth();
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [alcohol, setAlcohol] = useState<AlcoholEstimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [importStatus, setImportStatus] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [warningsRes, alcoholRes] = await Promise.all([
          apiRequest<{ warnings: Warning[] }>('/api/wedding/warnings', {}, token),
          apiRequest<AlcoholEstimate>('/api/wedding/alcohol-calculator', {}, token),
        ]);
        setWarnings(warningsRes.warnings);
        setAlcohol(alcoholRes);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'שגיאה בטעינה');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [token]);

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportStatus('מייבא קובץ...');
    setError('');
    try {
      const body = new FormData();
      body.append('file', file);
      const result = await apiRequest<{ invitationsCreated: number; guestsCreated: number; errors: string[] }>('/api/seating/excel-import', { method: 'POST', body }, token);
      setImportStatus(`יובאו ${result.invitationsCreated} הזמנות ו-${result.guestsCreated} אורחים.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בייבוא');
      setImportStatus('');
    }
  };

  return (
    <PageContainer title="כלים חכמים" subtitle="ייבוא מאקסל, אינדיקציות חכמות ותחזית צריכה. מקום אחד לכלי-עזר עם ערך מיידי." loading={loading} error={error}>
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="ייבוא אקסל" kicker="Backend import service">
          <label className="flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-[30px] border-2 border-dashed border-[#d9ccb4] bg-[linear-gradient(180deg,#fffaf1_0%,#f8f4ed_100%)] px-6 text-center shadow-warm-sm transition hover:border-gold-400 hover:shadow-warm">
            <span className="text-5xl">⌘</span>
            <p className="mt-4 text-lg font-semibold text-stone-900">העלאת קובץ אורחים</p>
            <p className="mt-2 max-w-sm text-sm leading-6 text-stone-500">ה-backend יפרק את הרשומות למשקי בית ולאורחים בודדים לפי המבנה החדש.</p>
            <input className="hidden" type="file" accept=".xlsx,.xls" onChange={handleImport} />
          </label>
          {importStatus && <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{importStatus}</div>}
        </SectionCard>
        <SectionCard title="Smart warnings" kicker="Ops overview">
          {warnings.length === 0 ? <EmptyState title="אין חריגות פעילות" text="מערכת נקייה, תוכלו להתמקד בייבוא, תקציב ו-RSVP." /> : (
            <div className="space-y-3">
              {warnings.map((warning) => (
                <div key={warning.type} className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                  <p className="font-semibold text-stone-900">{warning.message}</p>
                  {warning.data?.length ? <p className="mt-2 text-sm text-stone-500">שולחנות: {warning.data.map((item) => item.number).join(', ')}</p> : null}
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
      <div className="mt-6">
        <SectionCard title="מחשבון אלכוהול" kicker="Israeli evening wedding">
          {alcohol ? (
            <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
              <MiniMetric label="בירה" value={alcohol.beer_bottles} />
              <MiniMetric label="יין" value={alcohol.wine_bottles} />
              <MiniMetric label="וודקה" value={alcohol.vodka_bottles} />
              <MiniMetric label="וויסקי" value={alcohol.whiskey_bottles} />
              <MiniMetric label="ערק" value={alcohol.arak_bottles} />
              <MiniMetric label="בפרופיל" value={`${alcohol.confirmedAdults} אורחים`} />
            </div>
          ) : <EmptyState title="אין חישוב" text="אשרו הגעה כדי לקבל תחזית צריכה." />}
        </SectionCard>
      </div>
    </PageContainer>
  );
}
