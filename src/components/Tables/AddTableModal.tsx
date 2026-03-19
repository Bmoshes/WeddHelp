import React, { useState } from 'react';
import { Modal } from '../shared/Modal';
import { Button } from '../shared/Button';

interface AddTableModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (capacity: number) => void;
}

export const AddTableModal: React.FC<AddTableModalProps> = ({ isOpen, onClose, onAdd }) => {
    const [capacityInput, setCapacityInput] = useState('10');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const capacity = parseInt(capacityInput);
        if (isNaN(capacity) || capacity < 1 || capacity > 100) {
            setError('נא להזין מספר תקין בין 1 ל-100');
            return;
        }
        onAdd(capacity);
        setCapacityInput('10');
        setError('');
        onClose();
    };

    const handleClose = () => {
        setCapacityInput('10');
        setError('');
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="הוספת שולחן" maxWidth="sm">
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                <div>
                    <label className="block text-sm font-semibold text-stone-700 mb-2">
                        כמה מקומות בשולחן?
                    </label>
                    <input
                        type="number"
                        min={1}
                        max={100}
                        value={capacityInput}
                        onChange={(e) => { setCapacityInput(e.target.value); setError(''); }}
                        className="input w-32 text-center text-lg font-bold"
                        autoFocus
                        data-testid="add-table-capacity-input"
                    />
                    {error && (
                        <p className="text-red-600 text-xs mt-2 flex items-center gap-1">
                            <span>⚠</span> {error}
                        </p>
                    )}
                </div>

                {/* Quick presets */}
                <div>
                    <p className="text-xs font-semibold text-stone-400 mb-2 uppercase tracking-wider">גדלים נפוצים</p>
                    <div className="flex gap-2 flex-wrap">
                        {[6, 8, 10, 12, 14].map(n => (
                            <button
                                key={n}
                                type="button"
                                onClick={() => { setCapacityInput(String(n)); setError(''); }}
                                className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all
                                    ${capacityInput === String(n)
                                        ? 'bg-amber-500 text-white border-amber-500'
                                        : 'bg-white text-stone-600 border-[#e4ddd4] hover:border-amber-300 hover:text-amber-700'}`}
                            >
                                {n}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-1 border-t border-[#ede8df]">
                    <Button type="button" variant="secondary" onClick={handleClose}>
                        ביטול
                    </Button>
                    <Button
                        type="submit"
                        variant="primary"
                        className="bg-amber-500 hover:bg-amber-600 border-0"
                        data-testid="add-table-confirm"
                    >
                        + הוסף שולחן
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
