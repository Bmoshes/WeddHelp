import { describe, it, expect, beforeEach } from 'vitest';
import { useSeatingStore } from '../store/seatingStore';

beforeEach(() => {
    useSeatingStore.getState().resetAll();
});

describe('table capacity validation in store', () => {
    it('prevents assigning a guest when table is full (by amount)', () => {
        const store = useSeatingStore.getState();
        // Table with capacity 2
        store.addTable(2);
        const tableId = useSeatingStore.getState().tables[0].id;

        // Guest that needs 2 seats fills the table
        store.addGuest({ name: 'A', category: 'other', side: 'both', amount: 2, conflictsWith: [] });
        // Guest needing 1 more seat
        store.addGuest({ name: 'B', category: 'other', side: 'both', amount: 1, conflictsWith: [] });

        const [gA, gB] = useSeatingStore.getState().guests;
        store.assignGuestToTable(gA.id, tableId);
        // Table is now full; assigning B should not work
        store.assignGuestToTable(gB.id, tableId);

        const bAfter = useSeatingStore.getState().guests.find(g => g.id === gB.id)!;
        expect(bAfter.tableId).toBeUndefined();
    });
});

describe('capacity validation logic', () => {
    it('rejects new capacity below current occupancy', () => {
        const totalOccupied = 5;
        const maxCapacity = 60;
        const validate = (cap: number) =>
            !isNaN(cap) && cap > 0 && cap >= totalOccupied && cap <= maxCapacity;

        expect(validate(4)).toBe(false);  // below occupancy
        expect(validate(5)).toBe(true);   // equal to occupancy
        expect(validate(6)).toBe(true);   // above occupancy
        expect(validate(0)).toBe(false);  // zero is always invalid
        expect(validate(61)).toBe(false); // above max
    });
});
