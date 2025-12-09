import { Link, useLocation } from 'react-router-dom';

// Page titles and icons for breadcrumbs
const PAGE_INFO = {
    '/': { title: 'Home', icon: '🏠', parent: null },
    '/hub': { title: 'Game Hub', icon: '🎮', parent: '/' },
    '/creator': { title: 'Forge Hero', icon: '⚒️', parent: '/hub' },
    '/arena': { title: 'Battle Arena', icon: '⚔️', parent: '/hub' },
    '/shop': { title: 'Armory', icon: '🛡️', parent: '/hub' },
    '/marketplace': { title: 'Bazaar', icon: '🏪', parent: '/hub' },
    '/tournament': { title: 'Arena War', icon: '👑', parent: '/hub' },
    '/leaderboard': { title: 'Hall of Fame', icon: '🏆', parent: '/hub' },
    '/season-pass': { title: 'VIP Pass', icon: '⭐', parent: '/hub' },
    '/modes': { title: 'Game Modes', icon: '🎯', parent: '/hub' },
};

// Floating navigation component - use on pages that need navigation
export function FloatingNav({ showHome = true, showBack = true }) {
    const location = useLocation();
    const currentPage = PAGE_INFO[location.pathname] || { title: 'DuelCraft', icon: '🎮', parent: '/hub' };
    const parentPath = currentPage.parent;

    // Don't show on landing page
    if (location.pathname === '/') return null;

    // Don't show on arena page (during battles)
    if (location.pathname === '/arena') return null;

    // Don't show back button on hub page (only home button is there via built-in UI)
    const isHubPage = location.pathname === '/hub';

    return (
        <div className="fixed top-4 left-4 z-50 flex items-center gap-2">
            {/* Back button - hidden on hub page */}
            {showBack && parentPath && !isHubPage && (
                <Link
                    to={parentPath}
                    className="
            group flex items-center justify-center w-12 h-12 rounded-xl
            bg-black/60 backdrop-blur-xl border border-white/20
            hover:bg-black/80 hover:border-white/40 hover:scale-110
            transition-all duration-300 shadow-xl
          "
                    title="Go Back"
                >
                    <span className="text-white text-xl group-hover:scale-110 transition-transform">
                        ←
                    </span>
                </Link>
            )}
        </div>
    );
}

// Simple back button for inline use
export function BackButton({ to, label = 'Back' }) {
    const location = useLocation();
    const currentPage = PAGE_INFO[location.pathname];
    const targetPath = to || currentPage?.parent || '/hub';

    return (
        <Link
            to={targetPath}
            className="
        group inline-flex items-center gap-2 px-5 py-3 rounded-xl
        bg-black/40 backdrop-blur-xl border border-white/20
        hover:bg-black/60 hover:border-white/40 hover:scale-105
        transition-all duration-300
      "
        >
            <span className="text-white/80 group-hover:text-white transition-colors text-xl">
                ←
            </span>
            <span className="text-white/80 group-hover:text-white text-sm font-bold">
                {label}
            </span>
        </Link>
    );
}

// Home button only
export function HomeButton({ size = 'md' }) {
    const sizes = {
        sm: 'px-3 py-2 text-sm w-10 h-10',
        md: 'px-5 py-3 text-base w-12 h-12',
        lg: 'px-6 py-4 text-lg w-14 h-14',
    };

    return (
        <Link
            to="/hub"
            className={`
        inline-flex items-center justify-center gap-2 rounded-xl
        bg-gradient-to-r from-amber-600 to-orange-600
        border-2 border-amber-400/50
        hover:from-amber-500 hover:to-orange-500
        transition-all duration-300 hover:scale-110
        shadow-lg shadow-amber-500/30
        font-bold text-white
        ${sizes[size]}
      `}
            title="Game Hub"
        >
            <img
                src="/assets/logos/home.png"
                alt="Hub"
                className="w-6 h-6 object-contain"
                onError={(e) => { e.target.textContent = '🏠'; }}
            />
        </Link>
    );
}

export default FloatingNav;
