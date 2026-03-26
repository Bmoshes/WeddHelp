import {
  closestCorners,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiRequest } from '../app/api';
import { useAuth } from '../app/auth';
import type { Guest, SeatingPlan, Warning } from '../app/types';
import { EmptyState, Field, mealLabel, PageContainer, seatingSideLabel, SectionCard, SmartNumberInput } from '../app/ui';
import { ConfirmDialog } from '../components/shared/ConfirmDialog';

type OptimizationMode = 'default' | 'proximity';

type SeatingConfig = {
  tableCapacity: number;
  knightEnabled: boolean;
  knightCount: number;
  knightCapacity: number;
  knightGroupNames: string[];
  mode: OptimizationMode;
};

type DisplayGuest = {
  _id: string;
  firstName: string;
  lastName?: string;
  mealPreference?: string;
  relationshipGroup?: string;
  amount?: number;
  assignedTableId?: string | null;
};

const TEXT = {
  loadError: '\u05e9\u05d2\u05d9\u05d0\u05d4 \u05d1\u05d8\u05e2\u05d9\u05e0\u05d4',
  optimizeError: '\u05e9\u05d2\u05d9\u05d0\u05d4 \u05d1\u05d4\u05e8\u05e6\u05ea \u05d4\u05d0\u05d5\u05e4\u05d8\u05d9\u05de\u05d9\u05d6\u05e6\u05d9\u05d4',
  clearPlanError: '\u05e9\u05d2\u05d9\u05d0\u05d4 \u05d1\u05e0\u05d9\u05e7\u05d5\u05d9 \u05d4\u05ea\u05d5\u05db\u05e0\u05d9\u05ea',
  clearExcelError: '\u05e9\u05d2\u05d9\u05d0\u05d4 \u05d1\u05e0\u05d9\u05e7\u05d5\u05d9 \u05e0\u05ea\u05d5\u05e0\u05d9 \u05d4\u05d0\u05e7\u05e1\u05dc',
  clearPlanSuccess: '\u05ea\u05d5\u05db\u05e0\u05d9\u05ea \u05d4\u05d4\u05d5\u05e9\u05d1\u05d4 \u05e0\u05d5\u05e7\u05ea\u05d4.',
  title: '\u05e1\u05d9\u05d3\u05d5\u05e8\u05d9 \u05d9\u05e9\u05d9\u05d1\u05d4',
  subtitle: '\u05d4\u05de\u05e1\u05da \u05d4\u05d6\u05d4 \u05de\u05e0\u05d4\u05dc \u05d0\u05ea \u05d4\u05d4\u05e8\u05e6\u05d4 \u05de\u05d5\u05dc \u05d4-backend \u05d4\u05d7\u05d3\u05e9, \u05d1\u05dc\u05d9 \u05dc\u05d2\u05e2\u05ea \u05d1\u05de\u05e0\u05d5\u05e2 \u05d4\u05d4\u05d5\u05e9\u05d1\u05d4 \u05d4\u05e7\u05d9\u05d9\u05dd.',
  optimizationTitle: '\u05d1\u05e7\u05e8\u05ea \u05d0\u05d5\u05e4\u05d8\u05d9\u05de\u05d9\u05d6\u05e6\u05d9\u05d4',
  tablesTitle: '\u05ea\u05d5\u05db\u05e0\u05d9\u05ea \u05e9\u05d5\u05dc\u05d7\u05e0\u05d5\u05ea',
  unseatedTitle: '\u05dc\u05dc\u05d0 \u05db\u05d9\u05e1\u05d0',
  regularCapacity: '\u05e7\u05d9\u05d1\u05d5\u05dc\u05ea \u05e9\u05d5\u05dc\u05d7\u05df \u05e8\u05d2\u05d9\u05dc',
  optimizationMode: '\u05de\u05e6\u05d1 \u05d0\u05d5\u05e4\u05d8\u05d9\u05de\u05d9\u05d6\u05e6\u05d9\u05d4',
  defaultMode: '\u05d1\u05e8\u05d9\u05e8\u05ea \u05de\u05d7\u05d3\u05dc \u2013 \u05dc\u05e4\u05d9 \u05e7\u05d1\u05d5\u05e6\u05d5\u05ea',
  proximityMode: '\u05e7\u05e8\u05d1\u05ea \u05d9\u05d7\u05e1\u05d9\u05dd \u2013 \u05dc\u05e4\u05d9 \u05e7\u05e8\u05d1\u05d4 \u05d5\u05e9\u05dd \u05de\u05e9\u05e4\u05d7\u05d4',
  knightsEnabled: '\u05dc\u05d4\u05e4\u05e2\u05d9\u05dc \u05e9\u05d5\u05dc\u05d7\u05e0\u05d5\u05ea \u05d0\u05d1\u05d9\u05e8\u05d9\u05dd',
  knightCount: '\u05db\u05de\u05d5\u05ea \u05e9\u05d5\u05dc\u05d7\u05e0\u05d5\u05ea \u05d0\u05d1\u05d9\u05e8\u05d9\u05dd',
  knightCapacity: '\u05e7\u05d9\u05d1\u05d5\u05dc\u05ea \u05e9\u05d5\u05dc\u05d7\u05df \u05d0\u05d1\u05d9\u05e8\u05d9\u05dd',
  knightGroups: '\u05d1\u05d7\u05e8 \u05e7\u05d1\u05d5\u05e6\u05d5\u05ea \u05e7\u05e8\u05d1\u05d4 \u05dc\u05e9\u05d5\u05dc\u05d7\u05df \u05d0\u05d1\u05d9\u05e8\u05d9\u05dd',
  noKnightGroups: '\u05d0\u05d9\u05df \u05db\u05e8\u05d2\u05e2 \u05e7\u05d1\u05d5\u05e6\u05d5\u05ea \u05e7\u05e8\u05d1\u05d4 \u05d6\u05de\u05d9\u05e0\u05d5\u05ea \u05de\u05d4\u05d0\u05e7\u05e1\u05dc.',
  optimize: '\u05dc\u05d4\u05e8\u05d9\u05e5 \u05d0\u05d5\u05e4\u05d8\u05d9\u05de\u05d9\u05d6\u05e6\u05d9\u05d4',
  refresh: '\u05e8\u05e2\u05e0\u05d5\u05df',
  clearPlan: '\u05e0\u05d9\u05e7\u05d5\u05d9 \u05ea\u05d5\u05db\u05e0\u05d9\u05ea',
  clearExcel: '\u05e0\u05e7\u05d4 \u05e0\u05ea\u05d5\u05e0\u05d9 \u05d0\u05e7\u05e1\u05dc',
  warningsTitle: '\u05d4\u05ea\u05e8\u05d0\u05d5\u05ea \u05e8\u05dc\u05d5\u05d5\u05e0\u05d8\u05d9\u05d5\u05ea',
  noWarnings: '\u05d0\u05d9\u05df \u05d4\u05ea\u05e8\u05d0\u05d5\u05ea \u05d7\u05e8\u05d9\u05d2\u05d5\u05ea \u05db\u05e8\u05d2\u05e2.',
  noPlan: '\u05d0\u05d9\u05df \u05ea\u05d5\u05db\u05e0\u05d9\u05ea \u05e7\u05d9\u05d9\u05de\u05ea',
  noPlanText: '\u05d4\u05e8\u05d9\u05e6\u05d5 \u05d0\u05d5\u05e4\u05d8\u05d9\u05de\u05d9\u05d6\u05e6\u05d9\u05d4 \u05db\u05d3\u05d9 \u05dc\u05d9\u05d9\u05e6\u05e8 \u05ea\u05e6\u05d5\u05e8\u05ea \u05e9\u05d5\u05dc\u05d7\u05e0\u05d5\u05ea \u05e2\u05d3\u05db\u05e0\u05d9\u05ea.',
  noUnseatedGuests: '\u05d0\u05d9\u05df \u05db\u05e8\u05d2\u05e2 \u05d0\u05d5\u05e8\u05d7\u05d9\u05dd \u05dc\u05dc\u05d0 \u05db\u05d9\u05e1\u05d0.',
  dragHint: '\u05d2\u05e8\u05d5\u05e8 \u05dc\u05db\u05d0\u05df \u05d0\u05d5\u05e8\u05d7 \u05db\u05d3\u05d9 \u05dc\u05d4\u05e9\u05d0\u05d9\u05e8 \u05d0\u05d5\u05ea\u05d5 \u05dc\u05dc\u05d0 \u05e9\u05d9\u05d1\u05d5\u05e5.',
  roundTable: '\u05e9\u05d5\u05dc\u05d7\u05df \u05e2\u05d2\u05d5\u05dc',
  knightTable: '\u05e9\u05d5\u05dc\u05d7\u05df \u05d0\u05d1\u05d9\u05e8\u05d9\u05dd',
  removeGuest: '\u05d4\u05d5\u05e6\u05d0',
  confirmTitle: '\u05e0\u05d9\u05e7\u05d5\u05d9 \u05e0\u05ea\u05d5\u05e0\u05d9 \u05d0\u05e7\u05e1\u05dc',
  confirmMessage: '\u05e4\u05e2\u05d5\u05dc\u05d4 \u05d6\u05d5 \u05ea\u05de\u05d7\u05e7 \u05d0\u05ea \u05db\u05dc \u05d4\u05d4\u05d6\u05de\u05e0\u05d5\u05ea \u05d5\u05d4\u05d0\u05d5\u05e8\u05d7\u05d9\u05dd \u05e9\u05d9\u05d5\u05d1\u05d0\u05d5 \u05de\u05e7\u05d5\u05d1\u05e5 \u05d4\u05d0\u05e7\u05e1\u05dc \u05d5\u05ea\u05e0\u05e7\u05d4 \u05d0\u05ea \u05ea\u05d5\u05db\u05e0\u05d9\u05ea \u05d4\u05d4\u05d5\u05e9\u05d1\u05d4. \u05d4\u05d0\u05d5\u05e8\u05d7\u05d9\u05dd \u05e9\u05e0\u05d5\u05e1\u05e4\u05d5 \u05d9\u05d3\u05e0\u05d9\u05ea \u05d9\u05d9\u05e9\u05d0\u05e8\u05d5. \u05e4\u05e2\u05d5\u05dc\u05d4 \u05d6\u05d5 \u05d0\u05d9\u05e0\u05d4 \u05d4\u05e4\u05d9\u05db\u05d4.',
};

