import { create } from 'zustand';
import { Guest, Table, SeatingState, OptimizationProgress } from '../types';

interface SeatingStore extends SeatingState {
    optimizationProgress: OptimizationProgress;

    // Guest actions
    addGuest: (guest: Omit<Guest, 'id'>) => void;
    updateGuest: (id: string, updates: Partial<Guest>) => void;
    removeGuest: (id: string) => void;
    importGuests: (guests: Omit<Guest, 'id' | 'conflictsWith'>[]) => void;

    // Table actions
    addTable: (capacity: number) => void;
    removeTable: (id: string) => void;
    updateTable: (id: string, updates: Partial<Table>) => void;

    // Assignment actions
    assignGuestToTable: (guestId: string, tableId: string) => void;
    unassignGuest: (guestId: string) => void;

    // Conflict actions
    addConflict: (guest1Id: string, guest2Id: string) => void;
    removeConflict: (guest1Id: string, guest2Id: string) => void;

    // Group actions
    createGroup: (name: string, guestIds: string[]) => void;
    updateGroup: (groupId: string, guestIds: string[]) => void;
    removeGroup: (groupId: string) => void;

    // Optimization
    setOptimizationProgress: (progress: Partial<OptimizationProgress>) => void;
    applyOptimizedSeating: (assignments: Record<string, string>) => void; // guestId -> tableId

    // Utility
    resetAll: () => void;
    getUnseatedGuests: () => Guest[];
    getSeatingProgress: () => { seated: number; total: number; percentage: number };
    exportData: () => SeatingState;
    importData: (data: SeatingState) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 11);

const initialState: SeatingState = {
    guests: [],
    tables: [],
    conflicts: [],
    groups: {},
};

