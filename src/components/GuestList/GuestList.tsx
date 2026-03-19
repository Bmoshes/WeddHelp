import React, { useState, useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useSeatingStore } from '../../store/seatingStore';
import { GuestCard } from './GuestCard';
import { Button } from '../shared/Button';
import { AddGuestModal } from './AddGuestModal';

const categories = [
    { id: 'family',    label: 'משפחה', icon: '👨‍👩‍👧‍👦', accent: 'text-amber-600'   },
    { id: 'friend',    label: 'חברים', icon: '🤝',       accent: 'text-emerald-600' },
    { id: 'colleague', label: 'עבודה', icon: '💼',       accent: 'text-blue-600'    },
    { id: 'other',     label: 'אחר',   icon: '✨',       accent: 'text-stone-500'   },
];

export const GuestList: React.FC = () => {
    const { guests, removeGuest } = useSeatingStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const unseatedGuests = useMemo(() => {
        return guests.filter((g) => !g.tableId && (
            g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            g.category.includes(searchTerm) ||
            (g.groupId && g.groupId.includes(searchTerm))
        ));
    }, [guests, searchTerm]);

    const { setNodeRef } = useDroppable({
        id: 'guest-list',
        data: { type: 'guest-list' },
    });

    return (
        <div className="bg-white h-full flex flex-col border-l border-[#e4ddd4] w-full">

            {/* ── Header ──────────────────────────────────────────────── */}
            <div className="px-5 pt-5 pb-4 border-b border-[#ede8df] sticky top-0 bg-white z-10">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-lg font-bold text-stone-900 leading-tight">רשימת המתנה</h2>
                        <p className="text-xs text-stone-400 mt-0.5">גרור אורח לשולחן להושיב</p>
                    </div>
                    <span className="min-w-[1.75rem] h-7 px-2 flex items-center justify-center
                                     bg-stone-900 text-white text-xs font-bold rounded-full">
                        {unseatedGuests.length}
                    </span>
                </div>

                {/* Search + add */}
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            placeholder="חיפוש אורח..."
                            className="w-full pr-9 pl-3 py-2 bg-stone-50 border border-[#e4ddd4] rounded-xl
                                       text-sm text-stone-800 placeholder-stone-400
                                       focus:outline-none focus:ring-2 focus:ring-amber-300/60 focus:border-amber-400
                                       transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm pointer-events-none">
                            🔍
                        </span>
                    </div>
                    <Button
                        onClick={() => setIsAddModalOpen(true)}
                        className="w-9 h-9 !p-0 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xl leading-none"
                        title="הוסף אורח"
                    >
                        +
                    </Button>
                </div>
            </div>

            {/* ── Guest list ───────────────────────────────────────────── */}
            <div
                ref={setNodeRef}
                className="flex-1 overflow-y-auto p-4 space-y-5 bg-canvas-100"
            >
                {unseatedGuests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="text-4xl mb-3 opacity-25">📭</div>
                        <p className="text-sm font-medium text-stone-400">
                            {searchTerm ? 'לא נמצאו תוצאות' : 'כל האורחים שובצו!'}
                        </p>
                    </div>
                ) : (
                    categories.map(cat => {
                        const catGuests = unseatedGuests.filter(g => g.category === cat.id);
                        if (catGuests.length === 0) return null;

                        return (
                            <div key={cat.id}>
                                {/* Category header */}
                                <div className="flex items-center gap-2 mb-2.5 px-0.5">
                                    <span className="text-sm leading-none">{cat.icon}</span>
                                    <span className={`text-[10px] font-bold uppercase tracking-widest ${cat.accent}`}>
                                        {cat.label}
                                    </span>
                                    <div className="flex-1 h-px bg-[#ede8df]" />
                                    <span className="text-[10px] font-semibold text-stone-400 bg-white
                                                     border border-[#ede8df] px-1.5 py-0.5 rounded-full">
                                        {catGuests.length}
                                    </span>
                                </div>

                                <div className="space-y-1.5">
                                    {catGuests.map((guest) => (
                                        <GuestCard
                                            key={guest.id}
                                            guest={guest}
                                            onDelete={removeGuest}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <AddGuestModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
        </div>
    );
};
