import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmDialogProps {
    isOpen: boolean;
    title?: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmLabel?: string;
    cancelLabel?: string;
    dangerous?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen,
    title = 'אישור',
    message,
    onConfirm,
    onCancel,
    confirmLabel = 'אישור',
    cancelLabel = 'ביטול',
    dangerous = false,
}) => {
    return (
        <Modal isOpen={isOpen} onClose={onCancel} title={title} maxWidth="sm">
            <div data-testid="confirm-dialog">
                <p className="text-sm text-stone-600 mb-6 leading-relaxed">{message}</p>
                <div className="flex justify-end gap-2.5">
                    <Button
                        variant="secondary"
                        onClick={onCancel}
                        data-testid="confirm-dialog-cancel"
                    >
                        {cancelLabel}
                    </Button>
                    <Button
                        variant={dangerous ? 'danger' : 'primary'}
                        onClick={onConfirm}
                        data-testid="confirm-dialog-ok"
                    >
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
