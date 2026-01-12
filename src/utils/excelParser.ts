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
 * Helper to check if a header looks like an Amount/Quantity column
 */
const isAmountHeader = (header: string): boolean => {
    const h = header.trim().toLowerCase();
    return ['כמות', 'כמה', 'מספר', 'quantity', 'amount', 'count'].some(k => h.includes(k));
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

                const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                if (!rawData || rawData.length === 0) {
                    reject(new Error('קובץ ריק'));
                    return;
                }

                const headers = rawData[0] as string[];
                const rowsArray = rawData.slice(1) as any[][]; // The data rows

                // Check for "Dynamic Pairs" structure
                // Heuristic: If we see multiple "Amount" headers, or if the second column is "Amount".
                // The user's image shows: Name | Amount | Name | Amount ...
                const amountHeaderCount = headers.filter(h => isAmountHeader(h)).length;

                // If we have multiple amount headers, it's likely the paired structure
                if (amountHeaderCount > 1) {
                    console.log('Detected Dynamic Pair Structure');
                    try {
                        const guestList = parseDynamicPairs(headers, rowsArray);
                        resolve({
                            fileName: file.name,
                            headers: ['Name', 'Category', 'Amount'], // Dummy headers for display 
                            // Normlize the data into a standard list of objects {name, amount, category}
                            // We use 'Name', 'Category', 'Amount' keys to match the headers above,
                            // so that 'autoDetectColumns' in ColumnMapper will naturally match them.
                            rows: guestList.map(g => ({
                                'Name': g.name,
                                'Amount': g.amount,
                                'Category': g.category,
                                // We don't strictly need 'Group' key because ColumnMapper falls back to Category as GroupId
                            })),
                            mapping: {
                                name: 'Name',
                                amount: 'Amount',
                                category: 'Category',
                                side: 'TempSide', // will be undefined/default
                                groupId: 'Category', // Map groupId to Category explicitly just in case
                            },
                            confidence: { name: 100, amount: 100, category: 100, side: 0, groupId: 100, age: 0, phoneNumber: 0, notes: 0 }
                        });
                        return;
                    } catch (err) {
                        console.error('Failed to parse dynamic pairs, falling back to standard', err);
                    }
                }

                // --- Standard Parsing Logic (Old Code) ---

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
 * Logic to parse "Group Name | Amount" column pairs
 */
const parseDynamicPairs = (headers: string[], rows: any[][]): Array<{ name: string, amount: number, category: string }> => {
    const guests: Array<{ name: string, amount: number, category: string }> = [];

    // Identify pairs
    for (let i = 0; i < headers.length; i++) {
        const currentHeader = headers[i];

        // Check if next column is "Amount"
        // We look for pairs where the right column is "Amount"
        // The left column (current) is the "Category/Group Name"

        // Boundary check
        if (i + 1 >= headers.length) break;

        const nextHeader = headers[i + 1];
        if (isAmountHeader(nextHeader)) {
            // Found a pair: Headers[i] is Category, Headers[i+1] is Amount
            const category = currentHeader.trim();

            // Iterate all rows for this specific pair
            rows.forEach(row => {
                const nameVal = row[i];
                const amountVal = row[i + 1];

                if (nameVal && typeof nameVal === 'string' && nameVal.trim() !== '') {
                    const amount = parseAmount(amountVal);
                    guests.push({
                        name: nameVal.trim(),
                        amount: amount,
                        category: category
                    });
                }
            });

            // Skip the next column since we consumed it as 'Amount'
            i++;
        }
    }

    return guests;
};

/**
 * Process raw excel data into Guest objects based on mapping
 */
export const processGuests = (data: ExcelData, mapping: ExcelColumnMapping): Guest[] => {
    // If we have pre-normalized headers (from Dynamic Pair Mode), validation is trivial
    // But we should still run it standardly.

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
        // If we are in "Dynamic Mode", the parsed category is passed via 'mapping.category' key
        // which might be 'TempCategory'. The value in 'row' IS the category name already.
        // But 'parseCategory' function tries to map string -> enum (family, friend, etc).
        // The user used "מוזמנים חברים" (Invited Friends), "עבודה דביר" (Work Dvir).
        // parseCategory logic: includes 'חבר' -> friend, 'עבודה' -> colleague.
        // So it should still work fine!
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
        const rawPhone = getString(mapping.phoneNumber);
        const phoneNumber = rawPhone ? rawPhone.replace(/^0+/, '').replace(/-/g, '') : '';

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
