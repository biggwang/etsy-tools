'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { FileManager } from '@/lib/files';
import {
    RESIZE_TARGETS,
    buildResizeFileName,
    decodeArtwork,
    getContainScaleFactor,
    readArtworkDimensions,
    renderResizeTarget,
} from '@/lib/resize';
import type { ResizeTarget } from '@/lib/resize';
import { createStoredZip, downloadBlob } from '@/lib/zip';

interface ResizeResult {
    target: ResizeTarget;
    fileName: string;
    buffer: ArrayBuffer;
    url: string;
    sizeBytes: number;
    upscaleFactor: number;
}

const defaultTargetIds = RESIZE_TARGETS.map((target) => target.id);

export default function SmartResize() {
    const [artworkFile, setArtworkFile] = useState<File | null>(null);
    const [artworkUrl, setArtworkUrl] = useState<string | null>(null);
    const [artworkDimensions, setArtworkDimensions] = useState<{ width: number; height: number } | null>(null);
    const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>(defaultTargetIds);
    const [results, setResults] = useState<ResizeResult[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState('');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const artworkUrlRef = useRef<string | null>(null);
    const resultsRef = useRef<ResizeResult[]>([]);

    useEffect(() => {
        artworkUrlRef.current = artworkUrl;
    }, [artworkUrl]);

    useEffect(() => {
        resultsRef.current = results;
    }, [results]);

    useEffect(() => {
        return () => {
            if (artworkUrlRef.current) {
                URL.revokeObjectURL(artworkUrlRef.current);
            }
            revokeResultUrls(resultsRef.current);
        };
    }, []);

    const selectedTargets = useMemo(
        () => RESIZE_TARGETS.filter((target) => selectedTargetIds.includes(target.id)),
        [selectedTargetIds],
    );

    const largestUpscale = useMemo(() => {
        if (!artworkDimensions || selectedTargets.length === 0) {
            return null;
        }

        return selectedTargets.reduce<{ target: ResizeTarget; factor: number } | null>((largest, target) => {
            const factor = getContainScaleFactor(artworkDimensions.width, artworkDimensions.height, target);
            if (!largest || factor > largest.factor) {
                return { target, factor };
            }
            return largest;
        }, null);
    }, [artworkDimensions, selectedTargets]);

    const canGenerate = Boolean(artworkFile) && selectedTargets.length > 0 && !isProcessing;
    const hasResults = results.length > 0;

    const handleFileSelection = async (file: File) => {
        if (!file.type.startsWith('image/')) {
            setErrorMessage('이미지 파일만 업로드할 수 있습니다.');
            return;
        }

        if (artworkUrlRef.current) {
            URL.revokeObjectURL(artworkUrlRef.current);
        }
        revokeResultUrls(resultsRef.current);
        resultsRef.current = [];

        const nextUrl = URL.createObjectURL(file);
        setArtworkFile(file);
        setArtworkUrl(nextUrl);
        setResults([]);
        setProgress(0);
        setStatusText('');
        setErrorMessage(null);

        try {
            const dimensions = await readArtworkDimensions(file);
            setArtworkDimensions(dimensions);
        } catch (error) {
            console.error('[SmartResize] 이미지 분석 실패', error);
            setArtworkDimensions(null);
            setErrorMessage('이미지 해상도를 읽는 중 오류가 발생했습니다. 다른 파일로 다시 시도해주세요.');
        }
    };

    const handleInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            await handleFileSelection(file);
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDragOver(false);
        const file = Array.from(event.dataTransfer.files).find((candidate) => candidate.type.startsWith('image/'));
        if (file) {
            await handleFileSelection(file);
        }
    };

    const toggleTarget = (targetId: string) => {
        if (isProcessing) {
            return;
        }

        setSelectedTargetIds((current) => (
            current.includes(targetId)
                ? current.filter((id) => id !== targetId)
                : [...current, targetId]
        ));
    };

    const handleGenerate = async () => {
        if (!artworkFile || selectedTargets.length === 0 || isProcessing) {
            return;
        }

        setIsProcessing(true);
        revokeResultUrls(resultsRef.current);
        resultsRef.current = [];
        setResults([]);
        setProgress(0);
        setErrorMessage(null);
        setStatusText('원본 이미지를 준비하는 중...');

        let decoded: Awaited<ReturnType<typeof decodeArtwork>> | null = null;
        const nextResults: ResizeResult[] = [];

        try {
            decoded = await decodeArtwork(artworkFile);

            for (let index = 0; index < selectedTargets.length; index++) {
                const target = selectedTargets[index];
                setStatusText(`${index + 1}/${selectedTargets.length} 변환 중... (${target.label})`);
                const blob = await renderResizeTarget(decoded, target);
                const buffer = await blob.arrayBuffer();
                const url = URL.createObjectURL(blob);

                nextResults.push({
                    target,
                    fileName: buildResizeFileName(target),
                    buffer,
                    url,
                    sizeBytes: blob.size,
                    upscaleFactor: getContainScaleFactor(decoded.width, decoded.height, target),
                });

                setResults([...nextResults]);
                setProgress(Math.round(((index + 1) / selectedTargets.length) * 100));
            }

            setStatusText(`✅ 완료! ${nextResults.length}개의 300dpi JPG가 준비되었습니다.`);
        } catch (error) {
            console.error('[SmartResize] 리사이즈 실패', error);
            setErrorMessage(error instanceof Error ? error.message : '리사이즈 처리 중 오류가 발생했습니다.');
            setStatusText('⚠️ 일부 파일 생성에 실패했습니다.');
        } finally {
            decoded?.dispose();
            setIsProcessing(false);
        }
    };

    const handleDownloadZip = () => {
        if (!results.length) {
            return;
        }

        const zipBlob = createStoredZip(
            results.map((result) => ({
                name: result.fileName,
                data: result.buffer,
            })),
        );
        downloadBlob(zipBlob, 'product.zip');
    };

    const handleDownloadSingle = (result: ResizeResult) => {
        downloadBlob(new Blob([result.buffer], { type: 'image/jpeg' }), result.fileName);
    };

    return (
        <section className="space-y-8 mt-16" id="smart-resize">
            <div className="flex items-center gap-4">
                <span className="bg-primary text-on-primary w-10 h-10 flex items-center justify-center rounded-full font-bold text-lg">2</span>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Smart Resize &amp; Export</h2>
                    <p className="text-sm text-on-surface-variant mt-1">
                        Contain 기준으로 원본 전체를 유지한 채 맞춰 넣고, 선택한 사이즈를 300dpi JPG로 만들어 product.zip으로 다운로드합니다.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_1.4fr] gap-6">
                <div
                    className={`bg-surface-container-low rounded-xl p-8 flex flex-col items-center justify-center text-center group transition-all cursor-pointer border-2 border-dashed ${
                        isDragOver ? 'upload-zone-active border-primary' : 'border-outline-variant/30 hover:bg-surface-container'
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(event) => {
                        event.preventDefault();
                        setIsDragOver(true);
                    }}
                    onDragLeave={(event) => {
                        event.preventDefault();
                        setIsDragOver(false);
                    }}
                    onDrop={handleDrop}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={handleInputChange}
                    />

                    {!artworkUrl ? (
                        <>
                            <div className="w-16 h-16 bg-primary-container/60 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-primary text-3xl">upload_file</span>
                            </div>
                            <h3 className="font-bold text-lg mb-1">대표 아트워크 업로드</h3>
                            <p className="text-on-surface-variant text-sm px-8">
                                PNG, JPG, WEBP 등 이미지를 올리면 선택한 비율에 맞춰 contain 방식으로 자동 리사이즈합니다.
                            </p>
                        </>
                    ) : (
                        <div className="flex flex-col items-center w-full">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={artworkUrl}
                                alt={artworkFile?.name ?? 'Artwork preview'}
                                className="w-full max-w-[280px] max-h-[280px] rounded-xl border border-outline-variant/30 object-contain bg-surface-container-lowest shadow-sm"
                            />
                            <div className="mt-4 space-y-1 text-sm text-on-surface-variant">
                                <p className="font-semibold text-on-surface">{artworkFile?.name}</p>
                                <p>{artworkFile ? FileManager.formatSize(artworkFile.size) : ''}</p>
                                {artworkDimensions && (
                                    <p>
                                        원본 해상도: {artworkDimensions.width.toLocaleString()} x {artworkDimensions.height.toLocaleString()} px
                                    </p>
                                )}
                            </div>
                            <button
                                className="mt-4 text-xs font-bold text-primary uppercase tracking-wider hover:opacity-80"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    fileInputRef.current?.click();
                                }}
                            >
                                Change File
                            </button>
                        </div>
                    )}
                </div>

                <div className="bg-surface-container-low rounded-xl p-6 space-y-5">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="font-bold text-lg">Target Sizes</p>
                            <p className="text-sm text-on-surface-variant mt-1">
                                기본값은 전체 선택입니다. 필요 없는 비율은 클릭해서 제외하세요.
                            </p>
                        </div>
                        <div className="text-right text-xs text-on-surface-variant">
                            <p>Processing Mode</p>
                            <p className="font-semibold text-on-surface">Contain / Full Image</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                        {RESIZE_TARGETS.map((target) => {
                            const selected = selectedTargetIds.includes(target.id);
                            return (
                                <button
                                    key={target.id}
                                    type="button"
                                    onClick={() => toggleTarget(target.id)}
                                    className={`rounded-xl border p-4 text-left transition-all ${
                                        selected
                                            ? 'bg-primary-container text-on-primary-container border-primary/30 shadow-sm'
                                            : 'bg-surface-container-lowest border-outline-variant/30 text-on-surface hover:border-primary/30 hover:-translate-y-0.5'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-bold text-sm">{target.label}</p>
                                            <p className="text-xs opacity-80 mt-1">{target.shortLabel}</p>
                                        </div>
                                        <span className="material-symbols-outlined text-base">
                                            {selected ? 'check_circle' : 'add_circle'}
                                        </span>
                                    </div>
                                    <div className="mt-3 text-[11px] opacity-80 space-y-0.5">
                                        <p>{target.widthPx.toLocaleString()} x {target.heightPx.toLocaleString()} px</p>
                                        <p>{target.dpi} dpi / {target.printSize}</p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {largestUpscale && largestUpscale.factor > 1 ? (
                        <div className="rounded-xl border border-error/20 bg-on-error px-4 py-3 text-sm text-on-surface">
                            <p className="font-semibold text-error">해상도 주의</p>
                            <p className="mt-1 text-on-surface-variant">
                                현재 원본은 최대 <span className="font-semibold text-on-surface">{largestUpscale.factor.toFixed(2)}x</span> 업스케일이 필요합니다.
                                가장 부담이 큰 사이즈는 <span className="font-semibold text-on-surface">{largestUpscale.target.label}</span> 입니다.
                            </p>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-primary/15 bg-primary-fixed px-4 py-3 text-sm text-on-surface">
                            <p className="font-semibold text-primary">출력 방식</p>
                            <p className="mt-1 text-on-surface-variant">
                                모든 결과는 원본 전체가 보이도록 contain 방식으로 순차 처리되며, JPG 내부 density는 300dpi로 패치됩니다.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-surface-container-low rounded-xl p-6 space-y-5">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <p className="font-bold text-lg">Export</p>
                        <p className="text-sm text-on-surface-variant mt-1">
                            선택한 {selectedTargets.length}개 사이즈를 순차적으로 JPG 생성 후 zip으로 묶습니다.
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            type="button"
                            onClick={handleGenerate}
                            disabled={!canGenerate}
                            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                                canGenerate
                                    ? 'bg-primary text-on-primary hover:bg-primary-dim shadow-sm'
                                    : 'bg-surface-variant text-on-surface-variant/60 cursor-not-allowed'
                            }`}
                        >
                            {isProcessing ? 'Generating...' : 'Generate JPG Files'}
                        </button>
                        <button
                            type="button"
                            onClick={handleDownloadZip}
                            disabled={!hasResults || isProcessing}
                            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                                hasResults && !isProcessing
                                    ? 'bg-surface-container-lowest border border-outline-variant/30 text-on-surface hover:border-primary/30'
                                    : 'bg-surface-variant text-on-surface-variant/60 cursor-not-allowed'
                            }`}
                        >
                            Download product.zip
                        </button>
                    </div>
                </div>

                {(isProcessing || statusText) && (
                    <div className="space-y-2">
                        <div className="h-2 rounded-full bg-surface-container-high overflow-hidden">
                            <div className="progress-fill h-full rounded-full" style={{ width: `${progress}%` }} />
                        </div>
                        <p className="text-sm font-medium text-on-surface-variant">{statusText || '대기 중...'}</p>
                    </div>
                )}

                {errorMessage && (
                    <div className="rounded-xl border border-error/20 bg-on-error px-4 py-3 text-sm text-error">
                        {errorMessage}
                    </div>
                )}
            </div>

            {hasResults && (
                <div className="bg-surface-container-lowest rounded-xl p-8 shadow-sm animate-card-fade-in">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
                        <div>
                            <h3 className="font-bold text-xl">Generated Resize Files</h3>
                            <p className="text-sm text-on-surface-variant mt-1">
                                모든 파일은 contain 기준, JPG 형식, 300dpi로 생성되었습니다.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleDownloadZip}
                            className="bg-gradient-to-br from-primary to-primary-dim text-on-primary px-6 py-2.5 rounded-lg flex items-center gap-2 font-medium hover:opacity-90 transition-all shadow-md shadow-primary/10"
                        >
                            <span className="material-symbols-outlined text-[20px]">download</span>
                            Download product.zip
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {results.map((result) => (
                            <article
                                key={result.target.id}
                                className="rounded-xl border border-outline-variant/20 bg-surface-container-low overflow-hidden shadow-sm"
                            >
                                <div className="aspect-[4/3] bg-surface-container flex items-center justify-center p-4">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={result.url}
                                        alt={result.fileName}
                                        className="w-full h-full object-contain rounded-lg bg-surface-container-lowest"
                                    />
                                </div>
                                <div className="p-4 space-y-2">
                                    <div>
                                        <p className="font-bold text-sm">{result.target.label}</p>
                                        <p className="text-xs text-on-surface-variant mt-1">{result.fileName}</p>
                                    </div>
                                    <div className="text-xs text-on-surface-variant space-y-1">
                                        <p>{result.target.widthPx.toLocaleString()} x {result.target.heightPx.toLocaleString()} px</p>
                                        <p>{result.target.printSize} / {result.target.dpi} dpi</p>
                                        <p>{FileManager.formatSize(result.sizeBytes)}</p>
                                        {result.upscaleFactor > 1 && (
                                            <p className="text-error">업스케일 {result.upscaleFactor.toFixed(2)}x</p>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleDownloadSingle(result)}
                                        className="w-full mt-2 bg-surface-container-lowest border border-outline-variant/30 text-sm font-semibold rounded-lg px-4 py-2 hover:border-primary/30 transition-colors"
                                    >
                                        Download JPG
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
}

function revokeResultUrls(results: ResizeResult[]): void {
    results.forEach((result) => URL.revokeObjectURL(result.url));
}
