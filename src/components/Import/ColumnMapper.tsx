import React, { useState, useEffect } from 'react';
import { Modal } from '../shared/Modal';
import { Button } from '../shared/Button';
import { ExcelColumnMapping, ExcelData, Guest } from '../../types';
import { autoDetectColumns, validateMapping, parseCategory, parseSide, parseAge } from '../../utils/columnMapper';
import { useSeatingStore } from '../../store/seatingStore';

interface ColumnMapperProps {
    isOpen: boolean;
    onClose: () => void;
    excelData: ExcelData;
}

export const ColumnMapper: React.FC<ColumnMapperProps> = ({
    isOpen,
    onClose,
    excelData,
}) => {
    const { importGuests } = useSeatingStore();
    const [mapping, setMapping] = useState<ExcelColumnMapping>({});
    const [confidence, setConfidence] = useState<Record<string, number>>({});
    const [errors, setErrors] = useState<string[]>([]);

    useEffect(() => {
        if (isOpen && excelData.headers.length > 0) {
            const { mapping: autoMapping, confidence: autoConfidence } = autoDetectColumns(excelData.headers);
            setMapping(autoMapping);
            setConfidence(autoConfidence);
        }
    }, [isOpen, excelData]);

    const handleMappingChange = (field: keyof ExcelColumnMapping, value: string) => {
        setMapping((prev) => ({
            ...prev,
            [field]: value || undefined,
        }));
        setErrors([]);
    };

    const handleImport = () => {
        // Validate mapping
        const validation = validateMapping(mapping);
        if (!validation.valid) {
            setErrors(validation.errors);
            return;
        }

        // Parse and import guests with enhanced logic
        const guests = excelData.rows
            .map((row) => {
                const name = mapping.name ? String(row[mapping.name] || '') : '';
                if (!name.trim()) return null; // Skip empty rows

                // Safe parsing helpers
                const rawCategory = mapping.category ? String(row[mapping.category] || '').trim() : '';
                const category = parseCategory(rawCategory);

                const rawSide = mapping.side ? String(row[mapping.side] || '').trim() : '';
                const side = parseSide(rawSide);

                // Smart Group ID Logic:
                // 1. Try explicit groupId mapping
                let groupId = mapping.groupId ? String(row[mapping.groupId] || '').trim() : '';

                // 2. Fallback: use category column text (e.g. "Family Cohen") as groupId if missing
                if (!groupId && rawCategory.length > 0) {
                    groupId = rawCategory;
                }

                return {
                    name: name.trim(),
                    category,
                    side,
                    groupId: groupId || undefined, // Store the specific group name (e.g., "Friend - Army")
                    age: mapping.age ? parseAge(row[mapping.age]) : undefined,
                    phoneNumber: mapping.phoneNumber ? String(row[mapping.phoneNumber] || '') : undefined,
                    notes: mapping.notes ? String(row[mapping.notes] || '') : undefined,
                };
            })
            .filter((g) => g !== null) as Omit<Guest, 'id' | 'conflictsWith'>[];

        importGuests(guests);
        alert(`${guests.length} אורחים יובאו בהצלחה!`);
        onClose();
    };

    const renderFieldMapper = (
        field: keyof ExcelColumnMapping,
        label: string,
        required: boolean = false
    ) => {
        const currentValue = mapping[field] || '';
        const confidenceScore = confidence[field] || 0;

        return (
            <div key={field} className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                    {required && <span className="text-red-500 mr-1">*</span>}
                    {confidenceScore > 0 && (
                        <span className="text-xs text-gray-500 mr-2">
                            (זוהה אוטומטית: {confidenceScore}%)
                        </span>
                    )}
                </label>
                <select
                    value={currentValue}
                    onChange={(e) => handleMappingChange(field, e.target.value)}
                    className="input"
                >
                    <option value="">-- לא ממופה --</option>
                    {excelData.headers.map((header) => (
                        <option key={header} value={header}>
                            {header}
                        </option>
                    ))}
                </select>

                {/* Preview sample data */}
                {currentValue && excelData.rows.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                        דוגמה: {String(excelData.rows[0][currentValue] || '')}
                    </p>
                )}
            </div>
        );
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="מיפוי עמודות" maxWidth="lg">
            <div className="space-y-4">
                <p className="text-gray-600">
                    מפה את העמודות מקובץ ה-Excel לשדות המערכת. זיהוי אוטומטי בוצע, אך ניתן לשנות ידנית.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderFieldMapper('name', 'שם אורח', true)}
                    <div className="relative">
                        {renderFieldMapper('category', 'קטגוריה / קבוצה', false)}
                        <p className="text-[10px] text-stone-500 absolute top-0 left-0 ml-1 mt-1 bg-yellow-50 px-1 border border-yellow-100 rounded">
                            טיפ: בחר כאן את העמודה עם שם הקבוצה המלא (למשל: "חברים ריבר")
                        </p>
                    </div>
                    {renderFieldMapper('side', 'צד (חתן/כלה)', false)}
                    {renderFieldMapper('phoneNumber', 'טלפון', false)}
                    {renderFieldMapper('groupId', 'מזהה משפחה (אופציונלי)', false)}
                    {renderFieldMapper('age', 'גיל', false)}
                    {renderFieldMapper('notes', 'הערות', false)}
                </div>

                {errors.length > 0 && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="font-semibold text-red-800 mb-2">שגיאות:</p>
                        <ul className="list-disc list-inside text-red-700">
                            {errors.map((error, idx) => (
                                <li key={idx}>{error}</li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                    <Button variant="secondary" onClick={onClose}>
                        ביטול
                    </Button>
                    <Button variant="primary" onClick={handleImport}>
                        ייבוא {excelData.rows.length} אורחים
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
