'use client';

interface Props {
    progress: number; // 0 to 100
    text: string;
}

export default function ProgressBar({ progress, text }: Props) {
    return (
        <div className="w-full processing">
            <div className="w-full h-[6px] bg-outline-variant/30 rounded-full mt-5 mb-2 overflow-hidden shadow-inner">
                <div 
                    className="h-full progress-fill" 
                    style={{ width: `${progress}%` }}
                />
            </div>
            <p className="text-on-surface-variant text-sm text-center animate-pulse-text font-medium">
                {text}
            </p>
        </div>
    );
}
