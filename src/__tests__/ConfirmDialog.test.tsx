import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmDialog } from '../components/shared/ConfirmDialog';

describe('ConfirmDialog', () => {
    it('renders message when open', () => {
        render(
            <ConfirmDialog
                isOpen
                message="האם למחוק?"
                onConfirm={vi.fn()}
                onCancel={vi.fn()}
            />
        );
        expect(screen.getByText('האם למחוק?')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
        render(
            <ConfirmDialog
                isOpen={false}
                message="האם למחוק?"
                onConfirm={vi.fn()}
                onCancel={vi.fn()}
            />
        );
        expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument();
    });

    it('calls onConfirm when OK is clicked', () => {
        const onConfirm = vi.fn();
        render(
            <ConfirmDialog
                isOpen
                message="מחיקה"
                onConfirm={onConfirm}
                onCancel={vi.fn()}
            />
        );
        fireEvent.click(screen.getByTestId('confirm-dialog-ok'));
        expect(onConfirm).toHaveBeenCalledOnce();
    });

    it('calls onCancel when Cancel is clicked', () => {
        const onCancel = vi.fn();
        render(
            <ConfirmDialog
                isOpen
                message="מחיקה"
                onConfirm={vi.fn()}
                onCancel={onCancel}
            />
        );
        fireEvent.click(screen.getByTestId('confirm-dialog-cancel'));
        expect(onCancel).toHaveBeenCalledOnce();
    });

    it('uses custom confirm/cancel labels', () => {
        render(
            <ConfirmDialog
                isOpen
                message="msg"
                confirmLabel="מחק"
                cancelLabel="חזור"
                onConfirm={vi.fn()}
                onCancel={vi.fn()}
            />
        );
        expect(screen.getByTestId('confirm-dialog-ok')).toHaveTextContent('מחק');
        expect(screen.getByTestId('confirm-dialog-cancel')).toHaveTextContent('חזור');
    });
});
