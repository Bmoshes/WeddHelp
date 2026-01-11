import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
    variant = 'primary',
    size = 'md',
    className = '',
    children,
    ...props
}) => {
    const baseClass = 'btn';
    const variantClass = variant === 'primary'
        ? 'btn-primary'
        : variant === 'danger'
            ? 'btn-danger'
            : 'btn-secondary';

    const sizeClass = size === 'sm'
        ? 'text-sm px-3 py-1'
        : size === 'lg'
            ? 'text-lg px-6 py-3'
            : '';

    return (
        <button
            className={`${baseClass} ${variantClass} ${sizeClass} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};
