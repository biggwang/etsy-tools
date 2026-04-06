'use client';

import { useState, useRef } from 'react';
import { Mockup, FileManager } from '@/lib/files';

interface Props {
    mockups: Mockup[];
    onUpload: (files: File[]) => void;
    onRemove: (index: number) => void;
}

export default function MockupUpload({ mockups, onUpload, onRemove }: Props) {
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const files = Array.from(e.dataTransfer.files).filter(f => f.name.toLowerCase().endsWith('.psd'));
        if (files.length > 0) onUpload(files);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) onUpload(files);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div
            className={`bg-surface-container-low rounded-xl p-8 flex flex-col items-center justify-center text-center group transition-all border-2 border-dashed ${
                isDragOver ? 'upload-zone-active' : 'border-outline-variant/20 hover:bg-surface-container'
            }`}
            onClick={(e) => {
                // Don't trigger upload dialog if clicking on an existing list item or remove button
                if ((e.target as HTMLElement).closest('.file-list-block')) return;
                fileInputRef.current?.click();
            }}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
            onDrop={handleDrop}
            style={{ cursor: 'pointer' }}
        >
            <input
                type="file"
                ref={fileInputRef}
                accept=".psd"
                multiple
                hidden
                onChange={handleFileChange}
            />

            {mockups.length === 0 ? (
                <>
                    <div className="w-16 h-16 bg-secondary-container/50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-secondary text-3xl">layers</span>
                    </div>
                    <h3 className="font-bold text-lg mb-1">Batch Mockup (PSDs)</h3>
                    <p className="text-on-surface-variant text-sm px-8">Upload multiple PSD templates to apply your art across various scenes.</p>
                </>
            ) : (
                <div className="w-full h-full flex flex-col">
                    <div className="flex items-center justify-between mb-4 file-list-block">
                        <h3 className="font-bold text-lg text-left">Uploaded Mockups ({mockups.length})</h3>
                        <button
                            className="text-xs font-bold text-primary uppercase tracking-wider hover:opacity-80"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            Add More
                        </button>
                    </div>
                    
                    <ul className="text-left max-h-[200px] overflow-y-auto custom-scrollbar pr-2 w-full file-list-block">
                        {mockups.map((m, i) => (
                            <li key={i} className="flex justify-between items-center py-2 px-3 bg-surface-container-highest rounded-md mb-2 text-sm text-on-surface-variant hover:bg-surface-dim transition-colors group">
                                <span className="truncate pr-2 border-none">📄 {m.name} <span className="opacity-60 ml-1">({FileManager.formatSize(m.buffer.byteLength)})</span></span>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onRemove(i); }}
                                    className="text-error opacity-50 hover:opacity-100 transition-opacity p-1 font-bold"
                                    title="Remove"
                                >
                                    ✕
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
