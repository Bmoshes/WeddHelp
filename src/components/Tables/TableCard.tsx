import React, { useMemo, useState } from 'react';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Table, Guest } from '../../types';
import { useSeatingStore } from '../../store/seatingStore';

interface TableCardProps {
    table: Table;
    guests: Guest[];
    onGuestDrop?: (guestId: string, tableId: string) => void;
}

// ─── DRAGGABLE CHAIR COMPONENT ───────────────────────────────────────────────
const DraggableChair = ({ guest, className, style, unassignGuest, chairIndex, orientation = 'horizontal' }: { guest?: Guest; className?: string; style?: React.CSSProperties, unassignGuest: (id: string) => void, chairIndex?: number, orientation?: 'horizontal' | 'vertical' | 'angled' }) => {
    // Unique ID for each chair instance to avoid dnd-kit conflicts
    // If guest has amount=2, we have chair-0 and chair-1.
    const draggableId = guest ? `${guest.id}-chair-${chairIndex ?? 0}` : 'empty-chair';

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        isDragging
    } = useDraggable({
        id: draggableId,
        disabled: !guest, // Only draggable if there is a guest
        data: { guest, type: 'seated-guest' }
    });

    const dragStyle: React.CSSProperties = {
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging ? 100 : undefined,
        ...style,
    };

    // Gender/Side color logic
    let borderColor = 'border-stone-300';
    let bgColor = 'bg-white';
    let labelColor = 'text-stone-700 bg-white/95 border-stone-200';

    if (guest) {
        if (guest.side === 'groom') {
            borderColor = 'border-blue-400';
            bgColor = 'bg-blue-50';
            labelColor = 'text-blue-800 bg-blue-50/90 border-blue-200';
        }
        if (guest.side === 'bride') {
            borderColor = 'border-pink-400';
            bgColor = 'bg-pink-50';
            labelColor = 'text-pink-800 bg-pink-50/90 border-pink-200';
        }
        if (guest.side === 'both') {
            borderColor = 'border-purple-400';
            bgColor = 'bg-purple-50';
        }
    }

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className={`
                absolute flex flex-col items-center justify-center
                transition-colors duration-200
                ${className}
                ${isDragging ? 'opacity-0' : ''} /* Hide original when dragging */
                ${guest ? 'cursor-grab active:cursor-grabbing' : ''}
            `}
            style={dragStyle}
        >
            {/* The Chair Circle */}
            <div className={`
                w-10 h-10 rounded-full border-2 shadow-sm flex items-center justify-center relative flex-shrink-0
                ${borderColor} ${bgColor}
                ${guest ? 'shadow-md group' : 'opacity-40 border-dashed'}
            `}>
                {guest ? (
                    <span className="text-sm">👤</span>
                ) : (
                    <span className="text-[10px] text-stone-300"></span>
                )}

                {/* Delete overlay (only shows on hover if not dragging) */}
                {guest && !isDragging && (
                    <button
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-30"
                        onPointerDown={(e) => { e.stopPropagation(); unassignGuest(guest.id); }} // onPointerDown prevents drag start
                        title="הסר"
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* Guest Name Label */}
            {guest && (
                <div
                    className={`
                        absolute text-center text-[11px] font-bold px-1.5 py-0.5 rounded shadow-sm border truncate
                        z-20 pointer-events-none select-none
                        ${labelColor}
                        ${orientation === 'angled' ? 'origin-top-left -rotate-45 translate-y-3 translate-x-1 text-right w-[110px]' : ''}
                        ${orientation === 'horizontal' ? '-bottom-8 w-[130px]' : ''}
                    `}
                    style={{ whiteSpace: 'nowrap' }}
                >
                    {guest.name}
                </div>
            )}
        </div>
    );
};