export const useSeatingStore = create<SeatingStore>((set, get) => ({
    ...initialState,
    optimizationProgress: {
        isRunning: false,
        progress: 0,
        currentIteration: 0,
        totalIterations: 0,
        message: '',
    },

    // Guest actions
    addGuest: (guestData) => {
        const guest: Guest = {
            ...guestData,
            id: generateId(),
            conflictsWith: [],
        };
        set((state) => ({
            guests: [...state.guests, guest],
        }));
    },

    updateGuest: (id, updates) => {
        set((state) => ({
            guests: state.guests.map((g) =>
                g.id === id ? { ...g, ...updates } : g
            ),
        }));
    },

    removeGuest: (id) => {
        set((state) => ({
            guests: state.guests.filter((g) => g.id !== id),
            conflicts: state.conflicts.filter(([a, b]) => a !== id && b !== id),
            groups: Object.fromEntries(
                Object.entries(state.groups).map(([groupId, guestIds]) => [
                    groupId,
                    guestIds.filter((gId) => gId !== id),
                ])
            ),
            tables: state.tables.map((t) => ({
                ...t,
                assignedGuests: t.assignedGuests.filter((gId) => gId !== id),
            })),
        }));
    },

    importGuests: (guestsData) => {
        const newGuests: Guest[] = guestsData.map((guestData) => ({
            ...guestData,
            id: generateId(),
            conflictsWith: [],
        }));
        set((state) => ({
            guests: [...state.guests, ...newGuests],
        }));
    },

    // Table actions
    addTable: (capacity) => {
        const table: Table = {
            id: generateId(),
            number: get().tables.length + 1,
            capacity,
            assignedGuests: [],
        };
        set((state) => ({
            tables: [...state.tables, table],
        }));
    },

    removeTable: (id) => {
        const table = get().tables.find((t) => t.id === id);
        if (table) {
            // Unassign all guests from this table
            set((state) => ({
                tables: state.tables.filter((t) => t.id !== id),
                guests: state.guests.map((g) =>
                    g.tableId === id ? { ...g, tableId: undefined } : g
                ),
            }));

            // Renumber tables
            set((state) => ({
                tables: state.tables.map((t, index) => ({ ...t, number: index + 1 })),
            }));
        }
    },

    updateTable: (id, updates) => {
        set((state) => ({
            tables: state.tables.map((t) =>
                t.id === id ? { ...t, ...updates } : t
            ),
        }));
    },

    // Assignment actions
    assignGuestToTable: (guestId, tableId) => {
        const table = get().tables.find((t) => t.id === tableId);
        const guest = get().guests.find((g) => g.id === guestId);

        if (!table || !guest) return;

        // Check capacity
        if (table.assignedGuests.length >= table.capacity) {
            alert('השולחן מלא!');
            return;
        }

        // Unassign from previous table if any
        if (guest.tableId) {
            get().unassignGuest(guestId);
        }

        // Assign to new table
        set((state) => ({
            guests: state.guests.map((g) =>
                g.id === guestId ? { ...g, tableId } : g
            ),
            tables: state.tables.map((t) =>
                t.id === tableId
                    ? { ...t, assignedGuests: [...t.assignedGuests, guestId] }
                    : t
            ),
        }));
    },

    unassignGuest: (guestId) => {
        const guest = get().guests.find((g) => g.id === guestId);
        if (!guest || !guest.tableId) return;

        set((state) => ({
            guests: state.guests.map((g) =>
                g.id === guestId ? { ...g, tableId: undefined } : g
            ),
            tables: state.tables.map((t) =>
                t.id === guest.tableId
                    ? { ...t, assignedGuests: t.assignedGuests.filter((id) => id !== guestId) }
                    : t
            ),
        }));
    },

    // Conflict actions
    addConflict: (guest1Id, guest2Id) => {
        if (guest1Id === guest2Id) return;

        const conflictExists = get().conflicts.some(
            ([a, b]) => (a === guest1Id && b === guest2Id) || (a === guest2Id && b === guest1Id)
        );

        if (conflictExists) return;

        set((state) => ({
            conflicts: [...state.conflicts, [guest1Id, guest2Id]],
            guests: state.guests.map((g) => {
                if (g.id === guest1Id) {
                    return { ...g, conflictsWith: [...g.conflictsWith, guest2Id] };
                }
                if (g.id === guest2Id) {
                    return { ...g, conflictsWith: [...g.conflictsWith, guest1Id] };
                }
                return g;
            }),
        }));
    },

    removeConflict: (guest1Id, guest2Id) => {
        set((state) => ({
            conflicts: state.conflicts.filter(
                ([a, b]) => !((a === guest1Id && b === guest2Id) || (a === guest2Id && b === guest1Id))
            ),
            guests: state.guests.map((g) => {
                if (g.id === guest1Id) {
                    return { ...g, conflictsWith: g.conflictsWith.filter((id) => id !== guest2Id) };
                }
                if (g.id === guest2Id) {
                    return { ...g, conflictsWith: g.conflictsWith.filter((id) => id !== guest1Id) };
                }
                return g;
            }),
        }));
    },

    // Group actions
    createGroup: (_name, guestIds) => {
        const groupId = generateId();
        set((state) => ({
            groups: { ...state.groups, [groupId]: guestIds },
            guests: state.guests.map((g) =>
                guestIds.includes(g.id) ? { ...g, groupId } : g
            ),
        }));
    },

    updateGroup: (groupId, guestIds) => {
        set((state) => ({
            groups: { ...state.groups, [groupId]: guestIds },
            guests: state.guests.map((g) => {
                if (guestIds.includes(g.id)) {
                    return { ...g, groupId };
                }
                if (g.groupId === groupId) {
                    return { ...g, groupId: undefined };
                }
                return g;
            }),
        }));
    },

    removeGroup: (groupId) => {
        set((state) => ({
            groups: Object.fromEntries(
                Object.entries(state.groups).filter(([id]) => id !== groupId)
            ),
            guests: state.guests.map((g) =>
                g.groupId === groupId ? { ...g, groupId: undefined } : g
            ),
        }));
    },

    // Optimization
    setOptimizationProgress: (progress) => {
        set((state) => ({
            optimizationProgress: { ...state.optimizationProgress, ...progress },
        }));
    },

    applyOptimizedSeating: (assignments) => {
        set((state) => {
            // Build new table assignments
            const newTableAssignments: Record<string, string[]> = {};
            state.tables.forEach((table) => {
                newTableAssignments[table.id] = [];
            });

            // Fill assignments
            Object.entries(assignments).forEach(([guestId, tableId]) => {
                if (newTableAssignments[tableId]) {
                    newTableAssignments[tableId].push(guestId);
                }
            });

            // Update tables with new assignments
            const updatedTables = state.tables.map((t) => ({
                ...t,
                assignedGuests: newTableAssignments[t.id] || []
            }));

            // Update guests with new table assignments
            const updatedGuests = state.guests.map((g) => ({
                ...g,
                tableId: assignments[g.id] || undefined
            }));

            return {
                tables: updatedTables,
                guests: updatedGuests,
            };
        });
    },

    // Utility
    resetAll: () => {
        set(initialState);
    },

    getUnseatedGuests: () => {
        return get().guests.filter((g) => !g.tableId);
    },

    getSeatingProgress: () => {
        const { guests } = get();
        const seated = guests.filter((g) => g.tableId).length;
        const total = guests.length;
        const percentage = total > 0 ? Math.round((seated / total) * 100) : 0;
        return { seated, total, percentage };
    },

    exportData: () => {
        const { guests, tables, conflicts, groups } = get();
        return { guests, tables, conflicts, groups };
    },

    importData: (data) => {
        set({
            guests: data.guests,
            tables: data.tables,
            conflicts: data.conflicts,
            groups: data.groups,
        });
    },
}));
