import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useSeatingStore } from '../../store/seatingStore';
import { Button } from '../shared/Button';
import { FileUpload } from '../Import/FileUpload';
import { ColumnMapper } from '../Import/ColumnMapper';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { OptimizeModal, OptimizeConfig } from './OptimizeModal';
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
        addTable,
        removeTable,
    } = useSeatingStore();

    const [showImport, setShowImport] = useState(false);
    const [excelData, setExcelData] = useState<ExcelData | null>(null);
    const [showColumnMapper, setShowColumnMapper] = useState(false);
    const [showOptimizeModal, setShowOptimizeModal] = useState(false);
    const [showResetConfirm, setShowResetConfirm] = useState(false);

    const progress = getSeatingProgress();

    const availableGroups = useMemo(() => {
        return Array.from(new Set(
            guests
                .map(g => g.groupId)
                .filter((id): id is string => !!id && !id.startsWith('individual-'))
        ));
    }, [guests]);

    const handleExcelParsed = (data: ExcelData) => {
        setExcelData(data);
        setShowImport(false);
        setShowColumnMapper(true);
    };

    const handleExcelExport = () => {
        const exportData = guests.map(guest => {
            const assignedTable = tables.find(t => t.id === guest.tableId);
            const sideHebrew: Record<string, string> = { groom: 'חתן', bride: 'כלה', both: 'שניהם' };
            const categoryHebrew: Record<string, string> = { family: 'משפחה', friend: 'חבר', colleague: 'עבודה', other: 'אחר' };

            return {
                rawGuest: guest,
                rawTableNumber: assignedTable ? assignedTable.number : 9999,
                data: {
                    'מספר שולחן': assignedTable ? assignedTable.number : 'לא שובץ',
                    'שם': guest.name,
                    'טלפון': guest.phoneNumber || '',
                    'קטגוריה': categoryHebrew[guest.category] || guest.category,
                    'קרבה': '',
                    'צד': sideHebrew[guest.side] || guest.side,
                    'קבוצת קשר': guest.groupId || '',
                    'כמות מוזמנים': guest.amount || 1,
                    'הערות': guest.notes || '',
                },
            };
        });

        exportData.sort((a, b) => {
            if (a.rawTableNumber !== b.rawTableNumber) return a.rawTableNumber - b.rawTableNumber;
            const groupA = a.rawGuest.groupId || '';
            const groupB = b.rawGuest.groupId || '';
            if (groupA !== groupB) return groupA.localeCompare(groupB);
            return a.rawGuest.name.localeCompare(b.rawGuest.name, 'he');
        });

        const ws = XLSX.utils.json_to_sheet(exportData.map(i => i.data));
        ws['!cols'] = [
            { wch: 10 }, { wch: 20 }, { wch: 15 }, { wch: 10 },
            { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 10 }, { wch: 30 },
        ];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Seating Plan');
        const date = new Date().toLocaleDateString('he-IL').replace(/\./g, '-');
        XLSX.writeFile(wb, `Seating_Plan_${date}.xlsx`);
    };

    const handleDownloadTemplate = () => {
        const templateData = [
            { 'חתן/כלה': 'חתן', 'קבוצת קשר': 'חברים מהצבא', 'שם': 'ישראל ישראלי', 'מס\' טלפון': '050-1234567', 'פלוס כמה': '2' },
            { 'חתן/כלה': 'כלה', 'קבוצת קשר': 'דודים', 'שם': 'משה כהן', 'מס\' טלפון': '054-9876543', 'פלוס כמה': '0' },
        ];
        const ws = XLSX.utils.json_to_sheet(templateData);
        ws['!cols'] = [{ wch: 10 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 10 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'תבנית לאורחים');
        XLSX.writeFile(wb, 'template_guests.xlsx');
    };

    const handleOptimizeWithConfig = async (config: OptimizeConfig) => {
        setShowOptimizeModal(false);
        if (guests.length === 0) return;

        const knightConfig = config.knightEnabled
            ? { enabled: true, count: config.knightCount, capacity: config.knightCapacity }
            : undefined;

        try {
            setOptimizationProgress({
                isRunning: true, progress: 0,
                currentIteration: 0, totalIterations: 1000,
                message: 'מתחיל אופטימיזציה...',
            });

            const result = await optimizeSeating(guests, tables, {
                tableCapacity: config.standardCapacity,
                knightConfig,
                knightGroupNames: config.knightGroupNames,
                onProgress: (p, message) => setOptimizationProgress({ progress: Math.round(p), message }),
            });

            const oldTables = [...tables];
            oldTables.forEach(t => removeTable(t.id));

            const idMapping: Record<string, string> = {};
            const sortedAlgoTables = result.tables.sort((a, b) =>
                parseInt(a.id.replace('table-', '')) - parseInt(b.id.replace('table-', ''))
            );
            const maxCap = Math.max(config.standardCapacity, config.knightCapacity, 50);

            for (const algoTable of sortedAlgoTables) {
                addTable(Math.min(algoTable.capacity, maxCap));
            }

            await new Promise(resolve => setTimeout(resolve, 200));

            const currentTables = useSeatingStore.getState().tables;
            const actualTables = currentTables.slice(-sortedAlgoTables.length);

            if (actualTables.length !== sortedAlgoTables.length) {
                throw new Error('Table creation failed');
            }

            sortedAlgoTables.forEach((algoTable, i) => {
                idMapping[algoTable.id] = actualTables[i].id;
            });

            const realAssignments: Record<string, string> = {};
            Object.entries(result.assignments).forEach(([guestId, tempTableId]) => {
                if (idMapping[tempTableId]) realAssignments[guestId] = idMapping[tempTableId];
            });

            applyOptimizedSeating(realAssignments);
            setOptimizationProgress({ isRunning: false, progress: 100, message: 'הושלם!' });

        } catch (error) {
            console.error('Optimization error:', error);
            setOptimizationProgress({ isRunning: false, progress: 0, message: '' });
        }
    };

    const pct = progress.percentage;

    return (
        <>
            {/* ── Main status card ───────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-[#e4ddd4] shadow-warm-sm p-5">

                <div className="flex flex-col lg:flex-row lg:items-center gap-4">

                    {/* Progress section */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-widest">
                                התקדמות הושבה
                            </span>
                            <span
                                className="text-sm font-bold text-stone-800 tabular-nums"
                                data-testid="seating-progress"
                            >
                                {progress.seated}
                                <span className="text-stone-400 font-normal"> / {progress.total}</span>
                                <span className="text-stone-400 font-normal text-xs mr-1"> ({pct}%)</span>
                            </span>
                        </div>
                        <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-700 ease-out"
                                style={{
                                    width: `${pct}%`,
                                    background: pct === 100
                                        ? 'linear-gradient(90deg, #4ade80, #22c55e)'
                                        : 'linear-gradient(90deg, #fbbf24, #d97706)',
                                }}
                            />
                        </div>
                        <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-[11px] text-stone-400">
                                {guests.length} אורחים · {tables.length} שולחנות
                            </span>
                            {pct === 100 && guests.length > 0 && (
                                <span className="text-[11px] font-semibold text-green-600">✓ כולם שובצו!</span>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 items-center lg:shrink-0">
                        <Button
                            variant="secondary"
                            className="text-xs hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50"
                            onClick={handleDownloadTemplate}
                        >
                            📥 תבנית
                        </Button>

                        <Button
                            variant="secondary"
                            className="text-xs hover:border-amber-300 hover:text-amber-700 hover:bg-amber-50"
                            onClick={() => setShowImport(true)}
                            data-testid="import-btn"
                        >
                            📊 ייבוא
                        </Button>

                        <Button
                            variant="secondary"
                            className="text-xs hover:border-green-300 hover:text-green-700 hover:bg-green-50"
                            onClick={handleExcelExport}
                            data-testid="export-btn"
                        >
                            📤 יצוא
                        </Button>

                        <div className="w-px h-6 bg-[#e4ddd4] hidden lg:block" />

                        <Button
                            variant="primary"
                            onClick={() => guests.length > 0 && setShowOptimizeModal(true)}
                            disabled={optimizationProgress.isRunning || guests.length === 0}
                            className="bg-amber-500 hover:bg-amber-600 border-0 shadow-warm-sm"
                            data-testid="optimize-btn"
                        >
                            {optimizationProgress.isRunning ? '⏳ מעבד...' : '✨ אופטימיזציה'}
                        </Button>

                        <button
                            onClick={() => setShowResetConfirm(true)}
                            className="btn btn-danger opacity-60 hover:opacity-100 px-3 text-sm"
                            data-testid="reset-btn"
                            title="איפוס נתונים"
                        >
                            🗑️
                        </button>
                    </div>
                </div>

                {/* Optimization running indicator */}
                {optimizationProgress.isRunning && (
                    <div className="mt-4 pt-4 border-t border-stone-100">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="animate-spin text-base">⚙️</span>
                            <span className="text-sm font-medium text-stone-700">
                                {optimizationProgress.message}
                            </span>
                        </div>
                        <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full transition-all duration-300"
                                style={{ width: `${optimizationProgress.progress}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* ── Import modal ───────────────────────────────────────── */}
            {showImport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl p-8 max-w-2xl w-full shadow-warm-xl animate-slide-up">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-stone-900">ייבוא קובץ Excel</h2>
                            <button
                                onClick={() => setShowImport(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg
                                           text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <FileUpload onDataParsed={handleExcelParsed} />
                    </div>
                </div>
            )}

            {/* ── Column mapper ──────────────────────────────────────── */}
            {showColumnMapper && excelData && (
                <ColumnMapper
                    isOpen={showColumnMapper}
                    onClose={() => setShowColumnMapper(false)}
                    excelData={excelData}
                />
            )}

            {/* ── Optimize modal ─────────────────────────────────────── */}
            <OptimizeModal
                isOpen={showOptimizeModal}
                onClose={() => setShowOptimizeModal(false)}
                onConfirm={handleOptimizeWithConfig}
                availableGroups={availableGroups}
            />

            {/* ── Reset confirm ──────────────────────────────────────── */}
            <ConfirmDialog
                isOpen={showResetConfirm}
                title="מחיקת כל הנתונים"
                message="האם למחוק את כל הנתונים? פעולה זו אינה הפיכה."
                onConfirm={() => { setShowResetConfirm(false); resetAll(); }}
                onCancel={() => setShowResetConfirm(false)}
                confirmLabel="מחק הכל"
                dangerous
            />
        </>
    );
};
