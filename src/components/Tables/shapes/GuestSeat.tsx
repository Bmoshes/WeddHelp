import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Guest } from '../../../types';

interface GuestSeatProps {
    guest?: Guest;
    chairIndex?: number; // For multiple seats per guest
    unassignGuest?: (id: string) => void;
    className?: string;
    style?: React.CSSProperties;
    orientation?: 'horizontal' | 'vertical' | 'angled';
}

export const GuestSeat: React.FC<GuestSeatProps> = ({
    guest,
    chairIndex = 0,
    unassignGuest,
    className = '',
    style,
    orientation = 'horizontal'
}) => {
    // Unique ID for each chair instance
    const draggableId = guest ? `${guest.id}-chair-${chairIndex}` : 'empty-chair';

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        isDragging
    } = useDraggable({
        id: draggableId,
        disabled: !guest,
        data: { guest, type: 'seated-guest' }
    });

    const dragStyle: React.CSSProperties = {
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging ? 100 : undefined,
        ...style,
    };

    // Style logic based on side
    let borderColor = 'border-stone-300';
    let bgColor = 'bg-stone-50';
    let badgeColor = 'bg-stone-200 text-stone-600';
    let ringColor = '';

    if (guest) {
        if (guest.side === 'groom') {
            borderColor = 'border-blue-400';
            bgColor = 'bg-blue-50';
            badgeColor = 'bg-blue-100 text-blue-700';
            ringColor = 'ring-blue-100';
        } else if (guest.side === 'bride') {
            borderColor = 'border-pink-400';
            bgColor = 'bg-pink-50';
            badgeColor = 'bg-pink-100 text-pink-700';
            ringColor = 'ring-pink-100';
        } else if (guest.side === 'both') {
            borderColor = 'border-purple-400';
            bgColor = 'bg-purple-50';
            badgeColor = 'bg-purple-100 text-purple-700';
            ringColor = 'ring-purple-100';
        }
    }

    // Category mappings (Hebrew)
    const categoryMap: Record<string, string> = {
        'family': 'משפחה',
        'friend': 'חברים',
        'colleague': 'עבודה',
        'other': 'אחר'
    };

    // Determine what text to show on badge
    let badgeText = '';
    if (guest) {
        // Prefer group ID if it's descriptive, otherwise category
        if (guest.groupId && !guest.groupId.startsWith?.('individual')) {
            // Keep group ID short?
            badgeText = guest.groupId;
        } else {
            badgeText = categoryMap[guest.category] || guest.category;
        }
    }

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className={`
                flex flex-col items-center justify-center
                transition-all duration-200
                ${isDragging ? 'opacity-0' : ''}
                ${guest ? 'cursor-grab active:cursor-grabbing' : ''}
                ${className}
            `}
            style={dragStyle}
        >
            {/* The Badge Container */}
            <div className={`
                relative flex flex-col items-center
                ${guest ? 'group' : 'opacity-40'}
            `}>

                {/* Avatar / Circle */}
                <div className={`
                    w-12 h-12 rounded-full border-2 shadow-sm 
                    flex items-center justify-center relative z-10
                    ${borderColor} ${bgColor} ${guest ? 'shadow-md ring-2 ' + ringColor : 'border-dashed'}
                `}>
                    {guest ? (
                        <span className="text-lg">👤</span>
                    ) : (
                        <span className="text-xs text-stone-300"></span>
                    )}

                    {/* Delete Button (Hover) */}
                    {guest && !isDragging && unassignGuest && (
                        <button
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-30"
                            onPointerDown={(e) => {
                                e.stopPropagation();
                                unassignGuest(guest.id);
                            }}
                            title="הסר"
                        >
                            ✕
                        </button>
                    )}
                </div>

                {/* Name & Badge Label */}
                {guest && (
                    <div className="absolute top-10 flex flex-col items-center w-[120px] z-20 pointer-events-none">
                        {/* Name */}
                        <div className={`
                            text-xs font-bold text-stone-800 px-2 py-0.5 bg-white/95 rounded-md shadow-sm border border-stone-100 
                            truncate max-w-full mb-0.5 text-center
                            ${orientation === 'angled' ? 'origin-top-left -rotate-45 translate-y-3 translate-x-1' : ''}
                        `}>
                            {guest.name}
                        </div>

                        {/* Relationship / Category Badge */}
                        {badgeText && (
                            <div className={`
                                text-[10px] font-medium px-1.5 py-0 rounded-full leading-tight
                                ${badgeColor}
                            `}>
                                {badgeText}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