const seatingCollisionDetection: CollisionDetection = (args) => {
  const pointerHits = pointerWithin(args);
  if (pointerHits.length > 0) {
    return pointerHits;
  }

  return closestCorners(args);
};

function GuestCard({ guest, onRemove, style, draggable = false, dragProps = {}, dragging = false }: {
  guest: DisplayGuest;
  onRemove?: (guestId: string) => void;
  style?: CSSProperties;
  draggable?: boolean;
  dragProps?: Record<string, unknown>;
  dragging?: boolean;
}) {
  return (
    <div
      style={style}
      {...dragProps}
      className={`flex items-center justify-between gap-3 rounded-2xl border border-[#ece2d2] bg-white px-3 py-2 text-sm shadow-warm-xs ${
        draggable ? 'cursor-grab select-none touch-none active:cursor-grabbing' : ''
      } ${dragging ? 'scale-[1.02] border-gold-300 bg-gold-50 shadow-lg shadow-gold-200/60' : ''}`}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-stone-900">{guest.firstName} {guest.lastName}</p>
        <p className="truncate text-xs text-stone-400">
          {guest.relationshipGroup || mealLabel(guest.mealPreference as Guest['mealPreference'])}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {(guest.amount || 1) > 1 ? (
          <span
            title="מספר האנשים שהאורח מגיע איתם"
            className="min-w-8 rounded-full border border-gold-300 bg-gold-50 px-2 py-1 text-center text-xs font-bold text-gold-800"
          >
            {guest.amount}
          </span>
        ) : null}
        {onRemove ? (
          <button
            type="button"
            className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onRemove(guest._id);
            }}
          >
            {TEXT.removeGuest}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function DraggableGuest({ guest, onRemove }: { guest: DisplayGuest; onRemove?: (guestId: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: guest._id,
    data: { type: 'guest', guestId: guest._id },
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.35 : 1,
      }}
    >
      <GuestCard guest={guest} onRemove={onRemove} draggable dragging={isDragging} dragProps={{ ...listeners, ...attributes }} />
    </div>
  );
}

function DroppableArea({
  id,
  children,
  className,
}: {
  id: string;
  children: ReactNode;
  className: string;
}) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`${className} ${isOver ? 'ring-2 ring-gold-300 border-gold-300 bg-gold-50/50' : ''}`}
    >
      {children}
    </div>
  );
}

