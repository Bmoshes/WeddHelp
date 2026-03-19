import React, { useMemo } from 'react';
import { Table, Guest } from '../../../types';
import { GuestSeat } from './GuestSeat';

interface RoundTableProps {
    table: Table;
    guests: Guest[];
    unassignGuest: (id: string) => void;
}

const sideStyle: Record<string, { badge: string }> = {
    groom: { badge: 'bg-sky-100 text-sky-700'       },
    bride: { badge: 'bg-rose-100 text-rose-700'     },
    both:  { badge: 'bg-violet-100 text-violet-700' },
};

const categoryMap: Record<string, string> = {
    family: 'משפחה', friend: 'חברים', colleague: 'עבודה', other: 'אחר',
};

/**
 * Compute the minimum orbit radius for a round table such that:
 *  (a) seat avatars (60px chord) do not touch each other
 *  (b) labels (88px chord) rendered at radius+labelGap do not touch each other
 */
function computeRadii(capacity: number) {
    const n = Math.max(capacity, 1);
    const sinSlot = Math.sin(Math.PI / n);
    const LABEL_GAP = 52;   // px from seat centre to label centre
    const SEAT_CHORD = 60;  // px clearance between adjacent seat avatars
    const LABEL_CHORD = 88; // px clearance between adjacent labels

    const minRadiusForSeats  = Math.ceil(SEAT_CHORD  / (2 * sinSlot));
    const minLabelRadius     = Math.ceil(LABEL_CHORD / (2 * sinSlot));
    const minRadiusForLabels = minLabelRadius - LABEL_GAP;

    const radius      = Math.max(90, minRadiusForSeats, minRadiusForLabels);
    const labelRadius = radius + LABEL_GAP;
    const size        = (labelRadius + 50) * 2;   // square container side length
    return { radius, labelRadius, size };
}

export const RoundTable: React.FC<RoundTableProps> = ({ table, guests, unassignGuest }) => {
    const capacity = table.capacity;
    const { radius, labelRadius, size } = useMemo(() => computeRadii(capacity), [capacity]);

    const seats = useMemo(() => {
        const result: Array<{
            idx: number;
            guest?: Guest;
            chairIndex: number;
            angle: number;
        }> = [];

        const assignedQueue: { guest: Guest; chairIndex: number }[] = [];
        guests.forEach(g => {
            const count = g.amount || 1;
            for (let i = 0; i < count; i++) assignedQueue.push({ guest: g, chairIndex: i });
        });

        for (let i = 0; i < capacity; i++) {
            const assignment = assignedQueue[i];
            // Start at the top (−90°) and go clockwise
            const angle = (i / capacity) * 2 * Math.PI - Math.PI / 2;
            result.push({
                idx: i,
                guest: assignment?.guest,
                chairIndex: assignment?.chairIndex ?? 0,
                angle,
            });
        }
        return result;
    }, [capacity, guests]);

    const totalOccupied = guests.reduce((sum, g) => sum + (g.amount || 1), 0);
    const fillPct = Math.round((totalOccupied / capacity) * 100);

    return (
        /* Square container — left:50%/top:50% are 50% of THIS element's own dims  */
        <div
            className="relative flex items-center justify-center mx-auto flex-shrink-0"
            style={{ width: `${size}px`, height: `${size}px` }}
        >
            {/* ── Center table surface ──────────────────────────────────────── */}
            <div className="absolute w-40 h-40 rounded-full z-10 flex flex-col items-center justify-center
                            bg-gradient-to-b from-white to-stone-50
                            shadow-[0_4px_24px_rgba(28,20,10,0.12),0_1px_4px_rgba(28,20,10,0.08)]
                            border border-[#e4ddd4]">
                <div className="w-14 h-14 rounded-full flex items-center justify-center
                                bg-stone-900 text-white text-2xl font-bold
                                border-4 border-white shadow-warm-sm mb-1">
                    {table.number}
                </div>
                <div className="text-xs font-semibold text-stone-500 tracking-wide">
                    שולחן {table.number}
                </div>
                <div className={`text-[11px] font-bold mt-0.5 ${totalOccupied >= capacity ? 'text-red-500' : 'text-stone-400'}`}>
                    {totalOccupied}/{capacity}
                </div>
                <div className="w-16 h-1 bg-stone-100 rounded-full overflow-hidden mt-1.5">
                    <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${fillPct}%`, background: fillPct >= 100 ? '#ef4444' : '#f59e0b' }}
                    />
                </div>
            </div>

            {/* ── Seat + label ring ─────────────────────────────────────────── */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="relative w-full h-full">
                    {seats.map((seat) => {
                        // deg=0 is top (12-o'clock), clockwise
                        const deg = (seat.angle + Math.PI / 2) * (180 / Math.PI);

                        return (
                            <React.Fragment key={`seat-${seat.idx}`}>
                                {/* Avatar */}
                                <div
                                    className="absolute top-1/2 left-1/2 pointer-events-auto
                                               flex items-center justify-center w-0 h-0"
                                    style={{
                                        transform: `rotate(${deg}deg) translate(${radius}px) rotate(-${deg}deg)`,
                                    }}
                                >
                                    <GuestSeat
                                        guest={seat.guest}
                                        chairIndex={seat.chairIndex}
                                        unassignGuest={unassignGuest}
                                        className="w-12 h-12"
                                        showLabel={false}
                                    />
                                </div>

                                {/* Radial label — always visible, at labelRadius outward */}
                                {seat.guest && (() => {
                                    const g = seat.guest;
                                    const ss = sideStyle[g.side] ?? sideStyle.groom;
                                    const badgeText = g.groupId && !g.groupId.startsWith('individual')
                                        ? g.groupId
                                        : categoryMap[g.category] || g.category;

                                    return (
                                        <div
                                            className="absolute top-1/2 left-1/2 pointer-events-none"
                                            style={{
                                                transform: `rotate(${deg}deg) translate(${labelRadius}px) rotate(-${deg}deg)`,
                                            }}
                                        >
                                            {/* Anchor is 0×0; label is offset to be centred on it */}
                                            <div
                                                className="flex flex-col items-center"
                                                style={{
                                                    position: 'absolute',
                                                    width: '80px',
                                                    left: '-40px',
                                                    top: '-14px',
                                                }}
                                            >
                                                <div className="text-[11px] font-semibold text-stone-800 px-1.5 py-0.5
                                                                bg-white/95 rounded-lg shadow-warm-xs border border-[#e4ddd4]
                                                                truncate w-full mb-0.5 text-center leading-tight">
                                                    {g.name}
                                                </div>
                                                {badgeText && (
                                                    <div className={`text-[9px] font-semibold px-1.5 py-0 rounded-full leading-tight ${ss.badge}`}>
                                                        {badgeText}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
