import React from 'react';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { StatusBar } from './StatusBar';
import { GuestList } from '../GuestList/GuestList';
import { TablesGrid } from '../Tables/TablesGrid';
import { GuestCard } from '../GuestList/GuestCard';
import { useSeatingStore } from '../../store/seatingStore';
import { Guest } from '../../types';

export const Dashboard: React.FC = () => {
    const { assignGuestToTable, unassignGuest, guests } = useSeatingStore();
    const [activeGuest, setActiveGuest] = React.useState<Guest | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const guestId = active.id as string;
        const guest = guests.find(g => g.id === guestId);
        if (guest) setActiveGuest(guest);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveGuest(null);

        if (!over) return;

        const guestId = active.id as string;
        const targetId = over.id as string;
        const tableData = over.data?.current?.table;

        // If dropped on "guest-list" (unassign)
        if (targetId === 'guest-list') {
            unassignGuest(guestId);
            return;
        }

        // If dropped on a table
        if (tableData) {
            assignGuestToTable(guestId, tableData.id);
        }
    };

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex h-screen bg-stone-50 overflow-hidden">
                {/* Side Panel - Guest List */}
                <div className="w-[380px] shrink-0 h-full relative z-20">
                    <GuestList />
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                    {/* Header / Status Bar Area */}
                    <div className="p-6 pb-2 shrink-0 z-10">
                        <header className="mb-6 flex items-baseline justify-between">
                            <div>
                                <h1 className="text-3xl font-bold text-stone-800 tracking-tight">
                                    <span className="text-amber-500">✨</span> Wedding Planner
                                </h1>
                                <p className="text-stone-500 mt-1">תכנון הושבה חכם ופשוט</p>
                            </div>
                        </header>
                        <StatusBar />
                    </div>

                    {/* Scrollable Grid Area */}
                    <div className="flex-1 overflow-hidden px-6 pb-6">
                        <TablesGrid />
                    </div>
                </div>

                {/* Drag Overlay */}
                <DragOverlay>
                    {activeGuest ? (
                        <div className="transform rotate-3 scale-105 opacity-90 w-[300px] pointer-events-none">
                            <GuestCard guest={activeGuest} onDelete={() => { }} />
                        </div>
                    ) : null}
                </DragOverlay>
            </div>
        </DndContext>
    );
};
