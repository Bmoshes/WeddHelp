import { describe, it, expect } from 'vitest';
import {
    buildClusters,
    assignClustersToTables,
    resolveConflicts,
    runProximityAlgorithm,
    type ProximityGuest,
} from '../utils/proximityAlgorithm';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeGuest(
    id: string,
    opts: {
        lastName?: string;
        groupId?: string;
        relationshipGroup?: string;
        relationshipStrength?: number;
        amount?: number;
        side?: 'groom' | 'bride' | 'both';
        conflictsWith?: string[];
    } = {},
): ProximityGuest {
    return {
        id,
        name: `Guest ${id}`,
        firstName: `Guest ${id}`,
        lastName: opts.lastName ?? '',
        amount: opts.amount ?? 1,
        groupId: opts.groupId ?? 'household-1',
        relationshipGroup: opts.relationshipGroup ?? '',
        relationshipStrength: opts.relationshipStrength ?? 1,
        side: opts.side ?? 'both',
        conflictsWith: opts.conflictsWith ?? [],
    };
}

// ─── buildClusters ───────────────────────────────────────────────────────────

describe('buildClusters — relationship grouping', () => {
    it('groups guests with the same relationshipGroup into one cluster', () => {
        const guests = [
            makeGuest('g1', { relationshipGroup: 'חברי ילדות' }),
            makeGuest('g2', { relationshipGroup: 'חברי ילדות' }),
            makeGuest('g3', { relationshipGroup: 'עמיתי עבודה' }),
        ];

        const clusters = buildClusters(guests);

        expect(clusters).toHaveLength(2);
        const sizes = clusters.map(c => c.length).sort((a, b) => b - a);
        expect(sizes).toEqual([2, 1]);
    });

    it('falls back to groupId when relationshipGroup is empty', () => {
        const guests = [
            makeGuest('g1', { groupId: 'inv-A' }),
            makeGuest('g2', { groupId: 'inv-A' }),
            makeGuest('g3', { groupId: 'inv-B' }),
        ];

        const clusters = buildClusters(guests);

        expect(clusters).toHaveLength(2);
        const clusterA = clusters.find(c => c.some(g => g.id === 'g1'));
        expect(clusterA).toHaveLength(2);
        expect(clusterA?.map(g => g.id)).toContain('g2');
    });

    it('returns clusters sorted largest-first', () => {
        const guests = [
            makeGuest('g1', { groupId: 'A' }),
            makeGuest('g2', { groupId: 'B' }),
            makeGuest('g3', { groupId: 'B' }),
            makeGuest('g4', { groupId: 'B' }),
        ];

        const clusters = buildClusters(guests);

        expect(clusters[0]).toHaveLength(3); // group B first
        expect(clusters[1]).toHaveLength(1); // group A second
    });
});

describe('buildClusters — surname clustering', () => {
    it('places same-lastName guests consecutively within a cluster', () => {
        const guests = [
            makeGuest('g1', { groupId: 'inv-1', lastName: 'כהן' }),
            makeGuest('g2', { groupId: 'inv-1', lastName: 'לוי' }),
            makeGuest('g3', { groupId: 'inv-1', lastName: 'כהן' }),
            makeGuest('g4', { groupId: 'inv-1', lastName: 'לוי' }),
        ];

        const [cluster] = buildClusters(guests);

        // Same surnames must be adjacent
        expect(cluster[0].lastName).toBe(cluster[1].lastName);
        expect(cluster[2].lastName).toBe(cluster[3].lastName);
    });

    it('largest surname sub-group is placed first', () => {
        const guests = [
            makeGuest('g1', { groupId: 'inv-1', lastName: 'כהן' }),
            makeGuest('g2', { groupId: 'inv-1', lastName: 'כהן' }),
            makeGuest('g3', { groupId: 'inv-1', lastName: 'כהן' }),
            makeGuest('g4', { groupId: 'inv-1', lastName: 'לוי' }),
        ];

        const [cluster] = buildClusters(guests);

        expect(cluster[0].lastName).toBe('כהן');
        expect(cluster[1].lastName).toBe('כהן');
        expect(cluster[2].lastName).toBe('כהן');
        expect(cluster[3].lastName).toBe('לוי');
    });
});

// ─── assignClustersToTables ──────────────────────────────────────────────────

