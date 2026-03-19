import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Table, Guest } from '../../types';
import { useSeatingStore } from '../../store/seatingStore';
import { RectangularTable } from './shapes/RectangularTable';
import { RoundTable } from './shapes/RoundTable';
import { ConfirmDialog } from '../shared/ConfirmDialog';

interface TableCardProps {
    table: Table;
    guests: Guest[];
    onGuestDrop?: (guestId: string, tableId: string) => void;
}

export const TableCard: React.FC<TableCardProps> = ({ table, guests }) => {
    const { updateTable, removeTable, unassignGuest } = useSeatingStore();
    const { setNodeRef, isOver } = useDroppable({
        id: table.id,
        data: { type: 'table', table },
    });

    const [isEditingCapacity, setIsEditingCapacity] = useState(false);
    const [capacityInput, setCapacityInput] = useState(table.capacity.toString());
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const tableType = table.type || 'regular';
    const totalOccupied = guests.reduce((sum, g) => sum + (g.amount || 1), 0);
    const isFull = totalOccupied >= table.capacity;
    const hasConflicts = guests.some(g =>
        g.conflictsWith.some(conflictId => guests.some(ig => ig.id === conflictId))
    );

    const handleCapacityUpdate = () => {
        const newCapacity = parseInt(capacityInput);
        if (!isNaN(newCapacity) && newCapacity > 0 && newCapacity >= totalOccupied && newCapacity <= 60) {
            updateTable(table.id, { capacity: newCapacity });
            setIsEditingCapacity(false);
        } else {
            setCapacityInput(table.capacity.toString());
            setIsEditingCapacity(false);
        }
    };

    return (
        <>
            <div
                ref={setNodeRef}
                className={`
                    relative flex flex-col bg-white rounded-2xl border-2 overflow-visible
                    transition-all duration-200 p-6 min-h-[420px]
                    ${isOver
                        ? 'border-amber-400 ring-4 ring-amber-100/70 scale-[1.015] shadow-warm-md'
                        : hasConflicts
                            ? 'border-red-200 shadow-warm ring-1 ring-red-100'
                            : 'border-[#e4ddd4] shadow-warm-sm hover:shadow-warm hover:border-stone-300'}
                    ${isFull && !isOver ? 'bg-stone-50/60' : ''}
                `}
            >
                {/* ── Top-right: delete button ──────────────────────────── */}
                <div className="absolute top-3.5 right-4 z-40">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (guests.length > 0) setShowDeleteConfirm(true);
                            else removeTable(table.id);
                        }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg
                                   text-stone-300 hover:text-red-500 hover:bg-red-50
                                   transition-all"
                        title="מחק שולחן"
                        data-testid="delete-table-btn"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>

                {/* ── Top-left: type selector + capacity ──────────────────── */}
                <div className="absolute top-3 left-4 z-40 flex items-center gap-2">
                    <select
                        value={tableType}
                        onChange={(e) => updateTable(table.id, { type: e.target.value as 'regular' | 'knight' })}
                        className="appearance-none text-[11px] font-semibold bg-white border border-[#e4ddd4]
                                   rounded-full px-3 py-1 text-stone-600
                                   focus:outline-none focus:border-amber-400 hover:border-stone-300
                                   cursor-pointer shadow-warm-xs transition-all"
                        style={{ textAlignLast: 'center' }}
                    >
                        <option value="regular">● עגול</option>
                        <option value="knight">◼ מלבן</option>
                    </select>

                    {isEditingCapacity ? (
                        <input
                            autoFocus
                            type="number"
                            className="w-16 bg-white border border-amber-400 rounded-full text-center
                                       font-bold text-xs py-1 outline-none shadow-warm-xs"
                            value={capacityInput}
                            onChange={(e) => setCapacityInput(e.target.value)}
                            onBlur={handleCapacityUpdate}
                            onKeyDown={(e) => e.key === 'Enter' && handleCapacityUpdate()}
                        />
                    ) : (
                        <div
                            onClick={() => setIsEditingCapacity(true)}
                            className={`
                                flex items-center gap-1 cursor-pointer text-[11px] font-bold
                                px-2.5 py-1 rounded-full border shadow-warm-xs transition-all
                                ${isFull
                                    ? 'bg-red-50 text-red-600 border-red-200'
                                    : 'bg-white text-stone-700 border-[#e4ddd4] hover:border-amber-300 hover:text-amber-700'}
                            `}
                            title="לחץ לעריכת קיבולת"
                        >
                            {totalOccupied}/{table.capacity}
                            <span className="opacity-50 font-normal hidden sm:inline">מקומות</span>
                        </div>
                    )}
                </div>

                {/* ── Visual floor plan ─────────────────────────────────── */}
                <div className="flex-1 relative flex items-center justify-center mt-2 overflow-auto">
                    {tableType === 'knight' ? (
                        <RectangularTable table={table} guests={guests} unassignGuest={unassignGuest} />
                    ) : (
                        <RoundTable table={table} guests={guests} unassignGuest={unassignGuest} />
                    )}
                </div>

                {/* Conflict badge */}
                {hasConflicts && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2
                                    text-[10px] font-semibold text-red-600 bg-red-50 border border-red-200
                                    px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        ⚠️ התנגשות הושבה
                    </div>
                )}
            </div>

            <ConfirmDialog
                isOpen={showDeleteConfirm}
                title="מחיקת שולחן"
                message={`למחוק את שולחן ${table.number}? האורחים יחזרו לרשימת ההמתנה.`}
                onConfirm={() => { setShowDeleteConfirm(false); removeTable(table.id); }}
                onCancel={() => setShowDeleteConfirm(false)}
                confirmLabel="מחק"
                dangerous
            />
        </>
    );
};
