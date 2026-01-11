import { ExcelColumnMapping, GuestCategory, GuestSide } from '../types';

/**
 * Common Hebrew and English column names for auto-detection
 */
const COLUMN_PATTERNS = {
    name: [
        'שם',
        'שם מלא',
        'שם אורח',
        'שם האורח',
        'name',
        'full name',
        'guest name',
        'fullname',
    ],
    category: [
        'קטגוריה',
        'סוג',
        'יחס',
        'קשר',
        'category',
        'type',
        'relation',
        'relationship',
        'group type',
    ],
    side: [
        'צד',
        'משפחת',
        'חתן/כלה',
        'חתן או כלה',
        'חתן כלה',
        'side',
        'bride/groom',
        'bride or groom',
        'groom/bride',
    ],
    groupId: [
        'קבוצת קשר',
        'משפחה',
        'קבוצה',
        'מזהה משפחה',
        'מזהה קבוצה',
        'קוד משפחה',
        'group',
        'family',
        'family id',
        'group id',
        'groupid',
        'familyid',
    ],
    age: [
        'גיל',
        'age',
    ],
    phoneNumber: [
        'מס\' טלפון',
        'טלפון',
        'phone',
        'mobile',
        'נייד',
        'סלולרי',
        'cellphone',
        'тел',
        'מספר',
        'number',
    ],
    amount: [
        'פלוס כמה',
        '+כמה',
        'כמות',
        'כמה',
        'מספר אנשים',
        'amount',
        'quantity',
        'count',
        'guests',
        'plus',
        'seats',
    ],
    notes: [
        'הערות',
        'מלווים',
        'נלווים',
        'notes',
        'comments',
        'comment',
        'הערה',
        'additional',
    ],
};

/**
 * Auto-detect column mapping based on header names
 */
export function autoDetectColumns(headers: string[]): {
    mapping: ExcelColumnMapping;
    confidence: Record<keyof ExcelColumnMapping, number>;
} {
    const mapping: ExcelColumnMapping = {};
    const confidence: Record<keyof ExcelColumnMapping, number> = {
        name: 0,
        category: 0,
        side: 0,
        groupId: 0,
        age: 0,
        phoneNumber: 0,
        amount: 0,
        notes: 0,
    };

    headers.forEach((header) => {
        const normalizedHeader = header.trim().toLowerCase();

        // Check each field pattern
        (Object.keys(COLUMN_PATTERNS) as Array<keyof typeof COLUMN_PATTERNS>).forEach((field) => {
            const patterns = COLUMN_PATTERNS[field];

            patterns.forEach((pattern, index) => {
                const normalizedPattern = pattern.toLowerCase();

                // Exact match
                if (normalizedHeader === normalizedPattern) {
                    mapping[field] = header;
                    confidence[field] = 100;
                }
                // Partial match (contains)
                else if (normalizedHeader.includes(normalizedPattern) || normalizedPattern.includes(normalizedHeader)) {
                    const score = 70 - (index * 5); // Higher score for earlier patterns
                    if (score > confidence[field]) {
                        mapping[field] = header;
                        confidence[field] = score;
                    }
                }
            });
        });
    });

    return { mapping, confidence };
}

/**
 * Parse category from string value
 */
export function parseCategory(value: unknown): GuestCategory {
    if (!value) return 'other';

    const str = String(value).toLowerCase().trim();

    // Family variations
    if (str.includes('משפחה') || str.includes('family') || str.includes('קרוב') ||
        str.includes('משפחתי') || str.includes('קרובה')) {
        return 'family';
    }

    // Friend variations
    if (str.includes('חבר') || str.includes('friend') || str.includes('ידיד') ||
        str.includes('חברה') || str.includes('ידידה')) {
        return 'friend';
    }

    // Colleague variations
    if (str.includes('עבודה') || str.includes('colleague') || str.includes('עמית') ||
        str.includes('עבודתי') || str.includes('קולגה')) {
        return 'colleague';
    }

    return 'other';
}

/**
 * Parse side from string value
 */
export function parseSide(value: unknown): GuestSide {
    if (!value) return 'both';

    const str = String(value).toLowerCase().trim();

    // Groom variations (including single letter)
    if (str.includes('חתן') || str.includes('groom') || str === 'ח') {
        return 'groom';
    }

    // Bride variations (including single letter)
    if (str.includes('כלה') || str.includes('bride') || str === 'כ') {
        return 'bride';
    }

    // Both/mutual
    if (str.includes('שניהם') || str.includes('both') || str.includes('משותף') ||
        str.includes('ח+כ') || str.includes('כ+ח')) {
        return 'both';
    }

    return 'both';
}

/**
 * Parse age from string value
 */
export function parseAge(value: unknown): number | undefined {
    if (!value) return undefined;

    const num = Number(value);
    if (isNaN(num) || num < 0 || num > 120) {
        return undefined;
    }

    return Math.floor(num);
}

/**
 * Parse amount from string value
 */
export function parseAmount(value: unknown): number {
    if (!value) return 1;

    const num = Number(value);
    if (isNaN(num) || num < 0 || num > 20) {
        // Fallback for text like "plus 1"
        const str = String(value).toLowerCase();
        if (str.includes('+1') || str.includes('plus 1')) return 2;
        if (str.includes('+2') || str.includes('plus 2')) return 3;
        return 1;
    }

    // If it's a "plus how many" column, usually 0 means just the guest (1 seat),
    // 1 means guest + 1 (2 seats), etc.
    // However, sometimes user enters total seats.
    // Let's assume if column name is "plus..." it adds to 1.
    // BUT simplest logic: if value is small number (0-10), treat as ADDITION if column header implies "plus"?
    // User said "if written 2 means 2 seats". So we trust the number directly.

    // Correction based on user input: "if written 2 sign that need 2 chairs"
    return Math.max(1, Math.floor(num));
}

/**
 * Validate that required columns are mapped
 */
export function validateMapping(mapping: ExcelColumnMapping): {
    valid: boolean;
    errors: string[];
} {
    const errors: string[] = [];

    if (!mapping.name) {
        errors.push('חובה למפות עמודת "שם"');
    }

    // Category and side are optional but recommended
    if (!mapping.category) {
        console.warn('Column "category" not mapped - will default to "other"');
    }

    if (!mapping.side) {
        console.warn('Column "side" not mapped - will default to "both"');
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}
