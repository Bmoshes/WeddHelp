import { describe, it, expect } from 'vitest';
import { optimizeSeating } from '../utils/seatingAlgorithm';
import { Guest } from '../types';

const makeGuest = (
    id: string,
    opts: { groupId?: string; amount?: number; conflictsWith?: string[] } = {}
): Guest => ({
    id,
    name: `Guest ${id}`,
    category: 'other',
    side: 'both',
    groupId: opts.groupId,
    amount: opts.amount ?? 1,
    conflictsWith: opts.conflictsWith ?? [],
});

describe('optimizeSeating — conflict handling', () => {
    it('does not seat conflicting guests at the same table in merge phase', async () => {
        // Two small solo guests that would normally be merged into one table
        const g1 = makeGuest('g1', { conflictsWith: ['g2'] });
        const g2 = makeGuest('g2', { conflictsWith: ['g1'] });

        const result = await optimizeSeating([g1, g2], [], { tableCapacity: 10 });

        // Must land on different tables
        expect(result.assignments['g1']).toBeDefined();
        expect(result.assignments['g2']).toBeDefined();
        expect(result.assignments['g1']).not.toBe(result.assignments['g2']);
    });

    it('does not seat conflicting guests at the same table during assignment', async () => {
        // Both belong to large groups that share the same dominant side/category
        // so the algorithm would normally try to merge them into one table
        const g1 = makeGuest('g1', { groupId: 'alpha', conflictsWith: ['g2'] });
        const g2 = makeGuest('g2', { groupId: 'beta', conflictsWith: ['g1'] });
        const g3 = makeGuest('g3', { groupId: 'alpha' });

        const result = await optimizeSeating([g1, g2, g3], [], { tableCapacity: 10 });

        const t1 = result.assignments['g1'];
        const t2 = result.assignments['g2'];
        expect(t1).toBeDefined();
        expect(t2).toBeDefined();
        expect(t1).not.toBe(t2);
    });

    it('assigns all guests even when conflicts exist', async () => {
        const g1 = makeGuest('g1', { conflictsWith: ['g2'] });
        const g2 = makeGuest('g2', { conflictsWith: ['g1'] });
        const g3 = makeGuest('g3');

        const result = await optimizeSeating([g1, g2, g3], [], { tableCapacity: 10 });

        expect(Object.keys(result.assignments).length).toBe(3);
    });

    it('places non-conflicting guests normally', async () => {
        const guests = [
            makeGuest('g1', { groupId: 'grp' }),
            makeGuest('g2', { groupId: 'grp' }),
            makeGuest('g3', { groupId: 'grp' }),
        ];

        const result = await optimizeSeating(guests, [], { tableCapacity: 10 });

        // All in the same group — should be at the same table
        const tables = new Set(Object.values(result.assignments));
        expect(tables.size).toBe(1);
    });
});

describe('optimizeSeating — amounts', () => {
    it('respects guest amounts when filling tables', async () => {
        const big = makeGuest('big', { amount: 8 });
        const small = makeGuest('small', { amount: 2 });

        const result = await optimizeSeating([big, small], [], { tableCapacity: 8 });

        // small cannot fit at big's table (capacity 8 already used by big)
        // so they must be on different tables
        expect(result.assignments['big']).not.toBe(result.assignments['small']);
    });
});
