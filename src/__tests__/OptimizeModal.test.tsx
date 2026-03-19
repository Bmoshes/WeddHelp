import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OptimizeModal } from '../components/Dashboard/OptimizeModal';

describe('OptimizeModal', () => {
    it('renders when open', () => {
        render(
            <OptimizeModal isOpen onClose={vi.fn()} onConfirm={vi.fn()} availableGroups={[]} />
        );
        expect(screen.getByTestId('optimize-modal')).toBeInTheDocument();
        expect(screen.getByTestId('optimize-capacity-input')).toBeInTheDocument();
    });

    it('calls onConfirm with correct standardCapacity', () => {
        const onConfirm = vi.fn();
        render(
            <OptimizeModal isOpen onClose={vi.fn()} onConfirm={onConfirm} availableGroups={[]} />
        );
        const input = screen.getByTestId('optimize-capacity-input') as HTMLInputElement;
        fireEvent.change(input, { target: { value: '8' } });
        fireEvent.click(screen.getByTestId('optimize-confirm'));

        expect(onConfirm).toHaveBeenCalledWith(
            expect.objectContaining({ standardCapacity: 8, knightEnabled: false })
        );
    });

    it('shows error for invalid capacity (0)', () => {
        render(
            <OptimizeModal isOpen onClose={vi.fn()} onConfirm={vi.fn()} availableGroups={[]} />
        );
        const input = screen.getByTestId('optimize-capacity-input') as HTMLInputElement;
        fireEvent.change(input, { target: { value: '0' } });
        fireEvent.click(screen.getByTestId('optimize-confirm'));
        expect(screen.getByText(/לא תקין/)).toBeInTheDocument();
    });

    it('shows knight fields when knight toggle is enabled', () => {
        render(
            <OptimizeModal isOpen onClose={vi.fn()} onConfirm={vi.fn()} availableGroups={['חברים', 'משפחה']} />
        );
        fireEvent.click(screen.getByTestId('optimize-knight-toggle'));
        expect(screen.getByTestId('optimize-knight-count')).toBeInTheDocument();
        expect(screen.getByTestId('optimize-knight-capacity')).toBeInTheDocument();
    });

    it('shows group checkboxes when knight is enabled and groups exist', () => {
        render(
            <OptimizeModal isOpen onClose={vi.fn()} onConfirm={vi.fn()} availableGroups={['חברים מהצבא', 'עמיתי עבודה']} />
        );
        fireEvent.click(screen.getByTestId('optimize-knight-toggle'));
        expect(screen.getByText('חברים מהצבא')).toBeInTheDocument();
        expect(screen.getByText('עמיתי עבודה')).toBeInTheDocument();
    });

    it('passes selected knight groups to onConfirm', () => {
        const onConfirm = vi.fn();
        render(
            <OptimizeModal isOpen onClose={vi.fn()} onConfirm={onConfirm} availableGroups={['חברים']} />
        );
        fireEvent.click(screen.getByTestId('optimize-knight-toggle'));
        // Check the group checkbox
        fireEvent.click(screen.getByLabelText('חברים'));
        fireEvent.click(screen.getByTestId('optimize-confirm'));

        expect(onConfirm).toHaveBeenCalledWith(
            expect.objectContaining({ knightGroupNames: ['חברים'], knightEnabled: true })
        );
    });
});
