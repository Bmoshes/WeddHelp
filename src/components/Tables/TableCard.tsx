import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Table, Guest } from '../../types';
import { GuestCard } from '../GuestList/GuestCard';
import { useSeatingStore } from '../../store/seatingStore';

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

    const handleCapacityUpdate = () => {
        const newCapacity = parseInt(capacityInput);
        if (!isNaN(newCapacity) && newCapacity > 0 && newCapacity <= 50) {
            updateTable(table.id, { capacity: newCapacity });
            setIsEditingCapacity(false);
        } else {
            setCapacityInput(table.capacity.toString());
            setIsEditingCapacity(false);
        }
    };

    const isFull = guests.length >= table.capacity;
    const hasConflicts = guests.some(g => g.conflictsWith.some(conflictId => guests.some(ig => ig.id === conflictId)));

    // Calculate table stats
    const groomSide = guests.filter(g => g.side === 'groom').length;
    const brideSide = guests.filter(g => g.side === 'bride').length;

    return (
        <div
            ref={setNodeRef}
            className={`
                relative flex flex-col h-full min-h-[300px]
                bg-white rounded-xl border-2 transition-all duration-300
                ${isOver ? 'border-amber-400 ring-4 ring-amber-100 scale-[1.02]' : 'border-stone-100 hover:border-amber-200 shadow-sm hover:shadow-md'}
                ${isFull ? 'bg-stone-50' : ''}
                ${hasConflicts ? 'border-red-300 shadow-red-100 ring-2 ring-red-50' : ''}
            `}
        >
            {/* Delete Button */}
            <button
                onClick={() => {
                    if (guests.length > 0) {
                        if (!confirm(`בשולחן זה יש ${guests.length} אורחים. מחיקת השולחן תחזיר אותם לרשימת ההמתנה. להמשיך?`)) {
                            return;
                        }
                    }
                    removeTable(table.id);
                }}
                className="absolute top-3 left-3 text-stone-300 hover:text-red-500 transition-colors p-1"
                title="מחק שולחן"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
            </button>

            {/* Header */}
            <div className="p-4 border-b border-stone-100 bg-stone-50 rounded-t-xl">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-bold text-xl shadow-md">
                            {table.number}
                        </div>
                        <div>
                            <h3 className="font-bold text-stone-800">שולחן {table.number}</h3>
                            {/* Side preference indicator */}
                            {(groomSide > 0 || brideSide > 0) && (
                                <div className="text-xs text-stone-500 mt-0.5 flex gap-2">
                                    {groomSide > 0 && <span className="text-blue-600">👔 {groomSide}</span>}
                                    {brideSide > 0 && <span className="text-pink-600">👰 {brideSide}</span>}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between mt-3">
                    <div
                        className={`text-xs font-medium px-2.5 py-1 rounded-full border cursor-pointer hover:bg-white transition-colors
                            ${guests.length > table.capacity
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : isFull
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-green-50 text-green-700 border-green-200'}`}
                        onClick={() => setIsEditingCapacity(true)}
                        title="לחץ לעריכת קיבולת"
                    >
                        {isEditingCapacity ? (
                            <input
                                autoFocus
                                type="number"
                                min="1"
                                max="50"
                                className="w-12 bg-transparent border-b border-current outline-none text-center"
                                value={capacityInput}
                                onChange={(e) => setCapacityInput(e.target.value)}
                                onBlur={handleCapacityUpdate}
                                onKeyDown={(e) => e.key === 'Enter' && handleCapacityUpdate()}
                            />
                        ) : (
                            <span>{guests.length} / {table.capacity} מקומות</span>
                        )}
                    </div>

                    {hasConflicts && (
                        <span className="text-xs font-bold text-red-500 flex items-center gap-1 animate-pulse">
                            ⚠️ קונפליקט
                        </span>
                    )}
                </div>
            </div>

            {/* Guest List Area */}
            <div className="flex-1 p-3 overflow-y-auto min-h-[200px] max-h-[500px] space-y-2 bg-stone-50/50">
                {guests.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-stone-400 py-10">
                        <span className="text-4xl mb-2 opacity-20">🪑</span>
                        <p className="text-sm">גרור אורחים לכאן</p>
                    </div>
                ) : (
                    guests.map((guest) => (
                        <GuestCard
                            key={guest.id}
                            guest={guest}
                            onDelete={(id) => unassignGuest(id)}
                        />
                    ))
                )}
            </div>

            {/* Footer / Status bar for the table */}
            <div className="h-1.5 w-full bg-stone-100 rounded-b-xl overflow-hidden">
                <div
                    className={`h-full transition-all duration-500 ${isFull ? 'bg-amber-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.min((guests.length / table.capacity) * 100, 100)}%` }}
                />
            </div>
        </div>
    );
};
