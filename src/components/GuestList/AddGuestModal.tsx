import React, { useState } from 'react';
import { Modal } from '../shared/Modal';
import { Button } from '../shared/Button';
import { useSeatingStore } from '../../store/seatingStore';
import { GuestCategory, GuestSide } from '../../types';

interface AddGuestModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AddGuestModal: React.FC<AddGuestModalProps> = ({ isOpen, onClose }) => {
    const { addGuest } = useSeatingStore();
    const [name, setName] = useState('');
    const [category, setCategory] = useState<GuestCategory>('other');
    const [side, setSide] = useState<GuestSide>('both');
    const [age, setAge] = useState('');
    const [notes, setNotes] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            alert('חובה להזין שם');
            return;
        }

        addGuest({
            name: name.trim(),
            category,
            side,
            age: age ? parseInt(age) : undefined,
            notes: notes || undefined,
            conflictsWith: [],
        });

        // Reset form
        setName('');
        setCategory('other');
        setSide('both');
        setAge('');
        setNotes('');

        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="הוספת אורח חדש" maxWidth="md">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        שם מלא <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="input"
                        placeholder="הזן שם"
                        autoFocus
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            קטגוריה
                        </label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value as GuestCategory)}
                            className="input"
                        >
                            <option value="family">משפחה</option>
                            <option value="friend">חבר</option>
                            <option value="colleague">עמית עבודה</option>
                            <option value="other">אחר</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            צד
                        </label>
                        <select
                            value={side}
                            onChange={(e) => setSide(e.target.value as GuestSide)}
                            className="input"
                        >
                            <option value="groom">חתן</option>
                            <option value="bride">כלה</option>
                            <option value="both">שניהם</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        גיל (אופציונלי)
                    </label>
                    <input
                        type="number"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        className="input"
                        placeholder="גיל"
                        min="0"
                        max="120"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        הערות (אופציונלי)
                    </label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="input"
                        rows={3}
                        placeholder="הערות נוספות..."
                    />
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button type="button" variant="secondary" onClick={onClose}>
                        ביטול
                    </Button>
                    <Button type="submit" variant="primary">
                        ➕ הוסף אורח
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