describe('assignClustersToTables — capacity', () => {
    it('seats all guests within table capacity', () => {
        const cluster = [makeGuest('g1'), makeGuest('g2'), makeGuest('g3')];
        const tables = assignClustersToTables([cluster], 5);

        const seated = tables.flatMap(t => t.guests).length;
        expect(seated).toBe(3);
        tables.forEach(t => expect(t.guests.length).toBeLessThanOrEqual(t.capacity));
    });

    it('keeps a cluster together when it fits in one table', () => {
        const cluster = [makeGuest('g1'), makeGuest('g2'), makeGuest('g3')];
        const tables = assignClustersToTables([cluster], 10);

        expect(tables[0].guests).toHaveLength(3);
    });

    it('forced split: cluster larger than table capacity is spread across tables', () => {
        const cluster = Array.from({ length: 15 }, (_, i) => makeGuest(`g${i}`));
        const tables = assignClustersToTables([cluster], 6);

        const totalSeated = tables.flatMap(t => t.guests).length;
        expect(totalSeated).toBe(15);
        tables.forEach(t => expect(t.guests.length).toBeLessThanOrEqual(6));
        // Must use at least 3 tables (Math.ceil(15/6) = 3)
        expect(tables.length).toBeGreaterThanOrEqual(3);
    });

    it('forced split preserves surname sub-groups on same table when possible', () => {
        // 8 guests: 4 with lastName "כהן", 4 with lastName "לוי". Table capacity = 4.
        const guests = [
            ...Array.from({ length: 4 }, (_, i) => makeGuest(`k${i}`, { groupId: 'g', lastName: 'כהן' })),
            ...Array.from({ length: 4 }, (_, i) => makeGuest(`l${i}`, { groupId: 'g', lastName: 'לוי' })),
        ];
        const [cluster] = buildClusters(guests); // within one groupId cluster, surnames sorted
        const tables = assignClustersToTables([cluster], 4);

        // Each table should be all-כהן or all-לוי (since they arrive in batches of 4)
        for (const t of tables) {
            const uniqueLastNames = new Set(t.guests.map(g => g.lastName));
            expect(uniqueLastNames.size).toBe(1);
        }
    });

    it('seats guests from multiple clusters across multiple tables', () => {
        const c1 = [makeGuest('a1'), makeGuest('a2')];
        const c2 = [makeGuest('b1'), makeGuest('b2'), makeGuest('b3')];
        const tables = assignClustersToTables([c1, c2], 5);

        const total = tables.flatMap(t => t.guests).length;
        expect(total).toBe(5);
    });

    it('respects amount when filling tables', () => {
        const cluster = [
            makeGuest('g1', { amount: 2 }),
            makeGuest('g2', { amount: 2 }),
            makeGuest('g3', { amount: 2 }),
        ];
        const tables = assignClustersToTables([cluster], 4);

        const occupancy = tables.map((table) => table.guests.reduce((sum, guest) => sum + (guest.amount || 1), 0));
        occupancy.forEach((count) => expect(count).toBeLessThanOrEqual(4));
    });

    it('does not get stuck when a single guest needs more seats than tableCapacity', () => {
        const cluster = [
            makeGuest('g1', { amount: 14 }),
            makeGuest('g2', { amount: 2 }),
        ];

        const tables = assignClustersToTables([cluster], 12);
        const occupancy = tables.map((table) => table.guests.reduce((sum, guest) => sum + (guest.amount || 1), 0));

        expect(occupancy).toContain(14);
        expect(occupancy.every((count, index) => count <= tables[index].capacity)).toBe(true);
    });

    it('does not overfill a partially occupied table when the next guest is too large', () => {
        const firstCluster = [makeGuest('g1', { amount: 9 })];
        const secondCluster = [makeGuest('g2', { amount: 6 })];

        const tables = assignClustersToTables([firstCluster, secondCluster], 12);
        const occupancy = tables.map((table) => table.guests.reduce((sum, guest) => sum + (guest.amount || 1), 0));

        occupancy.forEach((count, index) => expect(count).toBeLessThanOrEqual(tables[index].capacity));
        expect(tables.length).toBeGreaterThanOrEqual(2);
    });
});

describe('assignClustersToTables — knight tables', () => {
    it('places selected relationship groups into knight tables first', () => {
        const clusters = buildClusters([
            makeGuest('g1', { relationshipGroup: 'חברי ילדות', side: 'groom' }),
            makeGuest('g2', { relationshipGroup: 'חברי ילדות', side: 'groom' }),
            makeGuest('g3', { relationshipGroup: 'עבודה', side: 'bride' }),
        ]);

        const tables = assignClustersToTables(clusters, 10, {
            knightConfig: { enabled: true, count: 1, capacity: 10 },
            knightGroupNames: ['חברי ילדות'],
        });

        expect(tables[0].isKnight).toBe(true);
        expect(tables[0].relationshipGroup).toBe('חברי ילדות');
        expect(tables[0].guests.map((guest) => guest.id)).toEqual(['g1', 'g2']);
    });
});

