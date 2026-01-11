import React from 'react';
import { useSeatingStore } from '../../store/seatingStore';
import { TableCard } from './TableCard';
import { Button } from '../shared/Button';

export const TablesGrid: React.FC = () => {
    const { tables, guests, addTable } = useSeatingStore();

    // Sort tables by number
    const sortedTables = [...tables].sort((a, b) => a.number - b.number);

    const handleAddTable = () => {
        const capacityInput = prompt('כמה מקומות בשולחן?', '10');
        if (capacityInput) {
            const capacity = parseInt(capacityInput);
            if (!isNaN(capacity) && capacity > 0 && capacity <= 50) {
                addTable(capacity);
            } else {
                alert('נא להזין מספר תקין בין 1 ל-50');
            }
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
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

            <div className="flex-1 overflow-y-auto pr-2 pb-10 scrollbar-thin scrollbar-thumb-stone-200 scrollbar-track-transparent">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
