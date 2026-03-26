export interface ProximityGuest {
    id: string;
    name: string;
    firstName?: string;
    lastName: string;
    amount?: number;
    groupId: string;
    relationshipGroup: string;
    relationshipStrength: number;
    side: 'groom' | 'bride' | 'both';
    conflictsWith: string[];
}

export interface ProximityConfig {
    tableCapacity?: number;
    knightConfig?: {
        enabled: boolean;
        count: number;
        capacity: number;
    };
    knightGroupNames?: string[];
}

export interface ProximityTable {
    id: string;
    capacity: number;
    guests: ProximityGuest[];
    isKnight: boolean;
    side: string;
    relationshipGroup?: string;
}

export interface ProximityResult {
    assignments: { [guestId: string]: string };
    tables: ProximityTable[];
}

function normalize(value: string): string {
    return value.trim().toLowerCase();
}

function getGuestSize(guest: ProximityGuest): number {
    return guest.amount || 1;
}

function getGuestsSize(guests: ProximityGuest[]): number {
    return guests.reduce((sum, guest) => sum + getGuestSize(guest), 0);
}

function takeGuestsThatFit(cluster: ProximityGuest[], available: number): ProximityGuest[] {
    const chunk: ProximityGuest[] = [];
    let used = 0;

    for (let i = 0; i < cluster.length; i++) {
        const guest = cluster[i];
        const size = getGuestSize(guest);
        if (used + size > available) break;
        chunk.push(guest);
        used += size;
    }

    return chunk;
}

function ensureTableCanFitGuest(table: ProximityTable, guest: ProximityGuest): void {
    table.capacity = Math.max(table.capacity, getGuestSize(guest));
}

function getDominantSide(guests: ProximityGuest[]): 'groom' | 'bride' | 'both' {
    const counts = { groom: 0, bride: 0, both: 0 };
    for (const guest of guests) {
        counts[guest.side] += getGuestSize(guest);
    }
    return (Object.entries(counts).reduce((best, current) => current[1] > best[1] ? current : best)[0] || 'both') as 'groom' | 'bride' | 'both';
}

function getDominantRelationshipGroup(guests: ProximityGuest[]): string {
    const counts = new Map<string, number>();
    for (const guest of guests) {
        const key = guest.relationshipGroup.trim();
        if (!key) continue;
        counts.set(key, (counts.get(key) || 0) + getGuestSize(guest));
    }

    let bestGroup = '';
    let bestCount = 0;
    for (const [group, count] of counts.entries()) {
        if (count > bestCount) {
            bestGroup = group;
            bestCount = count;
        }
    }

    return bestGroup;
}

function hasConflict(list1: ProximityGuest[], list2: ProximityGuest[]): boolean {
    for (const a of list1) {
        for (const b of list2) {
            if (a.conflictsWith.includes(b.id) || b.conflictsWith.includes(a.id)) {
                return true;
            }
        }
    }
    return false;
}

export function buildClusters(guests: ProximityGuest[]): ProximityGuest[][] {
    const clusterMap = new Map<string, ProximityGuest[]>();

    for (const guest of guests) {
        const key = guest.relationshipGroup
            ? `rel:${normalize(guest.relationshipGroup)}`
            : `grp:${guest.groupId}`;

        if (!clusterMap.has(key)) clusterMap.set(key, []);
        clusterMap.get(key)!.push(guest);
    }

    const clusters: ProximityGuest[][] = [];

    for (const members of clusterMap.values()) {
        const byLastName = new Map<string, ProximityGuest[]>();
        for (const guest of members) {
            const lastNameKey = guest.lastName ? normalize(guest.lastName) : '__anon__';
            if (!byLastName.has(lastNameKey)) byLastName.set(lastNameKey, []);
            byLastName.get(lastNameKey)!.push(guest);
        }

        const sorted = Array.from(byLastName.values())
            .sort((a, b) => getGuestsSize(b) - getGuestsSize(a))
            .flat();

        clusters.push(sorted);
    }

    clusters.sort((a, b) => getGuestsSize(b) - getGuestsSize(a));
    return clusters;
}

