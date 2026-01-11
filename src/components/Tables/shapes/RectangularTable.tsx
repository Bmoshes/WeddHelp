import React, { useMemo } from 'react';
import { Table, Guest } from '../../../types';
import { GuestSeat } from './GuestSeat';

interface RectangularTableProps {
    table: Table;
    guests: Guest[];
    unassignGuest: (id: string) => void;
}

export const RectangularTable: React.FC<RectangularTableProps> = ({ table, guests, unassignGuest }) => {

    // Process guests into seats (handling amounts)
    const seats = useMemo(() => {
        const result: Array<{ idx: number, guest?: Guest, chairIndex: number, row: 0 | 1 }> = [];
        const capacity = table.capacity;
        const halfCap = Math.ceil(capacity / 2);

        // Flatten guests by amount
        const assignedQueue: { guest: Guest, chairIndex: number }[] = [];
        guests.forEach(g => {
            const count = g.amount || 1;
            for (let i = 0; i < count; i++) assignedQueue.push({ guest: g, chairIndex: i });
        });

        for (let i = 0; i < capacity; i++) {
            const assignment = assignedQueue[i];
            const row = i < halfCap ? 0 : 1;

            result.push({
                idx: i,
                guest: assignment?.guest,
                chairIndex: assignment?.chairIndex ?? 0,
                row
            });
        }
        return result;
    }, [table.capacity, guests]);

    const topRowParams = seats.filter(s => s.row === 0);
    const bottomRowParams = seats.filter(s => s.row === 1);

    // Calculate min width based on capacity to ensure scrolling
    // ~75px per seat width for better spacing
    const minWidth = Math.max(300, (table.capacity / 2) * 75 + 60);

    return (
        <div className="w-full overflow-x-auto pb-6 pt-2 px-2 scrollbar-thin scrollbar-thumb-stone-200">
            <div
                className="flex flex-col items-center gap-2 mx-auto"
                style={{ minWidth: `${minWidth}px` }}
            >
                {/* TOP ROW */}
                <div className="flex justify-around w-full px-4 mb-2">
                    {topRowParams.map(seat => (
                        <GuestSeat
                            key={`seat-${seat.idx}`}
                            guest={seat.guest}
                            chairIndex={seat.chairIndex}
                            unassignGuest={unassignGuest}
                            className="w-12 mx-1" // Ensure spacing
                        />
                    ))}
                </div>

                {/* TABLE SURFACE */}
                <div className="
                    w-full h-32 
                    bg-amber-100/50 border-2 border-amber-800/20 rounded-lg
                    flex flex-col items-center justify-center
                    relative shadow-inner
                ">
                    {/* Centered Info */}
                    <div className="flex flex-col items-center">
                        <div className="w-12 h-12 flex items-center justify-center bg-stone-800 text-white rounded-full text-xl font-bold shadow-lg border-2 border-stone-600 mb-1">
                            {table.number}
                        </div>
                        {/* Assuming there is no separate table name field in types yet, we use generic text or ID? 
                           Types check showed: number, capacity, type, assignedGuests. No 'name'. 
                           We will show "שולחן X" */}
                        <span className="font-bold text-stone-700 text-lg">
                            שולחן {table.number}
                        </span>

                        <span className="text-xs font-semibold text-stone-500 bg-white/60 px-2 py-0.5 rounded-full mt-1">
                            {guests.reduce((sum, g) => sum + (g.amount || 1), 0)}/{table.capacity} מקומות
                        </span>
                    </div>
                </div>

                {/* BOTTOM ROW */}
                <div className="flex justify-around w-full px-4 mt-8"> {/* Extra margin top for labels */}
                    {bottomRowParams.map(seat => (
                        <GuestSeat
                            key={`seat-${seat.idx}`}
                            guest={seat.guest}
                            chairIndex={seat.chairIndex}
                            unassignGuest={unassignGuest}
                            className="w-12 mx-1"
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};
