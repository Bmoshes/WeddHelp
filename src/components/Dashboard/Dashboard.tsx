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
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);

    React.useEffect(() => {
        if (window.innerWidth < 768) setIsSidebarOpen(false);
    }, []);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
    );

    const handleDragStart = (event: DragStartEvent) => {
        let guestId = event.active.id as string;
        if (guestId.includes('-chair-')) guestId = guestId.split('-chair-')[0];
        const guest = guests.find(g => g.id === guestId);
        if (guest) setActiveGuest(guest);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveGuest(null);
        if (!over) return;

        let guestId = active.id as string;
        if (guestId.includes('-chair-')) guestId = guestId.split('-chair-')[0];

        const targetId = over.id as string;
        const tableData = over.data?.current?.table;

        if (targetId === 'guest-list') { unassignGuest(guestId); return; }
        if (tableData) assignGuestToTable(guestId, tableData.id);
    };

    return (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex flex-col md:flex-row h-screen bg-canvas-100 overflow-hidden">

                {/* ── Mobile top bar ─────────────────────────────────── */}
                <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-[#e4ddd4] shadow-warm-xs z-30">
                    <div className="flex items-center gap-2">
                        <span className="text-amber-500">💍</span>
                        <h1 className="text-base font-bold text-stone-900 tracking-tight">Wedding Planner</h1>
                    </div>
                    <button
                        aria-label={isSidebarOpen ? 'סגור תפריט צד' : 'פתח תפריט אורחים'}
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="text-xs font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-lg transition-colors"
                    >
                        {isSidebarOpen ? 'סגור' : '📋 אורחים'}
                    </button>
                </div>

                {/* ── Mobile sidebar backdrop ─────────────────────────── */}
                <div
                    className={`fixed inset-0 z-20 bg-black/30 backdrop-blur-[2px] md:hidden transition-opacity duration-300
                        ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                    onClick={() => setIsSidebarOpen(false)}
                />

                {/* ── Guest list sidebar ──────────────────────────────── */}
                <div className={`
                    fixed md:relative z-20 h-full bg-white shadow-warm-xl md:shadow-none
                    border-l border-[#e4ddd4] transition-all duration-300 ease-in-out
                    right-0 top-0
                    ${isSidebarOpen
                        ? 'translate-x-0 w-[85vw] md:w-[380px]'
                        : 'translate-x-[100%] md:translate-x-0 w-[85vw] md:w-0 md:overflow-hidden md:border-none'}
                `}>
                    <GuestList />
                    <button
                        onClick={() => setIsSidebarOpen(false)}
                        className="md:hidden absolute top-4 left-4 text-stone-400 hover:text-stone-700 transition-colors p-1"
                    >
                        ✕
                    </button>
                </div>

                {/* ── Main content area ────────────────────────────────── */}
                <div className="flex-1 flex flex-col h-full overflow-hidden">

                    {/* Desktop header */}
                    <div className="hidden md:flex items-center justify-between px-6 pt-5 pb-0 shrink-0">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                title={isSidebarOpen ? 'סגור סרגל צד' : 'פתח סרגל צד'}
                                aria-label={isSidebarOpen ? 'סגור סרגל צד' : 'פתח סרגל צד'}
                                className="w-9 h-9 flex items-center justify-center rounded-xl
                                           bg-white border border-[#e4ddd4] text-stone-500
                                           hover:border-stone-300 hover:text-stone-900
                                           transition-all shadow-warm-xs"
                            >
                                {isSidebarOpen ? '◀' : '▶'}
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
                                    <span className="text-amber-500">💍</span>
                                    Wedding Planner
                                </h1>
                                <p className="text-stone-500 text-xs tracking-wide">תכנון הושבה חכם ופשוט</p>
                            </div>
                        </div>
                    </div>

                    {/* Status bar */}
                    <div className="px-4 md:px-6 pt-4 pb-0 shrink-0">
                        <StatusBar />
                    </div>

                    {/* Tables grid */}
                    <div className="flex-1 overflow-hidden px-4 md:px-6 pb-2 pt-4">
                        <TablesGrid />
                    </div>

                    {/* Privacy Disclaimer Footer */}
                    <div className="px-4 pb-2 text-center shrink-0">
                        <p className="text-[10px] text-stone-400 bg-white/50 backdrop-blur-sm mx-auto inline-block px-3 py-1 rounded-full border border-stone-200">
                            🔒 <b>פרטיותכם מובטחת:</b> נתוני הרשימות נשמרים אישית בדפדפן במחשב זה בלבד.
                        </p>
                    </div>
                </div>

                {/* Drag overlay */}
                <DragOverlay>
                    {activeGuest ? (
                        <div className="rotate-3 scale-105 opacity-90 w-[300px] pointer-events-none">
                            <GuestCard guest={activeGuest} onDelete={() => {}} />
                        </div>
                    ) : null}
                </DragOverlay>
            </div>
        </DndContext>
    );
};
