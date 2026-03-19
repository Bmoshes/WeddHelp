import React, { useState } from 'react';
import { useSeatingStore } from '../../store/seatingStore';
import { TableCard } from './TableCard.tsx';
import { Button } from '../shared/Button';
import { AddTableModal } from './AddTableModal';

export const TablesGrid: React.FC = () => {
    const { tables, guests, addTable } = useSeatingStore();
    const [showAddModal, setShowAddModal] = useState(false);

    const sortedTables = [...tables].sort((a, b) => a.number - b.number);

    return (
        <div className="h-full flex flex-col">
            {/* ── Section header ───────────────────────────────────────── */}
            <div className="flex items-center justify-between mb-5 px-1">
                <div className="flex items-center gap-2.5">
                    <h2 className="text-lg font-bold text-stone-900 tracking-tight">
                        סידור השולחנות
                    </h2>
                    <span className="text-xs font-semibold text-stone-500 bg-white border border-[#e4ddd4]
                                     px-2 py-0.5 rounded-full shadow-warm-xs">
                        {tables.length}
                    </span>
                </div>
                <Button
                    onClick={() => setShowAddModal(true)}
                    className="bg-amber-500 hover:bg-amber-600 border-0 text-white shadow-warm-sm hover:shadow-warm text-sm"
                    data-testid="add-table-btn"
                >
                    <span className="text-base leading-none">+</span> שולחן חדש
                </Button>
            </div>

            {/* ── Grid ─────────────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto pb-20">
                {tables.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[52vh]
                                    border-2 border-dashed border-[#e4ddd4] rounded-2xl
                                    bg-white/60 text-stone-400">
                        <div className="text-5xl mb-4 opacity-30">🍽️</div>
                        <h3 className="text-base font-bold text-stone-600 mb-1">עדיין אין שולחנות</h3>
                        <p className="text-sm mb-6 text-stone-400">הוסף שולחן או הפעל אופטימיזציה אוטומטית</p>
                        <Button
                            onClick={() => setShowAddModal(true)}
                            className="bg-stone-900 hover:bg-stone-800 border-0 text-white text-sm"
                        >
                            + הוסף שולחן ראשון
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 max-w-[1600px] mx-auto px-1">
                        {sortedTables.map((table) => {
                            const tableGuests = guests.filter((g) => g.tableId === table.id);
                            return (
                                <TableCard
                                    key={table.id}
                                    table={table}
                                    guests={tableGuests}
                                />
                            );
                        })}
                    </div>
                )}
            </div>

            <AddTableModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onAdd={(capacity) => addTable(capacity)}
            />
        </div>
    );
};
