import { describe, it, expect } from 'vitest';
import { parsePhoneNumber } from '../utils/columnMapper';

describe('parsePhoneNumber', () => {
    it('preserves leading zero', () => {
        expect(parsePhoneNumber('050-1234567')).toBe('050-1234567');
    });

    it('preserves hyphens', () => {
        expect(parsePhoneNumber('054-9876543')).toBe('054-9876543');
    });

    it('trims surrounding whitespace', () => {
        expect(parsePhoneNumber('  050-1234567  ')).toBe('050-1234567');
    });

    it('converts numeric input to string without stripping zeros', () => {
        // When Excel stores phone as a number, leading zero is lost by Excel itself,
        // but we must not additionally strip any zeros.
        expect(parsePhoneNumber(501234567)).toBe('501234567');
    });

    it('returns empty string for empty/null/undefined', () => {
        expect(parsePhoneNumber('')).toBe('');
        expect(parsePhoneNumber(null)).toBe('');
        expect(parsePhoneNumber(undefined)).toBe('');
    });
});
