import React from 'react';
import { useSeatingStore } from '../../store/seatingStore';
import { TableCard } from './TableCard.tsx';
import { Button } from '../shared/Button';

export const TablesGrid: React.FC = () => {
    const { tables, guests, addTable } = useSeatingStore();

    // Sort tables by number
    const sortedTables = [...tables].sort((a, b) => a.number - b.number);

    const handleAddTable = () => {
        const capacityInput = prompt('כמה מקומות בשולחן?', '10');
        if (capacityInput) {
            const capacity = parseInt(capacityInput);
            if (!isNaN(capacity) && capacity > 0 && capacity <= 100) {
                // Default to Knight (Rectangle) if capacity > 12, otherwise Regular (Round)
                // Note: We'll need to update the table immediately after creation or update store to accept type.
                // For now, let's assume valid capacity.
                addTable(capacity);
            } else {
                alert('נא להזין מספר תקין בין 1 ל-100');
            }
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-6 px-4">
                <h2 className="text-2xl font-bold text-stone-800 flex items-center gap-2">
                    <span className="text-amber-500">🍽️</span>
                    סידור השולחנות
                    <span className="text-sm font-normal text-stone-400 bg-stone-100 px-2 py-0.5 rounded-md ml-2">
                        {tables.length} שולחנות
                    </span>
                </h2>
                <Button
                    onClick={handleAddTable}
                    className="bg-amber-500 hover:bg-amber-600 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
                >
                    <span className="ml-2 text-lg">+</span> הוסף שולחן
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-20 scrollbar-thin scrollbar-thumb-stone-200 scrollbar-track-transparent">
                {tables.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[50vh] text-stone-400 border-2 border-dashed border-stone-200 rounded-2xl bg-stone-50/50">
                        <div className="text-6xl mb-4 opacity-50">🍽️</div>
                        <h3 className="text-xl font-bold mb-2">עדיין אין שולחנות</h3>
                        <p className="mb-6">התחל ע"י הוספת שולחן חדש או אופטימיזציה אוטומטית</p>
                        <Button onClick={handleAddTable} variant="primary">
                            צור שולחן ראשון
                        </Button>
                    </div>
                ) : (
                    // RESTRICTED TO MAX 3 COLUMNS for spaciousness
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-12 mx-auto max-w-[1600px]">
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
        </div>
    );
};
