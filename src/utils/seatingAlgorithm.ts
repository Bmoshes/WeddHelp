import { Guest, Table, GuestGroup } from '../types';

export interface OptimizationConfig {
    maxIterations?: number;
    timeoutMs?: number;
    onProgress?: (progress: number, message: string) => void;
    tableCapacity?: number; // Default table size
    knightConfig?: {
        enabled: boolean;
        count: number;
        capacity: number;
    };
    knightGroupNames?: string[]; // Specific group names to prioritize for knight tables
}

export interface OptimizedTable {
    id: string;
    capacity: number;
    isKnight: boolean;
    guests: Guest[];
    side: string;
    category: string;
}

export interface OptimizationResult {
    assignments: Assignment;
    tables: OptimizedTable[];
}

interface Assignment {
    [guestId: string]: string; // guestId -> tableId
}

/**
 * Main optimization function
 */
export async function optimizeSeating(
    guests: Guest[],
    _tables: Table[],
    config: OptimizationConfig = {}
): Promise<OptimizationResult> {
    const {
        onProgress = () => { },
        tableCapacity = 12, // Default table size
        knightConfig = { enabled: false, count: 0, capacity: 20 },
    } = config;

    // Helper: Normalize group string for comparison
    const normalize = (s: string) => s.trim().toLowerCase();
    const knightTargetGroups = config.knightGroupNames ? config.knightGroupNames.map(normalize) : [];

    // Step 1: Group guests by their groupId
    onProgress(10, 'מנתח קבוצות קשר...');
    const originalGroups = groupGuestsByRelationship(guests);

    // Step 2: Classify groups
    let processedGroups = originalGroups.map(group => {
        const sideCounts = { groom: 0, bride: 0, both: 0 };
        const categoryCounts = { family: 0, friend: 0, colleague: 0, other: 0 };

        group.guests.forEach(g => {
            sideCounts[g.side]++;
            categoryCounts[g.category]++;
        });

        const dominantSide = Object.entries(sideCounts).reduce((a, b) => a[1] > b[1] ? a : b)[0] as 'groom' | 'bride' | 'both';
        const dominantCategory = Object.entries(categoryCounts).reduce((a, b) => a[1] > b[1] ? a : b)[0] as 'family' | 'friend' | 'colleague' | 'other';

        return {
            ...group,
            dominantSide,
            dominantCategory,
            isRequestedForKnight: knightTargetGroups.includes(normalize(group.groupId))
        };
    });

    const assignment: Assignment = {};
    const tableAssignments: Record<string, { guests: Guest[], side: string, category: string, capacity: number, isKnight: boolean }> = {};
    let tableCounter = 0;

    // --- PHASE A: KNIGHT TABLES ---
    if (knightConfig.enabled && knightConfig.count > 0) {
        onProgress(20, 'משבץ שולחנות אבירים...');

        // Init Knight Tables
        for (let i = 0; i < knightConfig.count; i++) {
            const tableId = `table-${tableCounter++}`;
            tableAssignments[tableId] = {
                guests: [],
                side: '',
                category: '',
                capacity: knightConfig.capacity,
                isKnight: true
            };
        }

        // Determine Candidates for Knight Tables
        // STRICT MODE: Only user-selected groups
        // AUTO MODE: Any 'friend' group (largest first)

        let knightCandidates: typeof processedGroups = [];
        const userDefinedGroups = processedGroups.filter(g => g.isRequestedForKnight);

        if (userDefinedGroups.length > 0) {
            // Strict Mode
            knightCandidates = userDefinedGroups;
            // Remove them from general pool immediately
            processedGroups = processedGroups.filter(g => !g.isRequestedForKnight);
        } else {
            // Auto Mode (User left empty) -> Prioritize 'friend' category
            knightCandidates = processedGroups.filter(g => g.dominantCategory === 'friend');
            // Remove them from general pool (we will put back leftovers later)
            processedGroups = processedGroups.filter(g => g.dominantCategory !== 'friend');
        }

        // Sort descending to fit largest chunks first
        knightCandidates.sort((a, b) => b.size - a.size);

        for (const group of knightCandidates) {
            // Try to fit group in Knight tables
            let guestsToSeat = [...group.guests];

            while (guestsToSeat.length > 0) {
                let bestTableId: string | null = null;
                let maxSpace = -1;

                for (let i = 0; i < knightConfig.count; i++) {
                    const tableId = `table-${i}`;
                    const table = tableAssignments[tableId];
                    const space = table.capacity - table.guests.length;

                    if (space > 0 && space > maxSpace) {
                        maxSpace = space;
                        bestTableId = tableId;
                    }
                }

                if (bestTableId && maxSpace > 0) {
                    const table = tableAssignments[bestTableId];
                    const chunk = guestsToSeat.splice(0, maxSpace); // Take as many as fit

                    for (const guest of chunk) {
                        assignment[guest.id] = bestTableId;
                        table.guests.push(guest);
                    }
                    if (table.guests.length === chunk.length) { // First assignment
                        table.side = group.dominantSide;
                        table.category = group.dominantCategory;
                    }
                } else {
                    // No space in ANY knight table!
                    // Return remaining guests to general pool to be seated in standard tables
                    if (userDefinedGroups.length > 0) {
                        // In strict mode, user might be annoyed that their specific group didn't fully fit.
                        console.warn(`User defined group ${group.groupId} didn't fully fit in Knight tables.`);
                    }

                    if (guestsToSeat.length > 0) {
                        processedGroups.push({
                            ...group,
                            guests: guestsToSeat,
                            size: guestsToSeat.length
                        });
                    }
                    break;
                }
            }
        }
    }

    // --- STANDARD TABLES ---
    onProgress(40, 'משבץ שולחנות רגילים...');

    // Sort remaining by size desc
    processedGroups.sort((a, b) => b.size - a.size);

    for (const group of processedGroups) {
        let guestsToSeat = [...group.guests];

        while (guestsToSeat.length > 0) {
            // Strategy: Try to fit WHOLE remaining chunk in existing table, or create new.
            // Priority is minimizing fragmentation.


            // Try to fit WHOLE remaining chunk in existing table
            const currentStandardTableIds = Object.keys(tableAssignments).filter(id => !tableAssignments[id].isKnight);

            let bestFitTableId: string | null = null;
            let minRemainingSpace = Infinity;

            for (const tableId of currentStandardTableIds) {
                const table = tableAssignments[tableId];
                const space = table.capacity - table.guests.length;

                // Compatibility check
                const isEmpty = table.guests.length === 0;
                const isSideMatch = table.side === group.dominantSide || table.side === 'both' || isEmpty;
                // Allow mixing sides if table is mostly empty? No, stick to side rules.

                if (space >= guestsToSeat.length && isSideMatch) {
                    // It fits! Find the one with smallest remaining space to be tight.
                    if (space < minRemainingSpace) {
                        minRemainingSpace = space;
                        bestFitTableId = tableId;
                    }
                }
            }

            if (bestFitTableId) {
                // Perfect fit found
                const table = tableAssignments[bestFitTableId];
                for (const guest of guestsToSeat) {
                    assignment[guest.id] = bestFitTableId;
                    table.guests.push(guest);
                }
                if (table.guests.length === guestsToSeat.length) {
                    table.side = group.dominantSide;
                    table.category = group.dominantCategory;
                }
                guestsToSeat = [];
            }

            else {
                // Cannot fit completely in existing.
                // Should we open a NEW table if it fits completely there?
                if (guestsToSeat.length <= tableCapacity) {
                    const newTableId = `table-${tableCounter++}`;
                    tableAssignments[newTableId] = {
                        guests: [],
                        side: group.dominantSide,
                        category: group.dominantCategory,
                        capacity: tableCapacity,
                        isKnight: false
                    };
                    const table = tableAssignments[newTableId];
                    for (const guest of guestsToSeat) {
                        assignment[guest.id] = newTableId;
                        table.guests.push(guest);
                    }
                    guestsToSeat = [];
                }
                else {
                    // Group is LARGER than specific table, OR larger than any existing gap.
                    // We must SPLIT.
                    // Fill an existing table? Or start a new one and fill it?
                    // To avoid tiny leftovers (e.g. 14 -> 12 + 2), try to split evenly?
                    // But "Packing" usually means filling tables to the brim.
                    // Let's stick to FILLING existing/new tables to capacity to minimize table count.

                    // Priority: Fill existing tables that match side.
                    let bestPartialTableId: string | null = null;
                    let maxPartialSpace = -1;

                    for (const tableId of currentStandardTableIds) {
                        const table = tableAssignments[tableId];
                        const space = table.capacity - table.guests.length;
                        const isEmpty = table.guests.length === 0;
                        const isSideMatch = table.side === group.dominantSide || table.side === 'both' || isEmpty;

                        if (space > 0 && isSideMatch) {
                            if (space > maxPartialSpace) {
                                maxPartialSpace = space;
                                bestPartialTableId = tableId;
                            }
                        }
                    }

                    if (bestPartialTableId) {
                        // Fill this table
                        const table = tableAssignments[bestPartialTableId];
                        const chunk = guestsToSeat.splice(0, maxPartialSpace);
                        for (const guest of chunk) {
                            assignment[guest.id] = bestPartialTableId;
                            table.guests.push(guest);
                        }
                        if (table.guests.length === chunk.length) {
                            table.side = group.dominantSide;
                            table.category = group.dominantCategory;
                        }
                    } else {
                        // No existing table has space. Create NEW table and fill it.
                        const newTableId = `table-${tableCounter++}`;
                        tableAssignments[newTableId] = {
                            guests: [],
                            side: group.dominantSide,
                            category: group.dominantCategory,
                            capacity: tableCapacity,
                            isKnight: false
                        };
                        const table = tableAssignments[newTableId];
                        // Take as many as fit in capacity
                        const chunk = guestsToSeat.splice(0, tableCapacity);
                        for (const guest of chunk) {
                            assignment[guest.id] = newTableId;
                            table.guests.push(guest);
                        }
                    }
                }
            }
        }

        onProgress(40 + Math.floor((processedGroups.indexOf(group) / processedGroups.length) * 50), 'דוחס ומפצל...');
    }

    onProgress(100, 'הושבה הושלמה!');

    // Transform assignments
    const resultTables = Object.entries(tableAssignments).map(([id, table]) => ({
        id,
        ...table
    }));

    return {
        assignments: assignment,
        tables: resultTables
    };
}

/**
 * Group guests by relationship ID
 */
function groupGuestsByRelationship(guests: Guest[]): GuestGroup[] {
    const groups: Record<string, Guest[]> = {};
    const ungrouped: Guest[] = [];

    guests.forEach((guest) => {
        if (guest.groupId) {
            const key = guest.groupId.trim();
            if (!groups[key]) groups[key] = [];
            groups[key].push(guest);
        } else {
            ungrouped.push(guest);
        }
    });

    // Treat ungrouped as individuals
    ungrouped.forEach(guest => {
        // Use a unique ID so they don't merge, but allow them to fill gaps easily
        const key = `individual-${guest.id}`;
        groups[key] = [guest];
    });

    return Object.entries(groups).map(([id, groupGuests]) => ({
        groupId: id,
        guests: groupGuests,
        size: groupGuests.length,
        averageAge: 0,
        dominantSide: 'both' as const,
        dominantCategory: 'other' as const
    }));
}
