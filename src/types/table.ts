import { Guest } from './guest';

export interface Table {
    id: string;
    number: number;
    capacity: number;
    assignedGuests: string[]; // Guest IDs
    preferredSide?: 'groom' | 'bride' | 'mixed';
}

export interface SeatingState {
    guests: Guest[];
    tables: Table[];
    conflicts: Array<[string, string]>; // Pairs of conflicting guest IDs
    groups: Record<string, string[]>; // Group ID -> Guest IDs
}

export interface OptimizationProgress {
    isRunning: boolean;
    progress: number; // 0-100
    currentIteration: number;
    totalIterations: number;
    message: string;
}
