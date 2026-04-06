'use client';

export default function SmartResize() {
    return (
        <section className="space-y-8 mt-16 opacity-50 pointer-events-none" id="smart-resize">
            <div className="flex items-center gap-4">
                <span className="bg-primary text-on-primary w-10 h-10 flex items-center justify-center rounded-full font-bold text-lg">2</span>
                <h2 className="text-2xl font-bold tracking-tight">Smart Resize &amp; Export (Coming Soon)</h2>
            </div>
            <div className="bg-surface-container-low rounded-xl p-6">
                <div className="flex flex-col md:flex-row gap-8">
                    {/* Source File Upload */}
                    <div className="w-full md:w-1/3 space-y-4">
                        <div className="bg-surface-container-lowest border-2 border-primary/20 rounded-lg p-6 text-center h-full flex flex-col justify-center">
                            <span className="material-symbols-outlined text-primary mb-3 text-3xl">add_photo_alternate</span>
                            <p className="font-semibold text-sm">Source Image</p>
                            <p className="text-xs text-on-surface-variant mt-1">Pending Generation</p>
                            <button className="mt-4 text-xs font-bold text-primary uppercase tracking-wider hover:opacity-80 transition-opacity">Select File</button>
                        </div>
                    </div>
                    {/* Multi-Select Grid */}
                    <div className="w-full md:w-2/3">
                        <p className="font-bold mb-4">Select Target Sizes</p>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                            <div className="bg-primary-container text-on-primary-container p-3 rounded-lg border border-primary/20 text-center cursor-not-allowed">
                                <p className="text-xs font-bold">2:3 Ratio</p>
                                <p className="text-[10px] opacity-70">24x36in</p>
                            </div>
                            <div className="bg-primary-container text-on-primary-container p-3 rounded-lg border border-primary/20 text-center cursor-not-allowed">
                                <p className="text-xs font-bold">4:5 Ratio</p>
                                <p className="text-[10px] opacity-70">16x20in</p>
                            </div>
                            <div className="bg-surface-container-highest p-3 rounded-lg text-center cursor-not-allowed text-on-surface-variant">
                                <p className="text-xs font-bold">ISO</p>
                                <p className="text-[10px] opacity-70">A1-A4</p>
                            </div>
                            <div className="bg-primary-container text-on-primary-container p-3 rounded-lg border border-primary/20 text-center cursor-not-allowed">
                                <p className="text-xs font-bold">11:14</p>
                                <p className="text-[10px] opacity-70">Standard</p>
                            </div>
                            <div className="bg-surface-container-highest p-3 rounded-lg text-center cursor-not-allowed text-on-surface-variant">
                                <p className="text-xs font-bold">1:1</p>
                                <p className="text-[10px] opacity-70">Square</p>
                            </div>
                            <div className="bg-surface-container-highest p-3 rounded-lg text-center cursor-not-allowed text-on-surface-variant">
                                <p className="text-xs font-bold">3:4</p>
                                <p className="text-[10px] opacity-70">18x24in</p>
                            </div>
                            <div className="bg-surface-container-highest p-3 rounded-lg text-center cursor-not-allowed text-on-surface-variant flex items-center justify-center">
                                <span className="material-symbols-outlined text-sm">add</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