function createTable(id: string, capacity: number, isKnight: boolean): ProximityTable {
    return {
        id,
        capacity,
        guests: [],
        isKnight,
        side: 'both',
        relationshipGroup: '',
    };
}

function finalizeTableMetadata(table: ProximityTable): void {
    table.side = getDominantSide(table.guests);
    table.relationshipGroup = getDominantRelationshipGroup(table.guests);
}

function seatClusterChunk(table: ProximityTable, cluster: ProximityGuest[], available: number): ProximityGuest[] {
    let chunk = takeGuestsThatFit(cluster, available);

    if (chunk.length === 0 && cluster.length > 0 && table.guests.length === 0) {
        ensureTableCanFitGuest(table, cluster[0]);
        chunk = [cluster[0]];
    }

    cluster.splice(0, chunk.length);
    table.guests.push(...chunk);
    finalizeTableMetadata(table);
    return chunk;
}

function assignKnightTables(
    clusters: ProximityGuest[][],
    config: Required<Pick<ProximityConfig, 'knightConfig' | 'knightGroupNames'>>,
): { knightTables: ProximityTable[]; remainingClusters: ProximityGuest[][] } {
    const knightTables: ProximityTable[] = [];
    const remainingClusters: ProximityGuest[][] = [];
    const targetGroups = new Set(config.knightGroupNames.map(normalize));

    for (let i = 0; i < config.knightConfig.count; i++) {
        knightTables.push(createTable(`table-${i}`, config.knightConfig.capacity, true));
    }

    if (!config.knightConfig.enabled || config.knightConfig.count === 0) {
      return { knightTables: [], remainingClusters: clusters };
    }

    const knightClusters: ProximityGuest[][] = [];

    for (const cluster of clusters) {
        const dominantGroup = getDominantRelationshipGroup(cluster);
        if (dominantGroup && targetGroups.has(normalize(dominantGroup))) {
            knightClusters.push([...cluster]);
        } else {
            remainingClusters.push([...cluster]);
        }
    }

    for (const cluster of knightClusters) {
        while (cluster.length > 0) {
            let targetTable: ProximityTable | null = null;
            let maxSpace = -1;

            for (const table of knightTables) {
                const space = table.capacity - getGuestsSize(table.guests);
                if (space > maxSpace && !hasConflict(table.guests, cluster)) {
                    maxSpace = space;
                    targetTable = table;
                }
            }

            if (!targetTable || maxSpace <= 0) {
                remainingClusters.push([...cluster]);
                break;
            }

            const seatedChunk = seatClusterChunk(targetTable, cluster, maxSpace);
            if (seatedChunk.length === 0) {
                remainingClusters.push([...cluster]);
                break;
            }
        }
    }

    return { knightTables, remainingClusters };
}

