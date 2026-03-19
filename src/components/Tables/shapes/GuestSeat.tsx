import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Guest } from '../../../types';

interface GuestSeatProps {
    guest?: Guest;
    chairIndex?: number;
    unassignGuest?: (id: string) => void;
    className?: string;
    style?: React.CSSProperties;
    orientation?: 'horizontal' | 'vertical' | 'angled';
    /**
     * When false the name/badge label is suppressed entirely.
     * Use this in round-table layouts where the parent renders labels
     * separately at a larger radius to avoid overlap.
     */
    showLabel?: boolean;
}

const sideStyle: Record<string, { border: string; bg: string; ring: string; badge: string }> = {
    groom: { border: 'border-sky-400',    bg: 'bg-sky-50',    ring: 'ring-sky-100',    badge: 'bg-sky-100 text-sky-700'       },
    bride: { border: 'border-rose-400',   bg: 'bg-rose-50',   ring: 'ring-rose-100',   badge: 'bg-rose-100 text-rose-700'     },
    both:  { border: 'border-violet-400', bg: 'bg-violet-50', ring: 'ring-violet-100', badge: 'bg-violet-100 text-violet-700' },
};

const categoryMap: Record<string, string> = {
    family: 'משפחה', friend: 'חברים', colleague: 'עבודה', other: 'אחר',
};

export const GuestSeat: React.FC<GuestSeatProps> = ({
    guest,
    chairIndex = 0,
    unassignGuest,
    className = '',
    style,
    orientation = 'horizontal',
    showLabel = true,
}) => {
    const draggableId = guest ? `${guest.id}-chair-${chairIndex}` : 'empty-chair';

    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: draggableId,
        disabled: !guest,
        data: { guest, type: 'seated-guest' },
    });

    const dragStyle: React.CSSProperties = {
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging ? 100 : undefined,
        ...style,
    };

    const ss = guest ? (sideStyle[guest.side] ?? sideStyle.groom) : null;

    const badgeText = guest
        ? (guest.groupId && !guest.groupId.startsWith('individual')
            ? guest.groupId
            : categoryMap[guest.category] || guest.category)
        : '';

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className={`
                flex flex-col items-center justify-center
                transition-all duration-150
                ${isDragging ? 'opacity-0' : ''}
                ${guest ? 'cursor-grab active:cursor-grabbing' : ''}
                ${className}
            `}
            style={dragStyle}
        >
            <div className={`relative flex flex-col items-center ${guest ? 'group' : 'opacity-35'}`}>

                {/* ── Avatar circle ─────────────────────────────────────────── */}
                <div className={`
                    w-12 h-12 rounded-full border-2 flex items-center justify-center
                    relative z-10 transition-all duration-150
                    ${guest
                        ? `${ss!.border} ${ss!.bg} shadow-warm-sm ring-2 ${ss!.ring} group-hover:shadow-warm`
                        : 'border-dashed border-stone-300 bg-white'}
                `}>
                    {guest ? (
                        <span className="text-base select-none">👤</span>
                    ) : (
                        <span className="text-[10px] text-stone-300 select-none">○</span>
                    )}

                    {/* Unassign button */}
                    {guest && !isDragging && unassignGuest && (
                        <button
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center
                                       bg-red-500 text-white rounded-full text-[9px] font-bold
                                       opacity-0 group-hover:opacity-100 transition-opacity shadow-warm-xs z-30"
                            onPointerDown={(e) => { e.stopPropagation(); unassignGuest(guest.id); }}
                            title="הסר"
                        >
                            ✕
                        </button>
                    )}
                </div>

                {/* ── Name + badge label ────────────────────────────────────── */}
                {guest && showLabel && (
                    <div className="absolute top-11 flex flex-col items-center w-[100px] z-20 pointer-events-none">
                        <div className={`
                            text-[11px] font-semibold text-stone-800 px-2 py-0.5
                            bg-white/95 rounded-lg shadow-warm-xs border border-[#e4ddd4]
                            truncate max-w-full mb-0.5 text-center leading-tight
                            ${orientation === 'angled' ? 'origin-top-left -rotate-45 translate-y-3 translate-x-1' : ''}
                        `}>
                            {guest.name}
                        </div>
                        {badgeText && (
                            <div className={`text-[9px] font-semibold px-1.5 py-0 rounded-full leading-tight ${ss!.badge}`}>
                                {badgeText}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
