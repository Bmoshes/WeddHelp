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
    // Helper to get size of a guest list
    const getGuestsSize = (list: Guest[]) => list.reduce((sum, g) => sum + (g.amount || 1), 0);

    let processedGroups = originalGroups.map(group => {
        const sideCounts = { groom: 0, bride: 0, both: 0 };
        const categoryCounts = { family: 0, friend: 0, colleague: 0, other: 0 };

        group.guests.forEach(g => {
            const amount = g.amount || 1;
            sideCounts[g.side] += amount; // Weighted by amount
            categoryCounts[g.category] += amount;
        });

        const dominantSide = Object.entries(sideCounts).reduce((a, b) => a[1] > b[1] ? a : b)[0] as 'groom' | 'bride' | 'both';
        const dominantCategory = Object.entries(categoryCounts).reduce((a, b) => a[1] > b[1] ? a : b)[0] as 'family' | 'friend' | 'colleague' | 'other';

        return {
            ...group,
            size: getGuestsSize(group.guests), // Correct size calculation
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

        let knightCandidates = processedGroups.filter(g => g.isRequestedForKnight);


        if (knightCandidates.length === 0) {
            knightCandidates = processedGroups.filter(g => g.dominantCategory === 'friend');
            processedGroups = processedGroups.filter(g => g.dominantCategory !== 'friend');
        } else {
            processedGroups = processedGroups.filter(g => !g.isRequestedForKnight);
        }

        knightCandidates.sort((a, b) => b.size - a.size);

        for (const group of knightCandidates) {
            let guestsToSeat = [...group.guests];

            while (guestsToSeat.length > 0) {
                let bestTableId: string | null = null;
                let maxSpace = -1;

                // Find best table for this chunk
                for (let i = 0; i < knightConfig.count; i++) {
                    const tableId = `table-${i}`;
                    const table = tableAssignments[tableId];
                    const currentOccupancy = getGuestsSize(table.guests);
                    const space = table.capacity - currentOccupancy;

                    if (space > 0 && space > maxSpace) {
                        maxSpace = space;
                        bestTableId = tableId;
                    }
                }

                if (bestTableId && maxSpace > 0) {
                    const table = tableAssignments[bestTableId];
                    // We can't just splice arbitrary number of guests because of amounts.
                    // We need to take guests that fit.
                    const chunk: Guest[] = [];
                    let chunkSpace = 0;

                    for (let i = 0; i < guestsToSeat.length; i++) {
                        const g = guestsToSeat[i];
                        const gSize = g.amount || 1;
                        if (chunkSpace + gSize <= maxSpace) {
                            chunk.push(g);
                            chunkSpace += gSize;
                        }
                    }

                    // If no guest fits (e.g. maxSpace is 1 but next guest is 2), we're stuck for this table?
                    // Simpler: Just take them one by one if they fit.
                    if (chunk.length === 0 && guestsToSeat.length > 0 && (guestsToSeat[0].amount || 1) <= maxSpace) {
                        chunk.push(guestsToSeat[0]);
                    }

                    if (chunk.length > 0) {
                        // Remove from source
                        chunk.forEach(g => {
                            const idx = guestsToSeat.findIndex(x => x.id === g.id);
                            if (idx > -1) guestsToSeat.splice(idx, 1);
                        });

                        for (const guest of chunk) {
                            assignment[guest.id] = bestTableId;
                            table.guests.push(guest);
                        }
                        if (table.guests.length === chunk.length) {
                            table.side = group.dominantSide;
                            table.category = group.dominantCategory;
                        }
                    } else {
                        // Cannot fit any more guests into best table? 
                        // Break to avoid infinite loop -> remaining go to pool
                        break;
                    }
                } else {
                    if (guestsToSeat.length > 0) {
                        processedGroups.push({
                            ...group,
                            guests: guestsToSeat,
                            size: getGuestsSize(guestsToSeat)
                        });
                    }
                    break;
                }
            }
        }
    }

    // --- STANDARD TABLES ---
    onProgress(40, 'משבץ שולחנות רגילים...');

    processedGroups.sort((a, b) => b.size - a.size);

    for (const group of processedGroups) {
        let guestsToSeat = [...group.guests];
        let groupSize = getGuestsSize(guestsToSeat);

        while (guestsToSeat.length > 0) {
            const currentStandardTableIds = Object.keys(tableAssignments).filter(id => !tableAssignments[id].isKnight);

            let bestFitTableId: string | null = null;
            let minRemainingSpace = Infinity;

            // Try to fit WHOLE group
            for (const tableId of currentStandardTableIds) {
                const table = tableAssignments[tableId];
                const currentOccupancy = getGuestsSize(table.guests);
                const space = table.capacity - currentOccupancy;

                const isEmpty = table.guests.length === 0;
                const isSideMatch = table.side === group.dominantSide || table.side === 'both' || isEmpty;

                if (space >= groupSize && isSideMatch) {
                    if (space < minRemainingSpace) {
                        minRemainingSpace = space;
                        bestFitTableId = tableId;
                    }
                }
            }

            if (bestFitTableId) {
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
            } else {
                // Determine split
                if (groupSize <= tableCapacity) {
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
                } else {
                    // Fill existing matching tables
                    // Strategy: Best Fit / Most Occupied First. Try to fill tables that are already open to avoid creating new ones unnecessarily.
                    let bestPartialTableId: string | null = null;
                    let maxPartialSpace = -1;

                    // Sort tables by occupancy descending (fill the most full ones first)
                    const sortedCandidateTables = currentStandardTableIds
                        .map(id => ({ id, table: tableAssignments[id] }))
                        .sort((a, b) => getGuestsSize(b.table.guests) - getGuestsSize(a.table.guests));

                    for (const { id, table } of sortedCandidateTables) {
                        const currentOccupancy = getGuestsSize(table.guests);
                        const space = table.capacity - currentOccupancy;
                        const isEmpty = table.guests.length === 0;
                        const isSideMatch = table.side === group.dominantSide || table.side === 'both' || isEmpty;

                        // Check if we can fit at least the smallest guest unit
                        if (space > 0 && isSideMatch) {
                            // Since we sorted by occupancy, the first valid match is our "Best Fit" candidate to fill up.
                            bestPartialTableId = id;
                            maxPartialSpace = space;
                            break;
                        }
                    }

                    if (bestPartialTableId) {
                        const table = tableAssignments[bestPartialTableId];
                        const chunk: Guest[] = [];
                        let chunkSpace = 0;

                        // Greedy fill
                        for (let i = 0; i < guestsToSeat.length; i++) {
                            const g = guestsToSeat[i];
                            const gSize = g.amount || 1;
                            if (chunkSpace + gSize <= maxPartialSpace) {
                                chunk.push(g);
                                chunkSpace += gSize;
                            }
                        }

                        if (chunk.length === 0 && guestsToSeat.length > 0 && (guestsToSeat[0].amount || 1) <= maxPartialSpace) {
                            chunk.push(guestsToSeat[0]);
                        }

                        if (chunk.length > 0) {
                            // Remove from source (safely)
                            chunk.forEach(ch => {
                                const idx = guestsToSeat.findIndex(x => x.id === ch.id);
                                if (idx > -1) guestsToSeat.splice(idx, 1);
                            });

                            for (const guest of chunk) {
                                assignment[guest.id] = bestPartialTableId;
                                table.guests.push(guest);
                            }
                            // Recalculate remaining size
                            groupSize = getGuestsSize(guestsToSeat);
                        } else {
                            // Force new table loop
                            maxPartialSpace = -1;
                            bestPartialTableId = null;
                        }
                    }

                    if (!bestPartialTableId) {
                        // New table
                        const newTableId = `table-${tableCounter++}`;
                        tableAssignments[newTableId] = {
                            guests: [],
                            side: group.dominantSide,
                            category: group.dominantCategory,
                            capacity: tableCapacity,
                            isKnight: false
                        };
                        const table = tableAssignments[newTableId];

                        // Fill new table up to capacity
                        // Fill new table up to capacity
                        const chunk: Guest[] = [];
                        let chunkSpace = 0;
                        for (let i = 0; i < guestsToSeat.length; i++) {
                            const g = guestsToSeat[i];
                            const gSize = g.amount || 1;

                            // Condition to add guest:
                            // 1. Fits within capacity
                            // 2. OR it's the first guest and it's already larger than standard capacity (Oversized guest case)
                            if (chunkSpace + gSize <= tableCapacity || (chunk.length === 0 && gSize > tableCapacity)) {
                                if (chunk.length === 0 && gSize > tableCapacity) {
                                    // Expand table to fit this giant guest
                                    table.capacity = gSize;
                                }
                                chunk.push(g);
                                chunkSpace += gSize;
                            }
                        }

                        // Safety check: If for some reason we still didn't pick anyone (shouldn't happen with above logic), force-pick first
                        if (chunk.length === 0 && guestsToSeat.length > 0) {
                            const g = guestsToSeat[0];
                            chunk.push(g);
                            table.capacity = Math.max(table.capacity, g.amount || 1);
                        }

                        if (chunk.length > 0) {
                            chunk.forEach(ch => {
                                const idx = guestsToSeat.findIndex(x => x.id === ch.id);
                                if (idx > -1) guestsToSeat.splice(idx, 1);
                            });
                            for (const guest of chunk) {
                                assignment[guest.id] = newTableId;
                                table.guests.push(guest);
                            }
                            groupSize = getGuestsSize(guestsToSeat);
                        } else {
                            // Infinite Loop Guard: If we absolutely cannot seat anyone, break to avoid freeze.
                            console.error('CRITICAL: Infinite loop detected in seating algorithm. Breaking.', guestsToSeat);
                            // Dump remaining guests to unseated?
                            break;
                        }
                    }
                }
            }
        }

        onProgress(40 + Math.floor((processedGroups.indexOf(group) / processedGroups.length) * 50), 'דוחס ומפצל...');
    }

    onProgress(90, 'מאחד שולחנות חצי-ריקים...');

    // --- PHASE C: MERGE SPARSE TABLES ---
    // Aggressively merge tables that can fit together to maximize space, 
    // even if it means mixing sides (Groom/Bride).

    // Get all standard tables (exclude Knight tables for now as they are specific)
    const standardTableIds = Object.keys(tableAssignments).filter(id => !tableAssignments[id].isKnight);

    // Sort by occupancy ascending (smallest tables first) to find easiest merges
    standardTableIds.sort((a, b) => {
        return getGuestsSize(tableAssignments[a].guests) - getGuestsSize(tableAssignments[b].guests);
    });

    const mergedTableIds = new Set<string>();

    for (let i = 0; i < standardTableIds.length; i++) {
        const idA = standardTableIds[i];
        if (mergedTableIds.has(idA)) continue;

        const tableA = tableAssignments[idA];
        const sizeA = getGuestsSize(tableA.guests);

        // Don't touch full tables
        if (sizeA >= tableA.capacity) continue;

        // Try to find a partner
        for (let j = i + 1; j < standardTableIds.length; j++) {
            const idB = standardTableIds[j];
            if (mergedTableIds.has(idB)) continue;

            const tableB = tableAssignments[idB];
            const sizeB = getGuestsSize(tableB.guests);

            // Check if they fit together
            if (sizeA + sizeB <= tableA.capacity) { // Assuming both have same capacity usually
                // MERGE B into A
                tableA.guests = [...tableA.guests, ...tableB.guests];
                tableA.side = 'both'; // Mark as mixed

                // Update assignment helper (will be done in final mapping anyway, but good for tracking)
                // We actually need to clear tableB so it doesn't get outputted
                delete tableAssignments[idB];
                mergedTableIds.add(idB);

                // Update sizeA for potential further merges? (Greedy: one merge per table A for simplicity, or continue)
                // Let's break to keep it simple and safe for now.
                break;
            }
        }
    }

    onProgress(100, 'הושבה הושלמה!');

    // Re-generate assignments map from the final tables to ensure it reflects merges
    const finalAssignment: Assignment = {};
    const resultTables = Object.entries(tableAssignments).map(([id, table]) => {
        // Update assignment for all guests in this table
        table.guests.forEach(g => {
            finalAssignment[g.id] = id;
        });

        return {
            id,
            ...table
        };
    });

    return {
        assignments: finalAssignment,
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
