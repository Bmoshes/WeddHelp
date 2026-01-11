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
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(true); // Default open on desktop

    // Auto-collapse sidebar on mobile on initial load
    React.useEffect(() => {
        if (window.innerWidth < 768) {
            setIsSidebarOpen(false);
        }
    }, []);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        let guestId = active.id as string;

        // Handle dragging from Table (DraggableChair)
        // IDs are formatted as `${guest.id}-chair-${chairIndex}`
        if (guestId.includes('-chair-')) {
            guestId = guestId.split('-chair-')[0];
        }

        const guest = guests.find(g => g.id === guestId);
        if (guest) setActiveGuest(guest);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveGuest(null);

        if (!over) return;

        let guestId = active.id as string;
        // Handle dragging from Table
        if (guestId.includes('-chair-')) {
            guestId = guestId.split('-chair-')[0];
        }

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
            <div className="flex flex-col md:flex-row h-screen bg-stone-50 overflow-hidden">
                {/* Mobile Header / Toggle */}
                <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-stone-200 z-30">
                    <h1 className="text-xl font-bold text-stone-800">
                        <span className="text-amber-500">✨</span> Wedding Planner
                    </h1>
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-2 rounded-lg bg-stone-100 text-stone-600"
                    >
                        {isSidebarOpen ? 'סגור אורחים' : '📋 רשימת אורחים'}
                    </button>
                </div>

                {/* Side Panel - Guest List */}
                <div className={`
                    fixed inset-0 z-20 bg-black/20 backdrop-blur-sm md:hidden transition-opacity duration-300
                    ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
                `} onClick={() => setIsSidebarOpen(false)} />

                <div className={`
                    fixed md:relative z-20 h-full bg-white shadow-xl md:shadow-none transition-all duration-300 ease-in-out
                    border-l border-stone-200
                    ${isSidebarOpen
                        ? 'translate-x-0 w-[85vw] md:w-[380px] opacity-100'
                        : 'translate-x-[100%] md:translate-x-0 w-[85vw] md:w-0 md:opacity-0 md:overflow-hidden md:border-none'
                    }
                    right-0 top-0
                `}>
                    <GuestList />
                    {/* Mobile close button inside drawer */}
                    <button
                        onClick={() => setIsSidebarOpen(false)}
                        className="md:hidden absolute top-4 left-4 p-2 text-stone-400 hover:text-stone-600"
                    >
                        ✕
                    </button>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col h-full overflow-hidden relative w-full">
                    {/* Header / Status Bar Area */}
                    <div className="p-4 md:p-6 pb-2 shrink-0 z-10 bg-stone-50">
                        <header className="hidden md:flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                    className="p-2 rounded-xl bg-white border border-stone-200 text-stone-600 hover:bg-stone-50 hover:text-amber-500 hover:border-amber-200 transition-all shadow-sm"
                                    title={isSidebarOpen ? 'סגור סרגל צד' : 'פתח סרגל צד'}
                                >
                                    {isSidebarOpen ? '◀' : '▶'}
                                </button>
                                <div>
                                    <h1 className="text-3xl font-bold text-stone-800 tracking-tight flex items-center gap-2">
                                        <span className="text-amber-500">✨</span> Wedding Planner
                                    </h1>
                                    <p className="text-stone-500 text-sm mt-0.5">תכנון הושבה חכם ופשוט</p>
                                </div>
                            </div>
                        </header>
                        <StatusBar />
                    </div>

                    {/* Scrollable Grid Area */}
                    <div className="flex-1 overflow-hidden px-4 md:px-6 pb-6">
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
