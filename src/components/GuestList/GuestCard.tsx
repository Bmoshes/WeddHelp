import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Guest } from '../../types';

interface GuestCardProps {
    guest: Guest;
    onDelete: (id: string) => void;
}

export const GuestCard: React.FC<GuestCardProps> = ({ guest, onDelete }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: guest.id,
        data: {
            type: 'guest',
            guest,
        },
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    const categoryColors: Record<string, string> = {
        family: 'bg-amber-50 text-amber-700 border-amber-200',
        friend: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        colleague: 'bg-slate-50 text-slate-700 border-slate-200',
        other: 'bg-stone-50 text-stone-600 border-stone-200'
    };

    const sideColors: Record<string, string> = {
        groom: 'bg-blue-50 text-blue-700 border-blue-200',
        bride: 'bg-rose-50 text-rose-700 border-rose-200',
        both: 'bg-purple-50 text-purple-700 border-purple-200'
    };

    const categoryLabels: Record<string, string> = {
        family: 'משפחה',
        friend: 'חברים',
        colleague: 'עבודה',
        other: 'אחר'
    };

    const sideLabels: Record<string, string> = {
        groom: 'חתן',
        bride: 'כלה',
        both: 'ביחד'
    };

    const hasConflicts = guest.conflictsWith.length > 0;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={`
                relative bg-white rounded-xl border p-3 cursor-grab active:cursor-grabbing group
                transition-all duration-300 card-hover
                ${isDragging ? 'shadow-xl rotate-3 scale-105 z-50 ring-2 ring-amber-400 opacity-90' : 'shadow-sm border-stone-100 hover:border-amber-200'}
                ${hasConflicts ? 'border-red-200 bg-red-50/30' : ''}
            `}
        >
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`למחוק את ${guest.name}?`)) onDelete(guest.id);
                }}
                className="absolute top-2 left-2 text-stone-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1"
                title="מחק אורח"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>

            <div className="flex flex-col gap-1.5 pr-1">
                <div className="flex items-center justify-between">
                    <h4 className="font-bold text-stone-800 text-base">{guest.name}</h4>
                    {guest.notes && (
                        <span
                            className="bg-red-50 text-red-600 text-[10px] px-1.5 py-0.5 rounded-full border border-red-100 max-w-[80px] truncate"
                            title={guest.notes}
                        >
                            {guest.notes}
                        </span>
                    )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                    {/* Amount Badge - SHOW IF > 1 */}
                    {guest.amount && guest.amount > 1 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold border bg-purple-100 text-purple-700 border-purple-200 flex items-center gap-1">
                            👥 {guest.amount}
                        </span>
                    )}

                    {/* Category Badge */}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${categoryColors[guest.category] || categoryColors.other}`}>
                        {categoryLabels[guest.category] || guest.category}
                    </span>

                    {/* Side Badge */}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${sideColors[guest.side]}`}>
                        {sideLabels[guest.side]}
                    </span>

                    {/* Specific Group ID Badge - Shows ONLY if different from category */}
                    {guest.groupId && guest.groupId !== categoryLabels[guest.category] && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium border bg-stone-100 text-stone-600 border-stone-200 flex items-center gap-1" title="קבוצת קשר">
                            🏷️ {guest.groupId}
                        </span>
                    )}

                    {/* Age Badge */}
                    {guest.age && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium border bg-stone-50 text-stone-500 border-stone-200">
                            גיל {guest.age}
                        </span>
                    )}
                </div>
            </div>

            {hasConflicts && (
                <div className="absolute -right-1 -top-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-sm ring-2 ring-white" title="התנגשות הושבה!" />
            )}
        </div>
    );
};
