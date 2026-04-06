'use client';

import { Result } from '@/lib/files';

interface Props {
    results: Result[];
    errorMessages: Map<number, string>; // mockup index -> error message
    mockupNames: string[];
    onDownloadAll: () => void;
    onDownloadOne: (index: number) => void;
}

export default function PreviewGrid({ results, errorMessages, mockupNames, onDownloadAll, onDownloadOne }: Props) {
    if (results.length === 0 && errorMessages.size === 0) return null;

    // We create a combined array of successes and failures based on the total mockups
    const cards = mockupNames.map((name, i) => {
        const result = results.find(r => r.name.includes(`p${i + 1}.jpg`) || r.name === `p${i + 1}.jpg`);
        const error = errorMessages.get(i);
        return { index: i, name, result, error };
    });

    return (
        <div className="bg-surface-container-lowest rounded-xl p-8 shadow-sm mt-8 animate-card-fade-in">
            <div className="flex justify-between items-center mb-8">
                <h3 className="font-bold text-xl">Generated Previews</h3>
                {results.length > 0 && (
                    <button
                        onClick={onDownloadAll}
                        className="bg-gradient-to-br from-primary to-primary-dim text-on-primary px-6 py-2.5 rounded-lg flex items-center gap-2 font-medium hover:opacity-90 transition-all scale-95 active:opacity-80 shadow-md shadow-primary/10"
                    >
                        <span className="material-symbols-outlined text-[20px]">download</span>
                        Download All
                    </button>
                )}
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {cards.map((card) => {
                    if (card.result) {
                        return (
                            <div key={card.index} className="group relative bg-surface-container-low rounded-lg overflow-hidden aspect-square border border-outline-variant/20 shadow-sm transition-transform hover:-translate-y-1 hover:shadow-md">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    className="w-full h-full object-cover"
                                    src={card.result.url}
                                    alt={card.result.name}
                                />
                                <div className="absolute inset-0 bg-on-surface/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center flex-col gap-2">
                                    <button
                                        onClick={() => onDownloadOne(results.indexOf(card.result!))}
                                        className="bg-surface-container-lowest text-on-surface p-3 rounded-full shadow-lg hover:scale-110 transition-transform"
                                        title="Download"
                                    >
                                        <span className="material-symbols-outlined">download</span>
                                    </button>
                                </div>
                                <div className="absolute bottom-0 inset-x-0 bg-surface-container-lowest/90 px-3 py-2 text-xs font-semibold text-center truncate border-t border-outline-variant/20">
                                    {card.name}
                                </div>
                            </div>
                        );
                    } else if (card.error) {
                        return (
                            <div key={card.index} className="bg-surface-container-low rounded-lg overflow-hidden aspect-square border-2 border-error/50 flex flex-col items-center justify-center p-4 text-center shadow-sm">
                                <span className="material-symbols-outlined text-error text-3xl mb-2">error</span>
                                <div className="text-sm font-bold text-error mb-1 truncate w-full">{card.name}</div>
                                <div className="text-xs text-error-dim overflow-hidden line-clamp-3 leading-tight">{card.error}</div>
                            </div>
                        );
                    }
                    return null;
                })}
            </div>
        </div>
    );
}
