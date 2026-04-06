'use client';

import { useState, useRef } from 'react';
import { Artwork, FileManager } from '@/lib/files';

interface Props {
    artwork: Artwork | null;
    onUpload: (file: File) => void;
}

export default function ArtworkUpload({ artwork, onUpload }: Props) {
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = Array.from(e.dataTransfer.files).find(f => f.type.startsWith('image/'));
        if (file) onUpload(file);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) onUpload(file);
        // Reset input so the same file could be selected again if needed
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div
            className={`bg-surface-container-low rounded-xl p-8 flex flex-col items-center justify-center text-center group transition-all cursor-pointer ${
                isDragOver ? 'upload-zone-active' : 'hover:bg-surface-container'
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
            onDrop={handleDrop}
        >
            <input
                type="file"
                ref={fileInputRef}
                accept=".png,.jpg,.jpeg"
                hidden
                onChange={handleFileChange}
            />

            {!artwork ? (
                <>
                    <div className="w-16 h-16 bg-primary-container/50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-primary text-3xl">upload_file</span>
                    </div>
                    <h3 className="font-bold text-lg mb-1">Upload Your Art</h3>
                    <p className="text-on-surface-variant text-sm px-8">Drop your PNG, JPG, or SVG files here to start generating mockups.</p>
                </>
            ) : (
                <div className="flex flex-col items-center file-preview">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={artwork.url} alt={artwork.name} className="max-w-[140px] max-h-[140px] rounded-md border border-outline-variant/50 object-contain" />
                    <p className="text-sm text-on-surface-variant mt-2 font-medium">
                        {artwork.name} ({FileManager.formatSize(artwork.buffer.byteLength)})
                    </p>
                    <button
                        className="mt-4 text-xs font-bold text-primary uppercase tracking-wider hover:opacity-80"
                        onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    >
                        Change File
                    </button>
                </div>
            )}
        </div>
    );
}
