import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { useSeatingStore } from '../../store/seatingStore';
import { Button } from '../shared/Button';
import { FileUpload } from '../Import/FileUpload';
import { ColumnMapper } from '../Import/ColumnMapper';
import { ExcelData } from '../../types';
import { optimizeSeating } from '../../utils/seatingAlgorithm';

export const StatusBar: React.FC = () => {
    const {
        guests,
        tables,
        getSeatingProgress,
        resetAll,
        optimizationProgress,
        setOptimizationProgress,
        applyOptimizedSeating,
        importData,
        addTable,
        removeTable,
    } = useSeatingStore();

    const [showImport, setShowImport] = useState(false);
    const [excelData, setExcelData] = useState<ExcelData | null>(null);
    const [showColumnMapper, setShowColumnMapper] = useState(false);

    const progress = getSeatingProgress();

    const handleExcelParsed = (data: ExcelData) => {
        setExcelData(data);
        setShowImport(false);
        setShowColumnMapper(true);
    };

    const handleExcelExport = () => {
        // Prepare data for export
        const exportData = guests.map(guest => {
            const assignedTable = tables.find(t => t.id === guest.tableId);

            const sideHebrew: Record<string, string> = { groom: 'חתן', bride: 'כלה', both: 'שניהם' };
            const categoryHebrew: Record<string, string> = { family: 'משפחה', friend: 'חבר', colleague: 'עבודה', other: 'אחר' };

            const sideText = sideHebrew[guest.side] || guest.side;
            const categoryText = categoryHebrew[guest.category] || guest.category;

            return {
                rawGuest: guest, // Keep for sorting
                rawTableNumber: assignedTable ? assignedTable.number : 9999, // Unseated at end
                data: {
                    'מספר שולחן': assignedTable ? assignedTable.number : 'לא שובץ',
                    'שם': guest.name,
                    'טלפון': guest.phoneNumber || '',
                    'קטגוריה': categoryText,
                    'קרבה': '',
                    'צד': sideText,
                    'קבוצת קשר': guest.groupId || '',
                    'כמות מוזמנים': 1 + (guest.notes && guest.notes.includes('+') ? parseInt(guest.notes.replace(/\D/g, '')) || 0 : 0),
                    'הערות': guest.notes || ''
                }
            };
        });

        // SORT logic: Table Number -> Group ID -> Name
        exportData.sort((a, b) => {
            // 1. Sort by Table Number
            if (a.rawTableNumber !== b.rawTableNumber) {
                return a.rawTableNumber - b.rawTableNumber;
            }
            // 2. Sort by Group ID (groups sit together)
            const groupA = a.rawGuest.groupId || '';
            const groupB = b.rawGuest.groupId || '';
            if (groupA !== groupB) {
                return groupA.localeCompare(groupB);
            }
            // 3. Sort by Name
            return a.rawGuest.name.localeCompare(b.rawGuest.name, 'he');
        });

        // Create worksheet from sorted data
        const finalData = exportData.map(item => item.data);
        const ws = XLSX.utils.json_to_sheet(finalData);

        // Auto-width for columns
        const wscols = [
            { wch: 10 }, // Table Num
            { wch: 20 }, // Name
            { wch: 15 }, // Phone
            { wch: 10 }, // Category
            { wch: 10 }, // Relationship
            { wch: 10 }, // Side
            { wch: 15 }, // Group
            { wch: 10 }, // Count
            { wch: 30 }  // Notes
        ];
        ws['!cols'] = wscols;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Seating Plan");

        // Generate file name with date
        const date = new Date().toLocaleDateString('he-IL').replace(/\./g, '-');
        XLSX.writeFile(wb, `Seating_Plan_${date}.xlsx`);
    };

    const handleDownloadTemplate = () => {
        // Create template data with headers matching user's request
        const templateData = [
            {
                'חתן/כלה': 'חתן',
                'קבוצת קשר': 'חברים מהצבא',
                'שם': 'ישראל ישראלי',
                'מס\' טלפון': '050-1234567',
                'פלוס כמה': '2'
            },
            {
                'חתן/כלה': 'כלה',
                'קבוצת קשר': 'דודים',
                'שם': 'משה כהן',
                'מס\' טלפון': '054-9876543',
                'פלוס כמה': '0'
            }
        ];

        const ws = XLSX.utils.json_to_sheet(templateData);

        // set column widths
        ws['!cols'] = [
            { wch: 10 }, // Side
            { wch: 20 }, // Group
            { wch: 20 }, // Name
            { wch: 15 }, // Phone
            { wch: 10 }  // Plus
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "תבנית לאורחים");
        XLSX.writeFile(wb, "template_guests.xlsx");
    };

    const handleOptimize = async () => {
        if (guests.length === 0) {
            alert('אין אורחים להושיב');
            return;
        }

        // 1. Ask for Standard Table Capacity
        const standardCapacityInput = prompt('כמה מקומות בשולחן רגיל? (ברירת מחדל: 12)', '12');
        if (!standardCapacityInput) return; // User cancelled

        const standardCapacity = parseInt(standardCapacityInput);
        if (isNaN(standardCapacity) || standardCapacity < 1 || standardCapacity > 50) {
            alert('גודל שולחן לא תקין. אנא הזן מספר בין 1 ל-50');
            return;
        }

        // 2. Ask for Knight Tables (Long tables for friends)
        let knightConfig = { enabled: false, count: 0, capacity: 0 };
        let knightGroupNames: string[] = [];

        if (confirm('האם יש שולחנות אבירים (שולחנות ארוכים)?\n\nבדרך כלל משמשים לחברים מסוימים.')) {
            const countInput = prompt('כמה שולחנות אבירים יש?');
            if (countInput) {
                const count = parseInt(countInput);
                const capInput = prompt('כמה מקומות בכל שולחן אבירים?', '20');
                const cap = capInput ? parseInt(capInput) : 0;

                if (!isNaN(count) && count > 0 && !isNaN(cap) && cap > 0) {
                    knightConfig = { enabled: true, count, capacity: cap };

                    // Find all potential groups
                    const uniqueGroups = Array.from(new Set(guests
                        .map(g => g.groupId)
                        .filter(id => id && id.length > 0 && !id.startsWith('individual-'))
                    ));

                    if (uniqueGroups.length > 0) {
                        const groupList = uniqueGroups.map(g => `• ${g}`).join('\n');
                        const userInput = prompt(
                            `אילו קבוצות תרצה לשבץ בשולחנות האבירים?\n\nנמצאו הקבוצות הבאות:\n${groupList}\n\nהקלד את שמות הקבוצות (מופרדים בפסיק), או השאר ריק כדי שהאלגוריתם ינסה לנחש:`,
                            ''
                        );

                        if (userInput) {
                            knightGroupNames = userInput.split(',').map(s => s.trim()).filter(s => s.length > 0);
                        }
                    }
                }
            }
        }

        try {
            setOptimizationProgress({
                isRunning: true,
                progress: 0,
                currentIteration: 0,
                totalIterations: 1000,
                message: 'מתחיל אופטימיזציה...',
            });

            // Pass the extracted info to the algorithm
            const result = await optimizeSeating(
                guests,
                tables,
                {
                    tableCapacity: standardCapacity,
                    knightConfig: knightConfig.enabled ? knightConfig : undefined,
                    knightGroupNames, // Pass user choices
                    onProgress: (progress, message) => {
                        setOptimizationProgress({
                            progress: Math.round(progress),
                            message,
                        });
                    },
                }
            );

            // Clear existing tables first
            const oldTables = [...tables];
            oldTables.forEach(table => removeTable(table.id));

            // Create new tables based on EXACT optimization results
            // We use the metadata returned by the algorithm to ensure capacities are correct (including oversized tables)

            // Map the algorithm's temporary IDs to the real store IDs
            const idMapping: Record<string, string> = {};

            // Sort tables by ID number to maintain order (table-0, table-1...)
            const sortedAlgorithmTables = result.tables.sort((a, b) => {
                const numA = parseInt(a.id.replace('table-', ''));
                const numB = parseInt(b.id.replace('table-', ''));
                return numA - numB;
            });

            // SAFETY CHECK: Verify no table exceeds reasonable limits
            const maxAllowedCapacity = Math.max(standardCapacity, knightConfig.capacity, 50);

            // Create tables one by one and record mapping
            for (const algoTable of sortedAlgorithmTables) {
                let capacityToCreate = algoTable.capacity;

                // Safety Cap
                if (capacityToCreate > maxAllowedCapacity) {
                    console.error(`Table ${algoTable.id} has absurd capacity ${capacityToCreate}. Capping at ${maxAllowedCapacity}.`);
                    capacityToCreate = maxAllowedCapacity;
                }

                // Add table with the SPECIFIC capacity decided by the algorithm
                addTable(capacityToCreate);
            }

            // Wait for store update
            await new Promise(resolve => setTimeout(resolve, 200));

            // Get the newly created table IDs from store
            const currentTables = useSeatingStore.getState().tables;
            const actualTables = currentTables.slice(-sortedAlgorithmTables.length);

            if (actualTables.length !== sortedAlgorithmTables.length) {
                console.error('Mismatch in created tables count', actualTables.length, sortedAlgorithmTables.length);
                throw new Error('Table creation failed');
            }

            // Map algo IDs to real IDs
            sortedAlgorithmTables.forEach((algoTable, index) => {
                idMapping[algoTable.id] = actualTables[index].id;
            });

            // Update assignments with real table IDs
            const realAssignments: Record<string, string> = {};
            Object.entries(result.assignments).forEach(([guestId, tempTableId]) => {
                if (idMapping[tempTableId]) {
                    realAssignments[guestId] = idMapping[tempTableId];
                }
            });

            // Apply the seating
            applyOptimizedSeating(realAssignments);

            setOptimizationProgress({
                isRunning: false,
                progress: 100,
                message: 'הושלם!',
            });

            let summary = `✅ אופטימיזציה הושלמה!`;
            if (knightConfig.enabled) {
                const knightCount = sortedAlgorithmTables.filter(t => t.isKnight).length;
                summary += `\n\n🛡️ ${knightCount} שולחנות אבירים`;
            }
            summary += `\n🍽️ ${sortedAlgorithmTables.length} שולחנות סה"כ`;
            summary += `\n👥 ${guests.length} אורחים הושבו`;

            // Alert about oversized tables if any
            const oversizedTables = sortedAlgorithmTables.filter(t => t.capacity > Math.max(standardCapacity, knightConfig.capacity));
            if (oversizedTables.length > 0) {
                summary += `\n\n⚠️ שים לב: נוצרו ${oversizedTables.length} שולחנות חריגים לקבוצות גדולות.`;
            }

            alert(summary);

        } catch (error) {
            console.error('Optimization error:', error);
            alert('שגיאה באופטימיזציה. אנא נסה שוב.');
            setOptimizationProgress({
                isRunning: false,
                progress: 0,
                message: '',
            });
        }
    };

    const handleReset = () => {
        if (confirm('האם למחוק את כל הנתונים? פעולה זו אינה הפיכה.')) {
            resetAll();
        }
    };



    return (
        <>
            <div className="bg-white shadow-sm border border-stone-200 rounded-xl p-6 mb-6">
                <div className="flex items-center justify-between flex-wrap gap-6">
                    {/* Progress */}
                    <div className="flex-1 min-w-[250px]">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-stone-600 tracking-wide">
                                התקדמות הושבה
                            </span>
                            <span className="text-sm font-bold text-amber-600">
                                {progress.seated} / {progress.total}
                                <span className="text-stone-400 font-normal ml-1">({progress.percentage}%)</span>
                            </span>
                        </div>
                        <div className="w-full bg-stone-100 rounded-full h-2.5 overflow-hidden">
                            <div
                                className="bg-gradient-to-r from-amber-400 to-amber-600 h-full rounded-full transition-all duration-500 ease-out shadow-sm"
                                style={{ width: `${progress.percentage}% ` }}
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 flex-wrap items-center">
                        <Button
                            variant="secondary"
                            className="border-stone-200 hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50 text-stone-600"
                            onClick={handleDownloadTemplate}
                        >
                            <span className="ml-2">📋</span> הורד תבנית
                        </Button>

                        <Button
                            variant="secondary"
                            className="border-stone-200 hover:border-amber-400 hover:text-amber-700 hover:bg-amber-50 text-stone-600"
                            onClick={() => setShowImport(true)}
                        >
                            <span className="ml-2">📊</span> ייבוא Excel
                        </Button>

                        <Button
                            variant="secondary"
                            onClick={handleExcelExport}
                            className="border-stone-200 hover:border-green-400 hover:text-green-700 hover:bg-green-50 text-stone-600"
                        >
                            <span className="ml-2">📥</span> יצוא לאקסל
                        </Button>

                        <div className="h-8 w-px bg-stone-200 mx-1 hidden md:block"></div>

                        <Button
                            variant="primary"
                            onClick={handleOptimize}
                            disabled={optimizationProgress.isRunning}
                            className="bg-slate-800 hover:bg-slate-700 text-white shadow-lg hover:shadow-xl transition-all"
                        >
                            {optimizationProgress.isRunning ? '⏳ מעבד...' : '✨ אופטימיזציה אוטומטית'}
                        </Button>

                        <div className="relative group">
                            <Button variant="danger" className="opacity-70 hover:opacity-100" onClick={handleReset}>
                                🗑️
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Optimization progress */}
                {optimizationProgress.isRunning && (
                    <div className="mt-6 p-4 bg-amber-50 border border-amber-100 rounded-lg animate-pulse">
                        <p className="text-sm font-medium text-amber-900 mb-2 flex items-center">
                            <span className="animate-spin ml-2">⚙️</span>
                            {optimizationProgress.message}
                        </p>
                        <div className="w-full bg-amber-100 rounded-full h-1.5">
                            <div
                                className="bg-amber-500 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${optimizationProgress.progress}% ` }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Import Modal */}
            {showImport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity">
                    <div className="bg-white rounded-2xl p-8 max-w-2xl w-full shadow-2xl transform transition-all scale-100">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-slate-800">ייבוא קובץ Excel</h2>
                            <button
                                onClick={() => setShowImport(false)}
                                className="text-stone-400 hover:text-slate-600 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <FileUpload onDataParsed={handleExcelParsed} />
                    </div>
                </div>
            )}

            {/* Column Mapper */}
            {showColumnMapper && excelData && (
                <ColumnMapper
                    isOpen={showColumnMapper}
                    onClose={() => setShowColumnMapper(false)}
                    excelData={excelData}
                />
            )}
        </>
    );
};
