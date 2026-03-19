import React, { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Guest } from '../../types';
import { ConfirmDialog } from '../shared/ConfirmDialog';

interface GuestCardProps {
    guest: Guest;
    onDelete: (id: string) => void;
}

// Left (RTL=right-side) accent color per category
const categoryAccent: Record<string, string> = {
    family:    'border-r-amber-400',
    friend:    'border-r-emerald-400',
    colleague: 'border-r-blue-400',
    other:     'border-r-stone-300',
};

const categoryBadge: Record<string, string> = {
    family:    'bg-amber-50 text-amber-700 border-amber-200',
    friend:    'bg-emerald-50 text-emerald-700 border-emerald-200',
    colleague: 'bg-blue-50 text-blue-700 border-blue-200',
    other:     'bg-stone-50 text-stone-600 border-stone-200',
};

const sideBadge: Record<string, string> = {
    groom: 'bg-sky-50 text-sky-700 border-sky-200',
    bride: 'bg-rose-50 text-rose-700 border-rose-200',
    both:  'bg-violet-50 text-violet-700 border-violet-200',
};

const categoryLabel: Record<string, string> = {
    family: 'משפחה', friend: 'חברים', colleague: 'עבודה', other: 'אחר',
};

const sideLabel: Record<string, string> = {
    groom: 'חתן', bride: 'כלה', both: 'ביחד',
};

export const GuestCard: React.FC<GuestCardProps> = ({ guest, onDelete }) => {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: guest.id,
        data: { type: 'guest', guest },
    });

    const style = transform
        ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
        : undefined;

    const hasConflicts = guest.conflictsWith.length > 0;
    const accent = categoryAccent[guest.category] || categoryAccent.other;

    return (
        <>
            <div
                ref={setNodeRef}
                style={style}
                {...listeners}
                {...attributes}
                className={`
                    relative bg-white rounded-xl border border-[#e4ddd4]
                    border-r-4 ${accent}
                    cursor-grab active:cursor-grabbing
                    group transition-all duration-200
                    ${isDragging
                        ? 'shadow-warm-xl rotate-2 scale-105 z-50 ring-2 ring-amber-400/50 opacity-95'
                        : 'shadow-warm-xs hover:shadow-warm hover:-translate-y-px'}
                    ${hasConflicts ? '!border-r-red-400 bg-red-50/30' : ''}
                    pl-3 pr-4 py-3
                `}
            >
                {/* Delete button */}
                <button
                    onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }}
                    className="absolute top-2 left-2 w-5 h-5 flex items-center justify-center
                               text-stone-300 hover:text-red-500
                               opacity-0 group-hover:opacity-100 transition-all rounded"
                    title="מחק אורח"
                    data-testid="delete-guest-btn"
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Content */}
                <div className="flex flex-col gap-1.5 pr-1">
                    {/* Name row */}
                    <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-stone-900 text-sm leading-tight">{guest.name}</h4>
                        {guest.notes && (
                            <span
                                className="text-[9px] px-1.5 py-0.5 rounded-full border bg-red-50 text-red-600 border-red-100 truncate max-w-[70px] shrink-0"
                                title={guest.notes}
                            >
                                {guest.notes}
                            </span>
                        )}
                    </div>

                    {/* Badges row */}
                    <div className="flex flex-wrap gap-1">
                        {guest.amount && guest.amount > 1 && (
                            <span className="badge bg-stone-100 text-stone-600 border-stone-200">
                                👥 {guest.amount}
                            </span>
                        )}
                        <span className={`badge ${categoryBadge[guest.category] || categoryBadge.other}`}>
                            {categoryLabel[guest.category] || guest.category}
                        </span>
                        <span className={`badge ${sideBadge[guest.side] || 'bg-stone-50 text-stone-600 border-stone-200'}`}>
                            {sideLabel[guest.side]}
                        </span>
                        {guest.groupId && !guest.groupId.startsWith('individual-') && (
                            <span className="badge bg-stone-50 text-stone-500 border-stone-200 max-w-[80px] truncate" title={guest.groupId}>
                                {guest.groupId}
                            </span>
                        )}
                    </div>
                </div>

                {/* Conflict indicator */}
                {hasConflicts && (
                    <div
                        className="absolute -right-1 -top-1 w-2.5 h-2.5 bg-red-500 rounded-full
                                   animate-pulse shadow-sm ring-2 ring-white"
                        title="התנגשות הושבה!"
                    />
                )}
            </div>

            <ConfirmDialog
                isOpen={showDeleteConfirm}
                title="מחיקת אורח"
                message={`למחוק את ${guest.name}?`}
                onConfirm={() => { setShowDeleteConfirm(false); onDelete(guest.id); }}
                onCancel={() => setShowDeleteConfirm(false)}
                confirmLabel="מחק"
                dangerous
            />
        </>
    );
};
