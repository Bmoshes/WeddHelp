import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AddTableModal } from '../components/Tables/AddTableModal';

describe('AddTableModal', () => {
    it('renders when open', () => {
        render(<AddTableModal isOpen onClose={vi.fn()} onAdd={vi.fn()} />);
        expect(screen.getByTestId('add-table-capacity-input')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
        render(<AddTableModal isOpen={false} onClose={vi.fn()} onAdd={vi.fn()} />);
        expect(screen.queryByTestId('add-table-capacity-input')).not.toBeInTheDocument();
    });

    it('calls onAdd with parsed capacity and closes', () => {
        const onAdd = vi.fn();
        const onClose = vi.fn();
        render(<AddTableModal isOpen onClose={onClose} onAdd={onAdd} />);

        const input = screen.getByTestId('add-table-capacity-input') as HTMLInputElement;
        fireEvent.change(input, { target: { value: '8' } });
        fireEvent.click(screen.getByTestId('add-table-confirm'));

        expect(onAdd).toHaveBeenCalledWith(8);
        expect(onClose).toHaveBeenCalled();
    });

    it('shows error for invalid capacity', () => {
        render(<AddTableModal isOpen onClose={vi.fn()} onAdd={vi.fn()} />);
        const input = screen.getByTestId('add-table-capacity-input') as HTMLInputElement;
        fireEvent.change(input, { target: { value: '0' } });
        fireEvent.click(screen.getByTestId('add-table-confirm'));
        expect(screen.getByText(/מספר תקין/)).toBeInTheDocument();
    });

    it('shows error for capacity > 100', () => {
        render(<AddTableModal isOpen onClose={vi.fn()} onAdd={vi.fn()} />);
        const input = screen.getByTestId('add-table-capacity-input') as HTMLInputElement;
        fireEvent.change(input, { target: { value: '200' } });
        fireEvent.click(screen.getByTestId('add-table-confirm'));
        expect(screen.getByText(/מספר תקין/)).toBeInTheDocument();
    });
});
