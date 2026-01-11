import React, { useState, useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useSeatingStore } from '../../store/seatingStore';
import { GuestCard } from './GuestCard';
import { Button } from '../shared/Button';
import { AddGuestModal } from './AddGuestModal';

export const GuestList: React.FC = () => {
    const { guests, removeGuest } = useSeatingStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Filter only unseated guests
    const unseatedGuests = useMemo(() => {
        return guests.filter((g) => !g.tableId && (
            g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            g.category.includes(searchTerm) ||
            (g.groupId && g.groupId.includes(searchTerm))
        ));
    }, [guests, searchTerm]);

    const { setNodeRef } = useDroppable({
        id: 'guest-list',
        data: {
            type: 'guest-list',
        },
    });

    const categories = [
        { id: 'family', label: 'משפחה', icon: '👨‍👩‍👧‍👦' },
        { id: 'friend', label: 'חברים', icon: '🍻' },
        { id: 'colleague', label: 'עבודה', icon: '💼' },
        { id: 'other', label: 'אחר', icon: '✨' }
    ];

    return (
        <div className="bg-white h-full flex flex-col shadow-xl border-l border-stone-200 w-full max-w-[380px] z-10 transition-all duration-300">
            {/* Header */}
            <div className="p-5 border-b border-stone-100 bg-white sticky top-0 z-10">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-stone-800 flex items-center gap-2">
                        <span className="text-amber-500">📋</span>
                        רשימת המתנה
                    </h2>
                    <span className="bg-amber-100 text-amber-800 text-sm font-bold px-3 py-1 rounded-full shadow-sm">
                        {unseatedGuests.length}
                    </span>
                </div>

                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            placeholder="חיפוש אורח..."
                            className="w-full pl-4 pr-10 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <span className="absolute left-3 top-2.5 text-stone-400">🔍</span>
                    </div>
                    <Button
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-stone-800 text-white hover:bg-stone-700 shadow-md px-3"
                        title="הוסף אורח"
                    >
                        ➕
                    </Button>
                </div>
            </div>

            {/* List */}
            <div
                ref={setNodeRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-stone-200 scrollbar-track-transparent bg-stone-50/30"
            >
                {unseatedGuests.length === 0 ? (
                    <div className="text-center py-10 opacity-40">
                        <div className="text-5xl mb-3">📭</div>
                        <p className="text-stone-500 font-medium">
                            {searchTerm ? 'לא נמצאו תוצאות' : 'אין אורחים בהמתנה'}
                        </p>
                    </div>
                ) : (
                    categories.map(cat => {
                        const catGuests = unseatedGuests.filter(g => g.category === cat.id);
                        if (catGuests.length === 0) return null;

                        return (
                            <div key={cat.id} className="mb-4">
                                <h3 className="text-sm font-bold text-stone-400 mb-2 mr-1 flex items-center gap-1.5">
                                    <span>{cat.icon}</span>
                                    {cat.label}
                                    <span className="bg-stone-100 text-stone-500 w-5 h-5 rounded-full text-[10px] flex items-center justify-center">
                                        {catGuests.length}
                                    </span>
                                </h3>
                                <div>
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
