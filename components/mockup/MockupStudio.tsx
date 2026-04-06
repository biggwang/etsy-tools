'use client';

import { useState, useRef, useEffect } from 'react';
import ArtworkUpload from './ArtworkUpload';
import MockupUpload from './MockupUpload';
import PreviewGrid from './PreviewGrid';
import ProgressBar from './ProgressBar';
import { PhotopeaEngine } from '@/lib/engine';
import { FileManager, Artwork, Mockup, Result } from '@/lib/files';

export default function MockupStudio() {
    // State
    const [artwork, setArtwork] = useState<Artwork | null>(null);
    const [mockups, setMockups] = useState<Mockup[]>([]);
    const [results, setResults] = useState<Result[]>([]);
    const [errorMessages, setErrorMessages] = useState<Map<number, string>>(new Map());
    
    // Processing state
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressText, setProgressText] = useState('');
    
    // Engine state
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const engineRef = useRef<PhotopeaEngine | null>(null);
    const fileManagerRef = useRef<FileManager | null>(null);

    // Initialize refs once mounted
    useEffect(() => {
        fileManagerRef.current = new FileManager();
        if (iframeRef.current) {
            engineRef.current = new PhotopeaEngine(iframeRef.current);
            engineRef.current.waitReady().then(() => {
                console.log('[MockupStudio] Photopea engine ready');
            }).catch(console.error);
        }
        
        return () => {
            if (fileManagerRef.current) fileManagerRef.current.clear();
        };
    }, []);

    // Handlers
    const handleArtworkUpload = async (file: File) => {
        if (!fileManagerRef.current) return;
        try {
            const art = await fileManagerRef.current.setArtwork(file);
            setArtwork(art);
            
            // 기존 결과 초기화
            fileManagerRef.current.clearResults();
            setResults([]);
            setErrorMessages(new Map());
            setProgress(0);
            setProgressText('');
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleMockupUpload = async (files: File[]) => {
        if (!fileManagerRef.current) return;
        try {
            for (const file of files) {
                // Ensure we respect the 10 limit
                if (fileManagerRef.current.mockups.length < 10) {
                    await fileManagerRef.current.addMockup(file);
                }
            }
            setMockups([...fileManagerRef.current.mockups]);
            
            // 기존 결과 초기화
            fileManagerRef.current.clearResults();
            setResults([]);
            setErrorMessages(new Map());
            setProgress(0);
            setProgressText('');
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleRemoveMockup = (index: number) => {
        if (!fileManagerRef.current) return;
        fileManagerRef.current.removeMockup(index);
        setMockups([...fileManagerRef.current.mockups]);
        
        // 기존 결과 초기화
        fileManagerRef.current.clearResults();
        setResults([]);
        setErrorMessages(new Map());
        setProgress(0);
        setProgressText('');
    };

    const handleApply = async () => {
        if (!artwork || mockups.length === 0 || isProcessing) return;
        const engine = engineRef.current;
        const fm = fileManagerRef.current;
        if (!engine || !fm) return;

        fm.clearResults();
        setIsProcessing(true);
        setResults([]);
        setErrorMessages(new Map());
        setProgress(0);
        setProgressText('Photopea 로딩 중...');

        try {
            await engine.waitReady();
        } catch (err) {
            setProgressText('⚠️ Photopea 로딩 실패. 페이지를 새로고침해주세요.');
            setIsProcessing(false);
            return;
        }

        const total = mockups.length;
        let successCount = 0;
        const newResults: Result[] = [];
        const newErrors = new Map<number, string>();

        for (let i = 0; i < total; i++) {
            const mockup = mockups[i];
            setProgressText(`${i + 1}/${total} 처리 중... (${mockup.name})`);
            setProgress(((i) / total) * 100);

            try {
                const jpgBuffer = await engine.replaceSmartObject(
                    mockup.buffer,
                    artwork.buffer,
                    '모양 1' // Default layer name for now
                );

                if (jpgBuffer) {
                    const result = fm.addResult(jpgBuffer, i);
                    newResults.push(result);
                    successCount++;
                } else {
                    throw new Error('JPG 추출 결과가 없습니다.');
                }
            } catch (err: any) {
                console.error(`[${mockup.name}] 처리 실패:`, err);
                newErrors.set(i, err.message || 'Unknown error');
            }
            
            // Update state incrementally so user sees progress
            setResults([...newResults]);
            setErrorMessages(new Map(newErrors));
        }

        setProgress(100);
        setProgressText(`✅ 완료! ${successCount}/${total}개 성공`);
        setIsProcessing(false);
    };

    const handleDownloadAll = () => {
        fileManagerRef.current?.downloadAll();
    };

    const handleDownloadOne = (index: number) => {
        fileManagerRef.current?.downloadOne(index);
    };

    const canApply = artwork !== null && mockups.length > 0;

    return (
        <section className="space-y-8" id="mockup-studio">
            <div className="flex items-center gap-4">
                <span className="bg-primary text-on-primary w-10 h-10 flex items-center justify-center rounded-full font-bold text-lg">1</span>
                <h2 className="text-2xl font-bold tracking-tight">Upload &amp; Create Mockups</h2>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ArtworkUpload artwork={artwork} onUpload={handleArtworkUpload} />
                <MockupUpload mockups={mockups} onUpload={handleMockupUpload} onRemove={handleRemoveMockup} />
            </div>

            <div className="w-full flex flex-col items-center max-w-sm mx-auto mt-6">
                <button
                    id="apply-btn"
                    className={`w-full flex justify-center items-center gap-2 px-8 py-4 rounded-xl font-bold text-lg shadow-md transition-all ${
                        !canApply || isProcessing
                            ? 'bg-surface-variant text-on-surface-variant/50 cursor-not-allowed'
                            : 'bg-primary text-on-primary hover:bg-primary-dim hover:shadow-lg active:scale-95 cursor-pointer'
                    }`}
                    disabled={!canApply || isProcessing}
                    onClick={handleApply}
                >
                    {isProcessing ? (
                        <>
                            <span className="material-symbols-outlined animate-spin-slow">autorenew</span>
                            Processing...
                        </>
                    ) : (
                        <>
                            <span className="material-symbols-outlined">rocket_launch</span>
                            Generate Mockups
                        </>
                    )}
                </button>
                {isProcessing && <ProgressBar progress={progress} text={progressText} />}
                {!isProcessing && progress > 0 && <p className="text-on-surface-variant text-sm text-center mt-2 font-medium">{progressText}</p>}
            </div>

            {/* Always show grid if we have results or errors */}
            <PreviewGrid
                results={results}
                errorMessages={errorMessages}
                mockupNames={mockups.map(m => m.name)}
                onDownloadAll={handleDownloadAll}
                onDownloadOne={handleDownloadOne}
            />

            {/* Hidden Photopea Engine */}
            <iframe
                ref={iframeRef}
                src="https://www.photopea.com#%7B%22environment%22:%7B%22customIO%22:%7B%22save%22:%22app.echoToOE(%27save%27)%22%7D%7D%7D"
                style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px' }}
                allow="cross-origin-isolated"
                title="Photopea Engine"
            />
        </section>
    );
}
