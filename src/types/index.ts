export type { Guest, GuestCategory, GuestSide, GuestGroup } from './guest';
export type { Table, SeatingState, OptimizationProgress } from './table';

export interface ExcelColumnMapping {
    name?: string;
    category?: string;
    side?: string;
    groupId?: string;
    phoneNumber?: string;
    age?: string;
    notes?: string;
}

export interface ExcelData {
    fileName: string;
    headers: string[];
    rows: Record<string, unknown>[];
    mapping: ExcelColumnMapping;
    confidence: Record<keyof ExcelColumnMapping, number>;
}