export function assignClustersToTables(
    clusters: ProximityGuest[][],
    tableCapacity: number,
    config: Pick<ProximityConfig, 'knightConfig' | 'knightGroupNames'> = {},
): ProximityTable[] {
    const knightConfig = config.knightConfig ?? { enabled: false, count: 0, capacity: 20 };
    const knightGroupNames = config.knightGroupNames ?? [];
    const { knightTables, remainingClusters } = assignKnightTables(clusters, { knightConfig, knightGroupNames });

    const tables = [...knightTables];
    let tableIndex = knightTables.length;

    function newTable(): ProximityTable {
        const table = createTable(`table-${tableIndex++}`, tableCapacity, false);
        tables.push(table);
        return table;
    }

    if (remainingClusters.length > 0) {
        newTable();
    }

    for (const clusterGuests of remainingClusters) {
        const cluster = [...clusterGuests];

        while (cluster.length > 0) {
            const needed = getGuestsSize(cluster);
            let targetTable: ProximityTable | null = null;
            let minWaste = Infinity;

            for (const table of tables.filter((item) => !item.isKnight)) {
                const available = table.capacity - getGuestsSize(table.guests);
                if (available >= needed && !hasConflict(table.guests, cluster)) {
                    const waste = available - needed;
                    if (waste < minWaste) {
                        minWaste = waste;
                        targetTable = table;
                    }
                }
            }

            if (!targetTable) {
                let maxAvailable = 0;
                for (const table of tables.filter((item) => !item.isKnight)) {
                    const available = table.capacity - getGuestsSize(table.guests);
                    if (available > maxAvailable && !hasConflict(table.guests, cluster)) {
                        maxAvailable = available;
                        targetTable = table;
                    }
                }
            }

            if (!targetTable || getGuestsSize(targetTable.guests) >= targetTable.capacity) {
                targetTable = newTable();
            }

            let available = targetTable.capacity - getGuestsSize(targetTable.guests);
            if (cluster.length > 0 && targetTable.guests.length > 0 && getGuestSize(cluster[0]) > available) {
                targetTable = newTable();
                available = targetTable.capacity - getGuestsSize(targetTable.guests);
            }

            const seatedChunk = seatClusterChunk(targetTable, cluster, available);
            if (seatedChunk.length === 0) {
                throw new Error('Proximity seating made no progress while assigning a cluster');
            }
        }
    }

    return tables.filter((table) => table.guests.length > 0);
}

export function resolveConflicts(tables: ProximityTable[], tableCapacity: number = 12): void {
    let nextId = tables.length;

    function openTable(): ProximityTable {
        const table = createTable(`table-${nextId++}`, tableCapacity, false);
        tables.push(table);
        return table;
    }

    for (let pass = 0; pass < 3; pass++) {
        let moved = false;

        for (const table of tables) {
            const tableGuestIds = new Set(table.guests.map((guest) => guest.id));

            for (let i = 0; i < table.guests.length; i++) {
                const guest = table.guests[i];
                const conflictHere = guest.conflictsWith.some((conflictId) => tableGuestIds.has(conflictId));
                if (!conflictHere) continue;

                let destination: ProximityTable | null = null;
                for (const other of tables) {
                    if (other.id === table.id) continue;
                    if (getGuestsSize(other.guests) + getGuestSize(guest) > other.capacity) continue;

                    const otherIds = new Set(other.guests.map((otherGuest) => otherGuest.id));
                    const conflictThere =
                        guest.conflictsWith.some((conflictId) => otherIds.has(conflictId)) ||
                        other.guests.some((otherGuest) => otherGuest.conflictsWith.includes(guest.id));

                    if (!conflictThere) {
                        destination = other;
                        break;
                    }
                }

                if (!destination) {
                    destination = openTable();
                }

                table.guests.splice(i, 1);
                tableGuestIds.delete(guest.id);
                destination.guests.push(guest);
                finalizeTableMetadata(destination);
                finalizeTableMetadata(table);
                i--;
                moved = true;
            }
        }

        if (!moved) break;
    }
}

export function runProximityAlgorithm(
    guests: ProximityGuest[],
    config: ProximityConfig = {},
): ProximityResult {
    if (guests.length === 0) {
        return { assignments: {}, tables: [] };
    }

    const tableCapacity = config.tableCapacity ?? 12;
    const clusters = buildClusters(guests);
    const tables = assignClustersToTables(clusters, tableCapacity, {
        knightConfig: config.knightConfig,
        knightGroupNames: config.knightGroupNames,
    });
    resolveConflicts(tables, tableCapacity);

    const assignments: { [guestId: string]: string } = {};
    for (const table of tables) {
        finalizeTableMetadata(table);
        for (const guest of table.guests) {
            assignments[guest.id] = table.id;
        }
    }

    return { assignments, tables };
}