// ─── resolveConflicts ────────────────────────────────────────────────────────

describe('resolveConflicts', () => {
    it('separates conflicting guests to different tables', () => {
        const g1 = makeGuest('g1', { conflictsWith: ['g2'] });
        const g2 = makeGuest('g2', { conflictsWith: ['g1'] });

        const tables = [
            { id: 't0', capacity: 5, guests: [g1, g2], isKnight: false, side: 'both' },
            { id: 't1', capacity: 5, guests: [],       isKnight: false, side: 'both' },
        ];

        resolveConflicts(tables);

        // At minimum, g1 and g2 are not on the same table
        expect(
            tables.find(t => t.guests.some(g => g.id === 'g1'))?.id,
        ).not.toBe(
            tables.find(t => t.guests.some(g => g.id === 'g2'))?.id,
        );
    });

    it('does not move guests unnecessarily when no conflicts', () => {
        const g1 = makeGuest('g1');
        const g2 = makeGuest('g2');

        const tables = [
            { id: 't0', capacity: 5, guests: [g1, g2], isKnight: false, side: 'both' },
        ];

        resolveConflicts(tables);

        expect(tables[0].guests).toHaveLength(2);
    });
});

// ─── runProximityAlgorithm — integration ────────────────────────────────────

describe('runProximityAlgorithm — integration', () => {
    it('assigns every guest', () => {
        const guests = Array.from({ length: 10 }, (_, i) => makeGuest(`g${i}`, { groupId: `grp${i % 3}` }));
        const result = runProximityAlgorithm(guests, { tableCapacity: 4 });

        expect(Object.keys(result.assignments)).toHaveLength(10);
    });

    it('returns empty result for empty guest list', () => {
        const result = runProximityAlgorithm([], { tableCapacity: 10 });

        expect(result.assignments).toEqual({});
        expect(result.tables).toEqual([]);
    });

    it('fallback: guests without relationshipGroup are clustered by groupId', () => {
        const guests = [
            makeGuest('g1', { groupId: 'household-X' }),
            makeGuest('g2', { groupId: 'household-X' }),
            makeGuest('g3', { groupId: 'household-Y' }),
        ];

        const result = runProximityAlgorithm(guests, { tableCapacity: 10 });

        // g1 and g2 should be on the same table
        expect(result.assignments['g1']).toBe(result.assignments['g2']);
        // g3 can be anywhere (may merge into the same table since capacity allows)
    });

    it('does not seat conflicting guests at the same table', () => {
        const guests = [
            makeGuest('g1', { conflictsWith: ['g2'] }),
            makeGuest('g2', { conflictsWith: ['g1'] }),
            makeGuest('g3'),
        ];

        const result = runProximityAlgorithm(guests, { tableCapacity: 10 });

        expect(result.assignments['g1']).not.toBe(result.assignments['g2']);
    });

    it('groups by relationshipGroup across different households', () => {
        // g1 (inv-A) and g2 (inv-B) both have the same relationshipGroup → should be in same cluster
        const guests = [
            makeGuest('g1', { groupId: 'inv-A', relationshipGroup: 'חברי ילדות' }),
            makeGuest('g2', { groupId: 'inv-B', relationshipGroup: 'חברי ילדות' }),
            makeGuest('g3', { groupId: 'inv-C' }),
        ];

        const result = runProximityAlgorithm(guests, { tableCapacity: 10 });

        // g1 and g2 are in the same cluster → same table when capacity allows
        expect(result.assignments['g1']).toBe(result.assignments['g2']);
    });

    it('respects table capacity across all guests', () => {
        const guests = Array.from({ length: 20 }, (_, i) => makeGuest(`g${i}`, { groupId: 'one-group' }));
        const result = runProximityAlgorithm(guests, { tableCapacity: 8 });

        for (const table of result.tables) {
            expect(table.guests.length).toBeLessThanOrEqual(table.capacity);
        }
        expect(Object.keys(result.assignments)).toHaveLength(20);
    });

    it('keeps table metadata for side and dominant relationship group', () => {
        const guests = [
            makeGuest('g1', { relationshipGroup: 'חברים', side: 'groom' }),
            makeGuest('g2', { relationshipGroup: 'חברים', side: 'groom' }),
            makeGuest('g3', { relationshipGroup: 'משפחה', side: 'bride' }),
        ];

        const result = runProximityAlgorithm(guests, { tableCapacity: 10 });

        expect(result.tables[0].side).toBe('groom');
        expect(result.tables[0].relationshipGroup).toBe('חברים');
    });
});
