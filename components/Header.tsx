'use client';

const navItems = [
    { label: 'Mockup Studio', href: '#mockup-studio', active: true },
    { label: 'Smart Resize', href: '#smart-resize', active: false },
    { label: 'Inventory', href: '#', active: false },
    { label: 'Analytics', href: '#', active: false },
];

export default function Header() {
    return (
        <header className="glass-header shadow-sm sticky top-0 z-50">
            <div className="flex justify-between items-center w-full px-6 py-3 max-w-full">
                <div className="flex items-center gap-8">
                    <span className="text-xl font-bold tracking-tight text-stone-900 font-headline">
                        YgBoutique의 Magic Tools&nbsp;&nbsp;
                    </span>
                    <nav className="hidden md:flex gap-6">
                        {navItems.map((item) => (
                            <a
                                key={item.label}
                                href={item.href}
                                className={
                                    item.active
                                        ? 'text-primary border-b-2 border-primary pb-1 font-semibold'
                                        : 'text-on-surface-variant hover:text-on-surface transition-colors'
                                }
                            >
                                {item.label}
                            </a>
                        ))}
                    </nav>
                </div>
                <div className="flex items-center gap-4">
                    {/* Future: user menu, settings */}
                </div>
            </div>
        </header>
    );
}
