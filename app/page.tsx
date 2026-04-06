import MockupStudio from '@/components/mockup/MockupStudio';
import SmartResize from '@/components/resize/SmartResize';

export default function Home() {
    return (
        <div className="max-w-6xl mx-auto px-6 py-12">
            {/* Header Introduction */}
            <div className="mb-12 text-center">
                <h1 className="text-4xl font-extrabold tracking-tight text-on-surface mb-2 font-headline">
                    Workspace Central
                </h1>
                <p className="text-on-surface-variant max-w-2xl mx-auto">
                    Design, automate, and export your Etsy listings in one focused flow. No clutter, just creation.
                </p>
            </div>

            <div className="space-y-16">
                <MockupStudio />
                <SmartResize />
            </div>
        </div>
    );
}
