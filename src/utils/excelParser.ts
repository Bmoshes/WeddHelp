import * as XLSX from 'xlsx';
import { ExcelColumnMapping, ExcelData, Guest } from '../types';
import { autoDetectColumns, parseAge, parseCategory, parseSide, validateMapping, parseAmount } from './columnMapper';

/**
 * Validate file type and size
 */
export const validateExcelFile = (file: File): { valid: boolean; error?: string } => {


    // Check extension
    const extension = file.name.split('.').pop()?.toLowerCase();
    const validExtensions = ['xlsx', 'xls', 'csv'];

    if (!validExtensions.includes(extension || '')) {
        return { valid: false, error: 'סוג קובץ לא נתמך. אנא העלה קובץ Excel או CSV.' };
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        return { valid: false, error: 'הקובץ גדול מדי. הגודל המקסימלי הוא 5MB.' };
    }

    return { valid: true };
};

/**
 * Read and parse Excel/CSV file
 */
export const parseExcelFile = async (file: File): Promise<ExcelData> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                // Convert to JSON (Array of Objects)
                // Using header: 0 (default) or not specifying 'header' option attempts to match keys to header row
                // However, sheet_to_json handles duplicates poorly sometimes. 
                // Let's stick to header: 1 (Array of Arrays) to get pristine headers and data, 
                // but then CONVERT it to objects ourselves to match the Type definition expected by the app.

                const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                if (!rawData || rawData.length === 0) {
                    reject(new Error('קובץ ריק'));
                    return;
                }

                const headers = rawData[0] as string[];
                const rowsArray = rawData.slice(1) as any[][]; // The data rows

                // Convert array rows to object rows using headers
                const objectRows: Record<string, unknown>[] = rowsArray.map(row => {
                    const obj: Record<string, unknown> = {};
                    headers.forEach((header, index) => {
                        obj[header] = row[index];
                    });
                    return obj;
                });

                // Remove completely empty rows
                const cleanRows = objectRows.filter(row =>
                    Object.values(row).some(v => v !== undefined && v !== '' && v !== null)
                );

                if (cleanRows.length === 0) {
                    reject(new Error('לא נמצאו שורות מידע בקובץ'));
                    return;
                }

                // Auto-detect columns
                const { mapping, confidence } = autoDetectColumns(headers);

                resolve({
                    fileName: file.name,
                    headers,
                    rows: cleanRows,
                    mapping,
                    confidence
                });

            } catch (error) {
                console.error(error);
                reject(new Error('שגיאה בקריאת הקובץ'));
            }
        };

        reader.onerror = () => reject(new Error('שגיאה בקריאת הקובץ'));
        reader.readAsBinaryString(file);
    });
};

/**
 * Process raw excel data into Guest objects based on mapping
 */
export const processGuests = (data: ExcelData, mapping: ExcelColumnMapping): Guest[] => {
    const { valid, errors } = validateMapping(mapping);
    if (!valid) {
        throw new Error(errors.join('\n'));
    }

    const guests: Guest[] = data.rows.map((row) => {
        // Helper to safely get string value
        const getString = (key: string | undefined): string => {
            if (!key) return '';
            const val = row[key];
            if (val === undefined || val === null) return '';
            return String(val).trim();
        };

        const name = getString(mapping.name);
        if (!name) return null;

        // Parse category
        const rawCategory = getString(mapping.category);
        const category = parseCategory(rawCategory);

        // Parse side
        const rawSide = getString(mapping.side);
        const side = parseSide(rawSide);

        // Parse groupId
        let groupId = getString(mapping.groupId);

        // Smart fallback: If no explicit groupId is provided, but we have a category string (e.g. "חברים מהצבא" or "משפחה כהן"),
        // use that entire string as the groupId. This preserves sub-groups.
        if (!groupId && rawCategory.length > 0) {
            groupId = rawCategory;
        }

        const age = mapping.age ? parseAge(row[mapping.age]) : undefined;
        // Parse amount
        const amount = mapping.amount ? parseAmount(row[mapping.amount]) : 1;

        const notes = getString(mapping.notes);
        const phoneNumber = getString(mapping.phoneNumber);

        return {
            id: crypto.randomUUID() as string,
            name,
            category,
            side,
            groupId, // Using the smart groupId
            tableId: undefined,
            age,
            phoneNumber: phoneNumber || undefined,
            notes: notes || undefined,
            amount,
            conflictsWith: [],
        };
    }).filter((g) => g !== null) as Guest[];

    return guests;
};
