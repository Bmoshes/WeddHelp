import React from 'react';

export const LoadingSpinner: React.FC<{ message?: string }> = ({ message }) => {
    return (
        <div className="flex flex-col items-center justify-center p-8">
            <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
            {message && (
                <p className="mt-4 text-gray-600 font-medium">{message}</p>
            )}
        </div>
    );
};