function UnseatedPanel({ guests }: { guests: Guest[] }) {
  return (
    <DroppableArea
      id="unseated-pool"
      className="rounded-[26px] border border-dashed border-[#e0d5c0] bg-[#faf8f2] p-4"
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="font-semibold text-stone-900">{TEXT.unseatedTitle}</p>
        <span className="badge border-stone-200 bg-white text-stone-600">{guests.length}</span>
      </div>
      <p className="mb-3 text-xs text-stone-400">{TEXT.dragHint}</p>
      <div className="space-y-2">
        {guests.length === 0 ? (
          <p className="text-sm text-stone-500">{TEXT.noUnseatedGuests}</p>
        ) : (
          guests.map((guest) => <DraggableGuest key={guest._id} guest={guest} />)
        )}
      </div>
    </DroppableArea>
  );
}

export function SeatingPage() {
  const { token } = useAuth();
  const [plan, setPlan] = useState<SeatingPlan>({ tables: [] });
  const [guests, setGuests] = useState<Guest[]>([]);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [relationshipGroups, setRelationshipGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showClearExcelConfirm, setShowClearExcelConfirm] = useState(false);
  const [activeGuest, setActiveGuest] = useState<Guest | null>(null);
  const [config, setConfig] = useState<SeatingConfig>({
    tableCapacity: 12,
    knightEnabled: false,
    knightCount: 1,
    knightCapacity: 20,
    knightGroupNames: [],
    mode: 'default',
  });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [planRes, guestsRes, warningsRes, relationshipGroupsRes] = await Promise.all([
        apiRequest<SeatingPlan>('/api/seating/plan', {}, token),
        apiRequest<Guest[]>('/api/guests', {}, token),
        apiRequest<{ warnings: Warning[] }>('/api/wedding/warnings', {}, token),
        apiRequest<{ groups: string[] }>('/api/seating/relationship-groups', {}, token),
      ]);
      setPlan(planRes);
      setGuests(guestsRes);
      setWarnings(warningsRes.warnings);
      setRelationshipGroups(relationshipGroupsRes.groups);
    } catch (err) {
      setError(err instanceof Error ? err.message : TEXT.loadError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [token]);

  const unseatedGuests = useMemo(() => guests.filter((guest) => !guest.assignedTableId), [guests]);
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 180,
        tolerance: 8,
      },
    }),
  );

  const toggleKnightGroup = (group: string) => {
    setConfig((current) => ({
      ...current,
      knightGroupNames: current.knightGroupNames.includes(group)
        ? current.knightGroupNames.filter((item) => item !== group)
        : [...current.knightGroupNames, group],
    }));
  };

  const getSeatCount = (seatGuests: Array<{ amount?: number }>) =>
    seatGuests.reduce((sum, guest) => sum + (guest.amount || 1), 0);

  const applyManualAssignmentLocally = (guestId: string, tableId: string | null) => {
    const movedGuest = guests.find((guest) => guest._id === guestId);

    setGuests((currentGuests) =>
      currentGuests.map((guest) => (
        guest._id === guestId
          ? { ...guest, assignedTableId: tableId }
          : guest
      )),
    );

    setPlan((currentPlan) => {
      if (!movedGuest) return currentPlan;

      const nextTables = currentPlan.tables.map((table) => {
        const remainingGuests = table.assignedGuestIds.filter((guest) => guest._id !== guestId);

        if (table.tableId === tableId) {
          const alreadyInTable = table.assignedGuestIds.some((guest) => guest._id === guestId);
          return {
            ...table,
            assignedGuestIds: alreadyInTable
              ? table.assignedGuestIds
              : [...remainingGuests, { ...movedGuest, assignedTableId: tableId }],
          };
        }

        return {
          ...table,
          assignedGuestIds: remainingGuests,
        };
      });

      return {
        ...currentPlan,
        tables: nextTables,
      };
    });
  };

  const handleOptimize = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await apiRequest<{ message: string; tablesCount: number; seatedGuests: number }>('/api/seating/optimize', {
        method: 'POST',
        body: JSON.stringify({
          tableCapacity: Number(config.tableCapacity),
          mode: config.mode,
          knightConfig: config.knightEnabled
            ? { enabled: true, count: Number(config.knightCount), capacity: Number(config.knightCapacity) }
            : { enabled: false, count: 0, capacity: 20 },
          knightGroupNames: config.knightGroupNames,
        }),
      }, token);
      setMessage(`${response.message} · ${response.tablesCount} שולחנות · ${response.seatedGuests} אורחים`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : TEXT.optimizeError);
    } finally {
      setBusy(false);
    }
  };

  const handleManualAssignment = async (guestId: string, tableId: string | null) => {
    setBusy(true);
    setError('');
    try {
      const response = await apiRequest<{ message: string }>(
        `/api/seating/assignments/${guestId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ tableId }),
        },
        token,
      );
      setMessage(response.message);
      applyManualAssignmentLocally(guestId, tableId);
    } catch (err) {
      setError(err instanceof Error ? err.message : TEXT.optimizeError);
    } finally {
      setBusy(false);
    }
  };

  const handleClear = async () => {
    setBusy(true);
    try {
      await apiRequest('/api/seating/plan', { method: 'DELETE' }, token);
      setMessage(TEXT.clearPlanSuccess);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : TEXT.clearPlanError);
    } finally {
      setBusy(false);
    }
  };

  const handleClearExcelData = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await apiRequest<{ invitationsDeleted: number; guestsDeleted: number }>(
        '/api/seating/excel-import',
        { method: 'DELETE' },
        token,
      );
      setMessage(`נתוני האקסל נוקו · ${result.invitationsDeleted} הזמנות · ${result.guestsDeleted} אורחים`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : TEXT.clearExcelError);
    } finally {
      setBusy(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const guest = guests.find((item) => item._id === event.active.id);
    setActiveGuest(guest || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveGuest(null);
    if (!event.over) return;

    const guestId = String(event.active.id);
    const overId = String(event.over.id);
    const guest = guests.find((item) => item._id === guestId);

    if (!guest) return;

    if (overId === 'unseated-pool') {
      if (!guest.assignedTableId) return;
      await handleManualAssignment(guestId, null);
      return;
    }

    if (overId.startsWith('table:')) {
      const targetTableId = overId.replace('table:', '');
      if (guest.assignedTableId === targetTableId) return;
      await handleManualAssignment(guestId, targetTableId);
    }
  };

  const knightSelectionRequiresProximity = config.knightEnabled && config.knightGroupNames.length > 0;

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={seatingCollisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={(event) => void handleDragEnd(event)}
      >
        <PageContainer title={TEXT.title} subtitle={TEXT.subtitle} loading={loading} error={error}>
          <div className="grid items-start gap-6 xl:grid-cols-[0.72fr_1.28fr]">
            <div className="space-y-6 self-start xl:sticky xl:top-6 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto xl:pr-2">
              <SectionCard title={TEXT.optimizationTitle} kicker="Backend seating bridge">
                <div className="space-y-4">
                <Field label={TEXT.regularCapacity}>
                  <SmartNumberInput
                    className="input"
                    min={1}
                    max={50}
                    value={config.tableCapacity}
                    onChange={(value) => setConfig({ ...config, tableCapacity: Number(value) || 1 })}
                  />
                </Field>

                <Field label={TEXT.optimizationMode}>
                  <select
                    className="input"
                    value={config.mode}
                    onChange={(event) => setConfig({ ...config, mode: event.target.value as OptimizationMode })}
                  >
                    <option value="default">{TEXT.defaultMode}</option>
                    <option value="proximity">{TEXT.proximityMode}</option>
                  </select>
                </Field>

                <label className="flex items-center gap-3 rounded-2xl border border-[#ece2d2] bg-[#fcfbf8] px-4 py-3">
                  <input
                    type="checkbox"
                    checked={config.knightEnabled}
                    onChange={(event) => setConfig({ ...config, knightEnabled: event.target.checked })}
                  />
                  <span className="font-medium">{TEXT.knightsEnabled}</span>
                </label>

                {config.knightEnabled && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label={TEXT.knightCount}>
                        <SmartNumberInput
                          className="input"
                          min={1}
                          value={config.knightCount}
                          onChange={(value) => setConfig({ ...config, knightCount: Number(value) || 1 })}
                        />
                      </Field>
                      <Field label={TEXT.knightCapacity}>
                        <SmartNumberInput
                          className="input"
                          min={1}
                          value={config.knightCapacity}
                          onChange={(value) => setConfig({ ...config, knightCapacity: Number(value) || 1 })}
                        />
                      </Field>
                    </div>

                    <Field label={TEXT.knightGroups}>
                      {relationshipGroups.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-[#e0d5c0] bg-[#faf8f2] px-4 py-3 text-sm text-stone-500">
                          {TEXT.noKnightGroups}
                        </div>
                      ) : (
                        <div className="rounded-[26px] border border-[#ece2d2] bg-[#fcfbf8] p-3">
                          <div className="flex flex-wrap gap-2">
                            {relationshipGroups.map((group) => {
                              const selected = config.knightGroupNames.includes(group);
                              return (
                                <button
                                  key={group}
                                  type="button"
                                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                                    selected
                                      ? 'border-stone-900 bg-stone-900 text-white'
                                      : 'border-[#e3d9c6] bg-white text-stone-700 hover:border-stone-400'
                                  }`}
                                  onClick={() => toggleKnightGroup(group)}
                                >
                                  {group}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </Field>

                    {knightSelectionRequiresProximity && config.mode === 'default' ? (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        {'בחירת קרבה לשולחנות אבירים תפעל דרך מצב "קרבת יחסים".'}
                      </div>
                    ) : null}
                  </>
                )}

                {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{message}</div>}

                <div className="flex flex-wrap gap-2">
                  <button className="btn btn-primary" disabled={busy} onClick={handleOptimize}>{TEXT.optimize}</button>
                  <button className="btn btn-secondary" disabled={busy} onClick={() => void load()}>{TEXT.refresh}</button>
                  <button className="btn btn-danger" disabled={busy} onClick={handleClear}>{TEXT.clearPlan}</button>
                  <button className="btn btn-danger" disabled={busy} onClick={() => setShowClearExcelConfirm(true)}>{TEXT.clearExcel}</button>
                </div>

                <div className="rounded-[26px] border border-[#ece2d2] bg-[#fcfbf8] p-4">
                  <p className="font-semibold text-stone-900">{TEXT.warningsTitle}</p>
                  <div className="mt-3 space-y-2">
                    {warnings.length === 0 && <p className="text-sm text-stone-500">{TEXT.noWarnings}</p>}
                    {warnings.map((warning) => (
                      <div key={warning.type} className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                        {warning.message}
                      </div>
                    ))}
                  </div>
                </div>

                  <UnseatedPanel guests={unseatedGuests} />
                </div>
              </SectionCard>
            </div>

            <SectionCard title={TEXT.tablesTitle} kicker={`${plan.tables.length} tables`}>
              {plan.tables.length === 0 ? (
                <EmptyState title={TEXT.noPlan} text={TEXT.noPlanText} />
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {plan.tables.map((table) => (
                    <DroppableArea
                      key={table.tableId}
                      id={`table:${table.tableId}`}
                      className="rounded-[28px] border border-[#e9decb] bg-[linear-gradient(180deg,#fffdf9_0%,#f8f4ed_100%)] p-5 shadow-warm"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.28em] text-stone-400">Table {table.number}</p>
                          <h3 className="mt-2 text-2xl font-bold text-stone-900">{table.isKnight ? TEXT.knightTable : TEXT.roundTable}</h3>
                          <p className="mt-2 text-sm text-stone-500">
                            {seatingSideLabel(table.side)}
                            {table.relationshipGroup ? ` · ${table.relationshipGroup}` : ''}
                          </p>
                        </div>
                        <span className="badge border-stone-200 bg-white text-stone-600">{getSeatCount(table.assignedGuestIds)}/{table.capacity}</span>
                      </div>

                      <div className="mt-4 space-y-2">
                        {table.assignedGuestIds.map((guest) => (
                          <DraggableGuest
                            key={guest._id}
                            guest={guest}
                            onRemove={(guestId) => void handleManualAssignment(guestId, null)}
                          />
                        ))}
                      </div>
                    </DroppableArea>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        </PageContainer>

        {typeof document !== 'undefined'
          ? createPortal(
              <DragOverlay dropAnimation={null} zIndex={9999}>
                {activeGuest ? (
                  <div className="pointer-events-none w-[280px] -rotate-1 opacity-100">
                    <GuestCard
                      guest={activeGuest}
                      dragging
                      style={{
                        boxShadow: '0 24px 60px rgba(191, 161, 74, 0.28)',
                        borderColor: '#d4b04c',
                        backgroundColor: '#fff9eb',
                      }}
                    />
                  </div>
                ) : null}
              </DragOverlay>,
              document.body,
            )
          : null}
      </DndContext>

      <ConfirmDialog
        isOpen={showClearExcelConfirm}
        title={TEXT.confirmTitle}
        message={TEXT.confirmMessage}
        onConfirm={() => { setShowClearExcelConfirm(false); void handleClearExcelData(); }}
        onCancel={() => setShowClearExcelConfirm(false)}
        confirmLabel={TEXT.clearExcel}
        dangerous
      />
    </>
  );
}
