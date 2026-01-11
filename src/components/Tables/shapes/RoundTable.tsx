import React, { useMemo } from 'react';
import { Table, Guest } from '../../../types';
import { GuestSeat } from './GuestSeat';

interface RoundTableProps {
    table: Table;
    guests: Guest[];
    unassignGuest: (id: string) => void;
}

export const RoundTable: React.FC<RoundTableProps> = ({ table, guests, unassignGuest }) => {

    // Process guests into seats (handling amounts)
    const seats = useMemo(() => {
        const result: Array<{ idx: number, guest?: Guest, chairIndex: number, angle: number }> = [];
        const capacity = table.capacity;

        // Flatten guests by amount
        const assignedQueue: { guest: Guest, chairIndex: number }[] = [];
        guests.forEach(g => {
            const count = g.amount || 1;
            for (let i = 0; i < count; i++) assignedQueue.push({ guest: g, chairIndex: i });
        });

        for (let i = 0; i < capacity; i++) {
            const assignment = assignedQueue[i];
            const angle = (i / capacity) * 2 * Math.PI - (Math.PI / 2); // Start top (-90deg)

            result.push({
                idx: i,
                guest: assignment?.guest,
                chairIndex: assignment?.chairIndex ?? 0,
                angle
            });
        }
        return result;
    }, [table.capacity, guests]);

    // Responsive radius for guests
    const radius = 170; // Increased from 140 to 170 for better spacing

    return (
        <div className="relative flex items-center justify-center w-full h-[500px]">

            {/* CENTER PIECE (Table Surface) */}
            <div className="
                absolute 
                w-40 h-40 
                bg-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-full border border-gray-200
                flex flex-col items-center justify-center
                z-10
            ">
                <div className="w-14 h-14 bg-stone-800 text-white rounded-full flex items-center justify-center text-2xl font-bold border-4 border-stone-100 shadow-md mb-2">
                    {table.number}
                </div>
                <div className="text-xl font-bold text-stone-700">
                    שולחן {table.number}
                </div>
                <div className="text-sm text-stone-400 mt-1">
                    {guests.reduce((sum, g) => sum + (g.amount || 1), 0)}/{table.capacity} מקומות
                </div>
            </div>

            {/* SATELLITES (Guests) */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="relative w-full h-full flex items-center justify-center">
                    {seats.map((seat) => {
                        // We use pure CSS transform for positioning as requested
                        // transform: rotate(...) translate(140px) rotate(-...)
                        // To rotate correctly from top center:
                        // 1. Rotate container to angle. 
                        // 2. Translate out. 
                        // 3. Rotate content back so text is upright.

                        // Convert radians to degrees
                        const deg = (seat.angle + Math.PI / 2) * (180 / Math.PI);

                        return (
                            <div
                                key={`seat-${seat.idx}`}
                                className="absolute top-1/2 left-1/2 pointer-events-auto flex items-center justify-center w-0 h-0"
                                style={{
                                    transform: `rotate(${deg}deg) translate(${radius}px) rotate(-${deg}deg)`
                                }}
                            >
                                <GuestSeat
                                    guest={seat.guest}
                                    chairIndex={seat.chairIndex}
                                    unassignGuest={unassignGuest}
                                    className="w-12 h-12" // Size for interaction target
                                />
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
