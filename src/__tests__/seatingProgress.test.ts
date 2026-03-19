import { describe, it, expect, beforeEach } from 'vitest';
import { useSeatingStore } from '../store/seatingStore';

beforeEach(() => {
    useSeatingStore.getState().resetAll();
});

describe('getSeatingProgress', () => {
    it('returns zeros when no guests', () => {
        const p = useSeatingStore.getState().getSeatingProgress();
        expect(p.seated).toBe(0);
        expect(p.total).toBe(0);
        expect(p.percentage).toBe(0);
    });

    it('counts seat demand (amount) not guest records', () => {
        const store = useSeatingStore.getState();
        store.addTable(10);
        const tableId = useSeatingStore.getState().tables[0].id;

        // Guest representing 3 seats
        store.addGuest({ name: 'Family', category: 'family', side: 'groom', amount: 3, conflictsWith: [] });
        // Guest representing 2 seats, unassigned
        store.addGuest({ name: 'Couple', category: 'friend', side: 'bride', amount: 2, conflictsWith: [] });

        const guestId = useSeatingStore.getState().guests[0].id;
        useSeatingStore.getState().assignGuestToTable(guestId, tableId);

        const p = useSeatingStore.getState().getSeatingProgress();
        expect(p.seated).toBe(3);   // 3 seats occupied
        expect(p.total).toBe(5);    // 5 total seats
        expect(p.percentage).toBe(60);
    });

    it('treats missing amount as 1', () => {
        const store = useSeatingStore.getState();
        store.addTable(10);
        const tableId = useSeatingStore.getState().tables[0].id;

        // Guest with no explicit amount
        store.addGuest({ name: 'Solo', category: 'other', side: 'both', conflictsWith: [] });
        const guestId = useSeatingStore.getState().guests[0].id;
        useSeatingStore.getState().assignGuestToTable(guestId, tableId);

        const p = useSeatingStore.getState().getSeatingProgress();
        expect(p.seated).toBe(1);
        expect(p.total).toBe(1);
        expect(p.percentage).toBe(100);
    });
});
