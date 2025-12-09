import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext();

// Toast types with their styles
const TOAST_TYPES = {
    success: {
        bg: 'from-green-600 to-emerald-700',
        border: 'border-green-500',
        icon: '✅',
    },
    error: {
        bg: 'from-red-600 to-rose-700',
        border: 'border-red-500',
        icon: '❌',
    },
    info: {
        bg: 'from-blue-600 to-cyan-700',
        border: 'border-blue-500',
        icon: 'ℹ️',
    },
    warning: {
        bg: 'from-yellow-600 to-orange-700',
        border: 'border-yellow-500',
        icon: '⚠️',
    },
    coins: {
        bg: 'from-yellow-500 to-amber-600',
        border: 'border-yellow-400',
        icon: '🪙',
    },
    battle: {
        bg: 'from-purple-600 to-pink-700',
        border: 'border-purple-500',
        icon: '⚔️',
    },
    nft: {
        bg: 'from-cyan-600 to-blue-700',
        border: 'border-cyan-500',
        icon: '💎',
    },
};

// Individual Toast Component
function Toast({ toast, onRemove }) {
    const type = TOAST_TYPES[toast.type] || TOAST_TYPES.info;

    return (
        <div
            className={`
        relative flex items-center gap-3 px-5 py-4 rounded-2xl
        bg-gradient-to-r ${type.bg} border-2 ${type.border}
        shadow-2xl backdrop-blur-xl
        animate-slide-in-right
        min-w-[280px] max-w-[400px]
        cursor-pointer hover:scale-105 transition-transform
      `}
            onClick={() => onRemove(toast.id)}
            style={{
                animation: 'slideInRight 0.3s ease-out, fadeOut 0.3s ease-in forwards',
                animationDelay: `0s, ${(toast.duration || 4000) - 300}ms`,
            }}
        >
            {/* Icon */}
            <span className="text-2xl">{toast.icon || type.icon}</span>

            {/* Content */}
            <div className="flex-1">
                {toast.title && (
                    <div className="font-black text-white text-sm font-display">
                        {toast.title}
                    </div>
                )}
                <div className="text-white/90 text-sm font-medium">
                    {toast.message}
                </div>
            </div>

            {/* Close button */}
            <button
                onClick={(e) => { e.stopPropagation(); onRemove(toast.id); }}
                className="text-white/60 hover:text-white text-xl transition-colors"
            >
                ×
            </button>

            {/* Progress bar */}
            <div
                className="absolute bottom-0 left-0 h-1 bg-white/30 rounded-b-2xl"
                style={{
                    animation: `shrinkWidth ${toast.duration || 4000}ms linear forwards`,
                }}
            />
        </div>
    );
}

// Toast Container
function ToastContainer({ toasts, removeToast }) {
    return (
        <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3">
            {toasts.map((toast) => (
                <Toast key={toast.id} toast={toast} onRemove={removeToast} />
            ))}

            {/* Animations */}
            <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes fadeOut {
          to {
            opacity: 0;
            transform: translateX(50%);
          }
        }
        @keyframes shrinkWidth {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
        </div>
    );
}

// Toast Provider
export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((options) => {
        const id = Date.now() + Math.random();
        const toast = {
            id,
            type: 'info',
            duration: 4000,
            ...options,
        };

        setToasts((prev) => [...prev, toast]);

        // Auto-remove after duration
        setTimeout(() => {
            removeToast(id);
        }, toast.duration);

        return id;
    }, []);

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    // Convenience methods
    const toast = {
        success: (message, options = {}) => addToast({ type: 'success', message, ...options }),
        error: (message, options = {}) => addToast({ type: 'error', message, ...options }),
        info: (message, options = {}) => addToast({ type: 'info', message, ...options }),
        warning: (message, options = {}) => addToast({ type: 'warning', message, ...options }),
        coins: (amount, options = {}) => addToast({
            type: 'coins',
            title: '💰 Coins Earned!',
            message: `+${amount} Coins`,
            ...options
        }),
        battleWon: (options = {}) => addToast({
            type: 'battle',
            title: '🏆 Victory!',
            message: 'You won the battle!',
            icon: '⚔️',
            ...options,
        }),
        battleLost: (options = {}) => addToast({
            type: 'error',
            title: '💀 Defeat',
            message: 'You lost the battle. Try again!',
            ...options,
        }),
        nftMinted: (options = {}) => addToast({
            type: 'nft',
            title: '🎉 NFT Minted!',
            message: 'Your character is now on the blockchain!',
            duration: 5000,
            ...options,
        }),
        custom: (options) => addToast(options),
    };

    return (
        <ToastContext.Provider value={{ toast, addToast, removeToast }}>
            {children}
            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </ToastContext.Provider>
    );
}

// Hook to use toast
export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context.toast;
}

export default ToastProvider;
