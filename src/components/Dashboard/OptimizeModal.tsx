import React, { useState } from 'react';
import { Modal } from '../shared/Modal';
import { Button } from '../shared/Button';

export interface OptimizeConfig {
    standardCapacity: number;
    knightEnabled: boolean;
    knightCount: number;
    knightCapacity: number;
    knightGroupNames: string[];
}

interface OptimizeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (config: OptimizeConfig) => void;
    availableGroups: string[];
}

export const OptimizeModal: React.FC<OptimizeModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    availableGroups,
}) => {
    const [standardCapacity, setStandardCapacity] = useState('12');
    const [knightEnabled, setKnightEnabled] = useState(false);
    const [knightCount, setKnightCount] = useState('1');
    const [knightCapacity, setKnightCapacity] = useState('20');
    const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
    const [error, setError] = useState('');

    const handleGroupToggle = (group: string) => {
        setSelectedGroups(prev => {
            const next = new Set(prev);
            if (next.has(group)) next.delete(group); else next.add(group);
            return next;
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const cap = parseInt(standardCapacity);
        if (isNaN(cap) || cap < 1 || cap > 50) {
            setError('גודל שולחן לא תקין. אנא הזן מספר בין 1 ל-50');
            return;
        }
        if (knightEnabled) {
            const kCount = parseInt(knightCount);
            const kCap = parseInt(knightCapacity);
            if (isNaN(kCount) || kCount < 1) { setError('מספר שולחנות אבירים לא תקין'); return; }
            if (isNaN(kCap) || kCap < 1) { setError('קיבולת שולחן אבירים לא תקינה'); return; }
        }
        setError('');
        onConfirm({
            standardCapacity: cap,
            knightEnabled,
            knightCount: parseInt(knightCount) || 0,
            knightCapacity: parseInt(knightCapacity) || 20,
            knightGroupNames: Array.from(selectedGroups),
        });
    };

    const handleClose = () => { setError(''); onClose(); };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="הגדרות אופטימיזציה" maxWidth="md">
            <form onSubmit={handleSubmit} className="space-y-6" data-testid="optimize-modal" noValidate>

                {/* Standard capacity */}
                <div>
                    <label className="block text-sm font-semibold text-stone-700 mb-2">
                        כמה מקומות בשולחן רגיל?
                    </label>
                    <div className="flex items-center gap-3">
                        <input
                            type="number"
                            min={1}
                            max={50}
                            value={standardCapacity}
                            onChange={(e) => { setStandardCapacity(e.target.value); setError(''); }}
                            className="input w-24 text-center text-base font-bold"
                            data-testid="optimize-capacity-input"
                        />
                        <div className="flex gap-1.5">
                            {[8, 10, 12, 14].map(n => (
                                <button
                                    key={n}
                                    type="button"
                                    onClick={() => { setStandardCapacity(String(n)); setError(''); }}
                                    className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all
                                        ${standardCapacity === String(n)
                                            ? 'bg-amber-500 text-white border-amber-500'
                                            : 'bg-white text-stone-600 border-[#e4ddd4] hover:border-amber-300'}`}
                                >
                                    {n}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Knight tables toggle */}
                <div className="p-4 rounded-xl border border-[#e4ddd4] bg-stone-50/60">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                        <div className="relative">
                            <input
                                type="checkbox"
                                checked={knightEnabled}
                                onChange={(e) => setKnightEnabled(e.target.checked)}
                                className="sr-only"
                                data-testid="optimize-knight-toggle"
                            />
                            <div className={`w-10 h-6 rounded-full border-2 transition-all duration-200
                                ${knightEnabled ? 'bg-amber-500 border-amber-500' : 'bg-white border-stone-300'}`}>
                                <div className={`w-4 h-4 bg-white rounded-full shadow-warm-xs mt-0.5 transition-all duration-200
                                    ${knightEnabled ? 'translate-x-4 mr-0.5' : 'translate-x-0.5'}`} />
                            </div>
                        </div>
                        <div>
                            <span className="text-sm font-semibold text-stone-800">שולחנות אבירים</span>
                            <p className="text-xs text-stone-400 mt-0.5">שולחנות ארוכים / מלבניים</p>
                        </div>
                    </label>

                    {knightEnabled && (
                        <div className="mt-4 pt-4 border-t border-[#e4ddd4] space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-stone-600 mb-1.5">
                                        מספר שולחנות
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={knightCount}
                                        onChange={(e) => { setKnightCount(e.target.value); setError(''); }}
                                        className="input text-center font-bold"
                                        data-testid="optimize-knight-count"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-stone-600 mb-1.5">
                                        מקומות בכל שולחן
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={knightCapacity}
                                        onChange={(e) => { setKnightCapacity(e.target.value); setError(''); }}
                                        className="input text-center font-bold"
                                        data-testid="optimize-knight-capacity"
                                    />
                                </div>
                            </div>

                            {availableGroups.length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold text-stone-600 mb-2">
                                        קבוצות לשולחנות האבירים
                                        <span className="text-stone-400 font-normal mr-1">(השאר ריק לאוטומטי)</span>
                                    </p>
                                    <div className="max-h-36 overflow-y-auto space-y-1
                                                    border border-[#e4ddd4] rounded-xl p-2 bg-white">
                                        {availableGroups.map(group => (
                                            <label
                                                key={group}
                                                className="flex items-center gap-2.5 cursor-pointer
                                                           hover:bg-stone-50 px-2 py-1 rounded-lg"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedGroups.has(group)}
                                                    onChange={() => handleGroupToggle(group)}
                                                    className="w-3.5 h-3.5 accent-amber-500 rounded"
                                                />
                                                <span className="text-sm text-stone-700">{group}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Error */}
                {error && (
                    <p className="text-red-600 text-sm flex items-center gap-1.5 bg-red-50 px-3 py-2 rounded-lg">
                        <span>⚠</span> {error}
                    </p>
                )}

                <div className="flex justify-end gap-2.5 pt-1 border-t border-[#ede8df]">
                    <Button type="button" variant="secondary" onClick={handleClose}>
                        ביטול
                    </Button>
                    <Button
                        type="submit"
                        variant="primary"
                        className="bg-amber-500 hover:bg-amber-600 border-0"
                        data-testid="optimize-confirm"
                    >
                        ✨ התחל אופטימיזציה
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
