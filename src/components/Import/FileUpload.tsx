import React, { useState, useRef } from 'react';
import { parseExcelFile, validateExcelFile } from '../../utils/excelParser';
import { ExcelData } from '../../types';

interface FileUploadProps {
    onDataParsed: (data: ExcelData) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onDataParsed }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFile = async (file: File) => {
        setError(null);

        // Validate file
        const validation = validateExcelFile(file);
        if (!validation.valid) {
            setError(validation.error || 'קובץ לא תקין');
            return;
        }

        // Parse file
        setIsLoading(true);
        try {
            const data = await parseExcelFile(file);
            onDataParsed(data);
        } catch (err) {
            setError('שגיאה בקריאת הקובץ. אנא ודא שהקובץ תקין.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            handleFile(files[0]);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFile(files[0]);
        }
    };

    const openFilePicker = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="w-full">
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={openFilePicker}
                className={`
          border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
          transition-all duration-200
          ${isDragging
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-300 bg-gray-50 hover:border-primary-400 hover:bg-gray-100'
                    }
          ${isLoading ? 'opacity-50 pointer-events-none' : ''}
        `}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileSelect}
                    className="hidden"
                />

                {isLoading ? (
                    <div className="flex flex-col items-center">
                        <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4" />
                        <p className="text-gray-600">טוען קובץ...</p>
                    </div>
                ) : (
                    <>
                        <svg
                            className="w-16 h-16 mx-auto mb-4 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                            />
                        </svg>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            גרור קובץ Excel לכאן
                        </h3>
                        <p className="text-gray-600 mb-4">
                            או לחץ לבחירת קובץ
                        </p>
                        <p className="text-sm text-gray-500">
                            קבצים נתמכים: .xlsx, .xls, .csv
                        </p>
                    </>
                )}
            </div>

            {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 font-medium">{error}</p>
                </div>
            )}
        </div>
    );
};
