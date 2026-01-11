export type GuestCategory = 'family' | 'friend' | 'colleague' | 'other';
export type GuestSide = 'groom' | 'bride' | 'both';

export interface Guest {
    id: string;
    name: string;
    category: GuestCategory;
    side: GuestSide;
    groupId?: string; // For family grouping - contains specific name like "Friends Army"
    tableId?: string; // Current table assignment
    age?: number;
    phoneNumber?: string;
    notes?: string;
    amount?: number; // Number of seats needed (default 1)
    conflictsWith: string[]; // Array of guest IDs
}

export interface GuestGroup {
    groupId: string;
    guests: Guest[];
    size: number;
    dominantSide: GuestSide;
    dominantCategory: GuestCategory;
    averageAge?: number;
}
