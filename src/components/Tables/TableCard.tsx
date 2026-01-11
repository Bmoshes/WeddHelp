import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Table, Guest } from '../../types';
import { useSeatingStore } from '../../store/seatingStore';
import { RectangularTable } from './shapes/RectangularTable';
import { RoundTable } from './shapes/RoundTable';

interface TableCardProps {
    table: Table;
    guests: Guest[];
    onGuestDrop?: (guestId: string, tableId: string) => void;
}

export const TableCard: React.FC<TableCardProps> = ({ table, guests }) => {
    const { updateTable, removeTable, unassignGuest } = useSeatingStore();
    const { setNodeRef, isOver } = useDroppable({
        id: table.id,
        data: {
            type: 'table',
            table,
        },
    });

    const [isEditingCapacity, setIsEditingCapacity] = useState(false);
    const [capacityInput, setCapacityInput] = useState(table.capacity.toString());

    // Default to 'regular' if not specified
    const tableType = table.type || 'regular';

    const handleCapacityUpdate = () => {
        const newCapacity = parseInt(capacityInput);
        if (!isNaN(newCapacity) && newCapacity > 0 && newCapacity <= 60) {
            updateTable(table.id, { capacity: newCapacity });
            setIsEditingCapacity(false);
        } else {
            setCapacityInput(table.capacity.toString());
            setIsEditingCapacity(false);
        }
    };

    const handleTypeChange = (type: 'regular' | 'knight') => {
        updateTable(table.id, { type });
    };

    // Calculate stats considering amounts
    const totalOccupied = guests.reduce((sum, g) => sum + (g.amount || 1), 0);
    const isFull = totalOccupied >= table.capacity;
    const hasConflicts = guests.some(g => g.conflictsWith.some(conflictId => guests.some(ig => ig.id === conflictId)));

    return (
        <div
            ref={setNodeRef}
            className={`
                relative flex flex-col
                bg-white rounded-xl border-2 transition-all duration-300 overflow-visible
                ${isOver ? 'border-amber-400 ring-4 ring-amber-100 scale-[1.02]' : 'border-stone-100 hover:border-amber-200 shadow-sm hover:shadow-lg'}
                ${isFull ? 'bg-stone-50/50' : ''}
                ${hasConflicts ? 'border-red-300 shadow-red-100 ring-2 ring-red-50' : ''}
                p-6 min-h-[400px]
            `}
        >
            {/* --- New Minimal Header --- */}
            <div className="absolute top-4 right-4 z-40 flex items-center gap-2">
                {/* Delete Button - Subtle on hover */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (guests.length > 0 && !confirm(`למחוק את שולחן ${table.number}? האורחים יחזרו לרשימת ההמתנה.`)) return;
                        removeTable(table.id);
                    }}
                    className="text-stone-300 hover:text-red-500 transition-colors p-1.5 rounded-full hover:bg-stone-50"
                    title="מחק שולחן"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
            </div>

            <div className="absolute top-4 left-4 z-40 flex items-center gap-2">
                {/* Type Selector - Minimal Pill */}
                <select
                    value={tableType}
                    onChange={(e) => handleTypeChange(e.target.value as 'regular' | 'knight')}
                    className="appearance-none text-xs font-medium bg-white border border-stone-200 rounded-full px-3 py-1 text-stone-500 focus:outline-none focus:border-amber-400 hover:border-amber-300 cursor-pointer shadow-sm transition-all text-center"
                    style={{ textAlignLast: 'center' }}
                >
                    <option value="regular">● עגול</option>
                    <option value="knight">◼ מלבן</option>
                </select>

                {/* Capacity Badge - Click to Edit */}
                <div className="relative group">
                    {isEditingCapacity ? (
                        <input
                            autoFocus
                            type="number"
                            className="w-16 bg-white border border-amber-400 rounded-full text-center font-bold text-xs py-1 outline-none shadow-sm"
                            value={capacityInput}
                            onChange={(e) => setCapacityInput(e.target.value)}
                            onBlur={handleCapacityUpdate}
                            onKeyDown={(e) => e.key === 'Enter' && handleCapacityUpdate()}
                        />
                    ) : (
                        <div
                            onClick={() => setIsEditingCapacity(true)}
                            className={`
                                flex items-center gap-1.5 cursor-pointer 
                                text-xs font-bold px-3 py-1 rounded-full border shadow-sm transition-all
                                ${isFull ? 'bg-red-50 text-red-600 border-red-100' : 'bg-white text-stone-600 border-stone-200 hover:border-amber-300 hover:text-amber-600'}
                            `}
                            title="לחץ לעריכת קיבולת"
                        >
                            <span>{totalOccupied}/{table.capacity}</span>
                            <span className="opacity-50 font-normal">|</span>
                            <span className="opacity-70">מקומות</span>
                        </div>
                    )}
                </div>
            </div>

            {/* --- VISUAL FLOOR PLAN AREA --- */}
            <div className="flex-1 relative flex items-center justify-center">
                {tableType === 'knight' ? (
                    <RectangularTable
                        table={table}
                        guests={guests}
                        unassignGuest={unassignGuest}
                    />
                ) : (
                    <RoundTable
                        table={table}
                        guests={guests}
                        unassignGuest={unassignGuest}
                    />
                )}
            </div>
        </div>
    );
};

