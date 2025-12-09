import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

// Page transition wrapper with fade and slide animations
export function PageTransition({ children }) {
    const location = useLocation();
    const [isVisible, setIsVisible] = useState(false);
    const [displayChildren, setDisplayChildren] = useState(children);

    useEffect(() => {
        // Start fade out
        setIsVisible(false);

        // After fade out, update children and fade in
        const timer = setTimeout(() => {
            setDisplayChildren(children);
            setIsVisible(true);
        }, 150);

        return () => clearTimeout(timer);
    }, [location.pathname, children]);

    return (
        <div
            className={`transition-all duration-300 ease-out ${isVisible
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-4'
                }`}
        >
            {displayChildren}
        </div>
    );
}

// Loading screen component
export function LoadingScreen({ isLoading, message = 'Loading...', logo = true }) {
    if (!isLoading) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            {/* Animated background particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute rounded-full bg-white/10"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            width: `${4 + Math.random() * 8}px`,
                            height: `${4 + Math.random() * 8}px`,
                            animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
                            animationDelay: `${Math.random() * 2}s`,
                        }}
                    />
                ))}
            </div>

            {/* Logo */}
            {logo && (
                <div className="mb-8 animate-pulse">
                    <img
                        src="/assets/landingpage/tag.png"
                        alt="DuelCraft"
                        className="w-48 h-auto drop-shadow-2xl"
                        onError={(e) => {
                            e.target.style.display = 'none';
                        }}
                    />
                </div>
            )}

            {/* Loading spinner */}
            <div className="relative w-20 h-20 mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-white/10" />
                <div
                    className="absolute inset-0 rounded-full border-4 border-t-amber-500 border-r-amber-500 border-b-transparent border-l-transparent"
                    style={{
                        animation: 'spin 1s linear infinite',
                    }}
                />
                <div
                    className="absolute inset-2 rounded-full border-4 border-t-transparent border-r-transparent border-b-cyan-500 border-l-cyan-500"
                    style={{
                        animation: 'spin 1.5s linear infinite reverse',
                    }}
                />
            </div>

            {/* Loading text */}
            <div className="text-white font-bold text-lg font-display animate-pulse">
                {message}
            </div>

            {/* Animated dots */}
            <div className="flex gap-1 mt-3">
                {[0, 1, 2].map((i) => (
                    <div
                        key={i}
                        className="w-2 h-2 rounded-full bg-amber-500"
                        style={{
                            animation: 'bounce 1s ease-in-out infinite',
                            animationDelay: `${i * 0.15}s`,
                        }}
                    />
                ))}
            </div>

            {/* Animations */}
            <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-20px) translateX(10px); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
        </div>
    );
}

// Page fade-in animation hook
export function useFadeIn(delay = 0) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), delay);
        return () => clearTimeout(timer);
    }, [delay]);

    return isVisible ? 'animate-fade-in' : 'opacity-0';
}

// Staggered animation for lists
export function StaggeredList({ children, staggerMs = 100, className = '' }) {
    return (
        <div className={className}>
            {Array.isArray(children)
                ? children.map((child, index) => (
                    <div
                        key={index}
                        className="animate-fade-in"
                        style={{ animationDelay: `${index * staggerMs}ms` }}
                    >
                        {child}
                    </div>
                ))
                : children
            }
        </div>
    );
}

export default PageTransition;
