'use client';

import { useState, useEffect } from 'react';

interface FooterProps {
    fileCount?: number;
    isEngineReady?: boolean;
}

export default function Footer({ fileCount = 0, isEngineReady = false }: FooterProps) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    return (
        <footer className="mt-20 border-t border-outline-variant/10 py-6 bg-surface-container-lowest">
            <div className="max-w-6xl mx-auto px-6 flex justify-between items-center text-xs font-medium text-on-surface-variant">
                <div className="flex items-center gap-6">
                    <span className="flex items-center gap-2">
                        <span
                            className={`w-2 h-2 rounded-full ${
                                mounted && isEngineReady ? 'bg-emerald-500' : 'bg-amber-400'
                            }`}
                        />
                        {mounted && isEngineReady ? 'System Active' : 'Initializing...'}
                    </span>
                    <span>{fileCount} Files Uploaded</span>
                    <span>Mockup Engine v2.4</span>
                </div>
                <div className="flex gap-4">
                    <a className="hover:text-primary transition-colors" href="#">Documentation</a>
                    <a className="hover:text-primary transition-colors" href="#">Etsy API Settings</a>
                </div>
            </div>
        </footer>
    );
}