// ─── MAIN TABLE CARD ────────────────────────────────────────────────────────
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
    // totalOccupied sums the 'amount' of each guest
    const totalOccupied = guests.reduce((sum, g) => sum + (g.amount || 1), 0);
    const isFull = totalOccupied >= table.capacity;

    // Stats also weighted by amount
    const groomSide = guests.reduce((sum, g) => g.side === 'groom' ? sum + (g.amount || 1) : sum, 0);
    const brideSide = guests.reduce((sum, g) => g.side === 'bride' ? sum + (g.amount || 1) : sum, 0);

    const hasConflicts = guests.some(g => g.conflictsWith.some(conflictId => guests.some(ig => ig.id === conflictId)));

    // ─── GROUP IDENTIFICATION LOGIC ──────────────────────────────────────────
    const centerLabels = useMemo(() => {
        if (guests.length === 0) return [];

        const groups = new Set<string>();
        const categories = new Set<string>();

        guests.forEach(g => {
            if (g.groupId && !g.groupId.startsWith('individual-')) {
                groups.add(g.groupId);
            } else if (g.category) {
                const categoryHebrew: Record<string, string> = { family: 'משפחה', friend: 'חברים', colleague: 'עבודה', other: 'אחר' };
                categories.add(categoryHebrew[g.category] || g.category);
            }
        });

        if (groups.size > 0) return Array.from(groups);
        return Array.from(categories);
    }, [guests]);


    // Render Chairs Logic with exploded amounts
    const renderChairs = () => {
        const chairs = [];
        const capacity = table.capacity;

        // Flatten guests into individual chairs based on amount
        // Example: "Vered(2)" becomes -> [Vered-Chair1, Vered-Chair2]
        const seatAssignments: { guest: Guest, chairIndex: number }[] = [];
        guests.forEach(guest => {
            const count = guest.amount || 1;
            for (let i = 0; i < count; i++) {
                seatAssignments.push({ guest, chairIndex: i });
            }
        });

        if (tableType === 'knight') {
            // Knight Table: Two rows
            const halfCap = Math.ceil(capacity / 2);

            for (let i = 0; i < capacity; i++) {
                const assignment = seatAssignments[i];
                const row = i < halfCap ? 0 : 1;

                if (assignment) {
                    chairs.push({
                        idx: i,
                        guest: assignment.guest,
                        row,
                        chairIndex: assignment.chairIndex
                    });
                } else {
                    chairs.push({ idx: i, guest: undefined, row });
                }
            }
        } else {
            // Regular Table (Circle)
            // Separate logic for large tables to avoid overlapping
            for (let i = 0; i < capacity; i++) {
                const assignment = seatAssignments[i];
                // Start from -90deg (top)
                const angle = (i / capacity) * 2 * Math.PI - (Math.PI / 2);

                if (assignment) {
                    chairs.push({
                        idx: i,
                        guest: assignment.guest,
                        angle,
                        chairIndex: assignment.chairIndex
                    });
                } else {
                    chairs.push({ idx: i, guest: undefined, angle });
                }
            }
        }
        return chairs;
    };

    const chairs = renderChairs();

    // Responsive radius
    const getRadius = () => {
        if (table.capacity <= 8) return 130;
        if (table.capacity <= 12) return 150;
        return 170;
    };

    return (
        <div
            ref={setNodeRef}
            className={`
                relative flex flex-col
                bg-white rounded-xl border-2 transition-all duration-300 overflow-visible
                ${isOver ? 'border-amber-400 ring-4 ring-amber-100 scale-[1.02]' : 'border-stone-100 hover:border-amber-200 shadow-sm hover:shadow-lg'}
                ${isFull ? 'bg-stone-50/50' : ''}
                ${hasConflicts ? 'border-red-300 shadow-red-100 ring-2 ring-red-50' : ''}
                p-6 min-h-[500px] /* Massive height for spacing */
            `}
        >
            {/* --- Header Controls --- */}
            <div className="flex justify-between items-start mb-8 z-30 relative bg-white/50 backdrop-blur-[2px] rounded-lg p-1">
                {/* Number & Capacity */}
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-stone-800 text-white flex items-center justify-center font-bold text-lg shadow-md border-2 border-stone-600">
                        {table.number}
                    </div>
                    {isEditingCapacity ? (
                        <input
                            autoFocus
                            type="number"
                            className="w-14 bg-white border border-amber-300 rounded text-center font-bold py-1"
                            value={capacityInput}
                            onChange={(e) => setCapacityInput(e.target.value)}
                            onBlur={handleCapacityUpdate}
                            onKeyDown={(e) => e.key === 'Enter' && handleCapacityUpdate()}
                        />
                    ) : (
                        <div
                            onClick={() => setIsEditingCapacity(true)}
                            className="flex flex-col cursor-pointer group"
                        >
                            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">מקומות</span>
                            <span className="text-sm font-bold text-stone-700 group-hover:text-amber-600">
                                {totalOccupied} / {table.capacity}
                            </span>
                        </div>
                    )}
                </div>

                {/* Controls */}
                <div className="flex flex-col items-end gap-2">
                    <select
                        value={tableType}
                        onChange={(e) => handleTypeChange(e.target.value as 'regular' | 'knight')}
                        className="text-xs bg-stone-50 border border-stone-200 rounded px-2 py-1 text-stone-600 focus:outline-none focus:border-amber-400 cursor-pointer hover:bg-stone-100"
                    >
                        <option value="regular">🪑 רגיל (עגול)</option>
                        <option value="knight">🛡️ אביר (מלבן)</option>
                    </select>

                    <button
                        onClick={() => {
                            if (guests.length > 0 && !confirm(`למחוק את שולחן ${table.number}? האורחים יחזרו לרשימת ההמתנה.`)) return;
                            removeTable(table.id);
                        }}
                        className="text-stone-300 hover:text-red-500 transition-colors p-1"
                        title="מחק שולחן"
                    >
                        🗑️
                    </button>
                </div>
            </div>


            {/* --- VISUAL FLOOR PLAN AREA --- */}
            <div className="flex-1 relative flex items-center justify-center mt-4 mb-8">

                {/* 1. REGULAR TABLE VISUAL (CIRCLE) */}
                {tableType === 'regular' && (
                    <div className="relative flex items-center justify-center">
                        {/* Central Table Shape */}
                        <div
                            className="bg-[#f0ece1] rounded-full shadow-[inset_0_2px_10px_rgba(0,0,0,0.05)] border border-[#dcd5c0] flex items-center justify-center z-10 flex-col text-center p-4 overflow-hidden"
                            style={{ width: `${getRadius() * 1.3}px`, height: `${getRadius() * 1.3}px` }}
                        >
                            <div className="text-stone-300 opacity-30 text-4xl select-none mb-2">🍽️</div>

                            {/* CENTER LABELS (All Groups) */}
                            <div className="flex flex-col gap-1 max-h-[80px] overflow-y-auto w-full px-1 scrollbar-hide">
                                {centerLabels.length > 0 ? (
                                    centerLabels.map((label, idx) => (
                                        <div key={idx} className="text-xs font-bold text-stone-600 bg-white/60 px-2 py-0.5 rounded-full shadow-sm truncate">
                                            {label}
                                        </div>
                                    ))
                                ) : (
                                    <span className="text-[10px] text-stone-400 italic">ריק</span>
                                )}
                            </div>
                        </div>

                        {/* Chairs around */}
                        {chairs.map((chair: any) => {
                            const radius = getRadius() + 25; // Massive breathing room
                            const x = Math.cos(chair.angle) * radius;
                            const y = Math.sin(chair.angle) * radius;

                            return (
                                <DraggableChair
                                    key={chair.idx}
                                    guest={chair.guest}
                                    chairIndex={chair.chairIndex}
                                    unassignGuest={unassignGuest}
                                    style={{
                                        // Center point of container is 0,0 for these calc
                                        // We need absolute positioning relative to the container center
                                        transform: `translate(${x}px, ${y}px)`,
                                        position: 'absolute',
                                        left: 0, right: 0, marginLeft: 'auto', marginRight: 'auto', // Centering tricks
                                        top: '50%', marginTop: '-20px', // -20px is half height
                                        width: '40px'
                                    }}
                                />
                            );
                        })}
                    </div>
                )}


                {/* 2. KNIGHT TABLE VISUAL (RECTANGLE) */}
                {/* 
                     We add a scrollable container for the knight table to ensure it fits.
                     We also force a min-width based on capacity.
                */}
                {tableType === 'knight' && (
                    <div className="w-full overflow-x-auto pb-4 pt-2 px-2 scrollbar-thin scrollbar-thumb-stone-200">
                        <div
                            className="relative flex flex-col items-center justify-center py-16 mx-auto"
                            style={{
                                // Dynamic min-width: 55px per chair in a row + padding
                                minWidth: `${Math.max(300, (table.capacity / 2) * 55)}px`
                            }}
                        >
                            {/* The Table Surface */}
                            <div
                                className={`
                                    relative bg-[#f0ece1] rounded-lg shadow-[inset_0_2px_10px_rgba(0,0,0,0.05)] border border-[#dcd5c0] flex items-center justify-center
                                    w-full transition-all duration-300
                                `}
                                style={{ height: '140px' }}
                            >
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-4">
                                    <div className="text-stone-300 opacity-20 text-4xl tracking-[1em] select-none rotate-90 md:rotate-0 mb-2">🍽️🍽️</div>
                                    <div className="flex flex-wrap justify-center gap-1 max-w-[90%] z-10 pointer-events-auto">
                                        {centerLabels.length > 0 ? (
                                            centerLabels.map((label, idx) => (
                                                <div key={idx} className="text-[10px] font-bold text-stone-600 bg-white/60 px-2 py-0.5 rounded-full shadow-sm">
                                                    {label}
                                                </div>
                                            ))
                                        ) : (
                                            <span className="text-[10px] text-stone-400 italic">ריק</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Chairs Container - using flex justify-between for perfect spacing */}
                            {/* Top Row */}
                            <div className="absolute top-2 w-full flex justify-around px-2">
                                {chairs.filter((c: any) => c.row === 0).map((chair: any) => (
                                    <div key={chair.idx} className="relative w-10 h-10 flex justify-center">
                                        <DraggableChair
                                            guest={chair.guest}
                                            chairIndex={chair.chairIndex}
                                            unassignGuest={unassignGuest}
                                            orientation="angled" // Rotate text
                                        />
                                    </div>
                                ))}
                            </div>

                            {/* Bottom Row */}
                            <div className="absolute bottom-2 w-full flex justify-around px-2">
                                {chairs.filter((c: any) => c.row === 1).map((chair: any) => (
                                    <div key={chair.idx} className="relative w-10 h-10 flex justify-center">
                                        {/* Bottom row needs different rotation or spacing? Keeping angled for consistency */}
                                        <DraggableChair
                                            guest={chair.guest}
                                            chairIndex={chair.chairIndex}
                                            unassignGuest={unassignGuest}
                                            orientation="angled"
                                            style={{ zIndex: 50 }} // Ensure labels overlap nicely
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Stats - Only for debugging/extra info */}
            {(groomSide > 0 || brideSide > 0) && (
                <div className="flex justify-between items-center text-[10px] text-stone-400 px-2 mt-auto border-t pt-2 w-full">
                    <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-blue-300"></span>
                        {groomSide}
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-pink-300"></span>
                        {brideSide}
                    </div>
                </div>
            )}
        </div>
    );
};
