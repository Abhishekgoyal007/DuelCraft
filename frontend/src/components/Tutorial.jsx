import { useState, useEffect, createContext, useContext } from 'react';

const TutorialContext = createContext();

// Tutorial steps configuration
const TUTORIAL_STEPS = [
    {
        id: 'welcome',
        title: 'Welcome to DuelCraft! ⚔️',
        message: 'A blockchain-powered 1v1 fighting game on Mantle Network. Let\'s show you around!',
        position: 'center',
    },
    {
        id: 'wallet',
        title: 'Connect Your Wallet 🔗',
        message: 'Click the Connect Wallet button to link your crypto wallet. You\'ll need MNT tokens for transactions.',
        target: '[data-tutorial="wallet"]',
        position: 'bottom',
    },
    {
        id: 'character',
        title: 'Create Your Fighter ⚒️',
        message: 'Visit the Forge to design and mint your unique NFT character. Each fighter has different abilities!',
        target: '[data-tutorial="forge"]',
        position: 'bottom',
    },
    {
        id: 'battle',
        title: 'Enter the Arena ⚔️',
        message: 'Challenge other players in real-time 1v1 battles. Win to earn coins and climb the leaderboard!',
        target: '[data-tutorial="battle"]',
        position: 'bottom',
    },
    {
        id: 'shop',
        title: 'Upgrade Your Gear 🛡️',
        message: 'Visit the Armory to buy weapons, armor, and special abilities to power up your fighter.',
        target: '[data-tutorial="shop"]',
        position: 'bottom',
    },
    {
        id: 'ready',
        title: 'You\'re Ready! 🎮',
        message: 'That\'s everything! Start by creating your fighter or jump straight into battle. Good luck, warrior!',
        position: 'center',
    },
];

// Individual tooltip component
function TutorialTooltip({ step, onNext, onSkip, currentStep, totalSteps }) {
    const [position, setPosition] = useState({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });

    useEffect(() => {
        if (step.target) {
            const element = document.querySelector(step.target);
            if (element) {
                const rect = element.getBoundingClientRect();
                const pos = {
                    top: step.position === 'top' ? `${rect.top - 20}px` : `${rect.bottom + 20}px`,
                    left: `${rect.left + rect.width / 2}px`,
                    transform: step.position === 'top' ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
                };
                setPosition(pos);

                // Highlight the target element
                element.style.position = 'relative';
                element.style.zIndex = '1001';
                element.classList.add('ring-4', 'ring-amber-500', 'ring-offset-2', 'ring-offset-transparent');

                return () => {
                    element.style.zIndex = '';
                    element.classList.remove('ring-4', 'ring-amber-500', 'ring-offset-2', 'ring-offset-transparent');
                };
            }
        } else {
            setPosition({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });
        }
    }, [step]);

    return (
        <div
            className="fixed z-[1002] max-w-sm animate-fade-in"
            style={position}
        >
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border-2 border-amber-500/50 shadow-2xl shadow-amber-500/20">
                {/* Arrow */}
                {step.target && (
                    <div
                        className={`absolute w-4 h-4 bg-slate-800 border-l-2 border-t-2 border-amber-500/50 transform rotate-45 ${step.position === 'top' ? 'bottom-0 translate-y-2' : 'top-0 -translate-y-2'
                            } left-1/2 -translate-x-1/2`}
                    />
                )}

                {/* Content */}
                <h3 className="text-xl font-black text-amber-400 mb-2 font-display">
                    {step.title}
                </h3>
                <p className="text-white/80 text-sm mb-4 leading-relaxed">
                    {step.message}
                </p>

                {/* Progress */}
                <div className="flex items-center gap-2 mb-4">
                    {TUTORIAL_STEPS.map((_, i) => (
                        <div
                            key={i}
                            className={`h-1.5 flex-1 rounded-full transition-colors ${i <= currentStep ? 'bg-amber-500' : 'bg-white/20'
                                }`}
                        />
                    ))}
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-between gap-3">
                    <button
                        onClick={onSkip}
                        className="px-4 py-2 text-white/60 hover:text-white text-sm font-medium transition-colors"
                    >
                        Skip Tour
                    </button>
                    <button
                        onClick={onNext}
                        className="px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold rounded-xl transition-all hover:scale-105 shadow-lg"
                    >
                        {currentStep === totalSteps - 1 ? 'Get Started!' : 'Next →'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Tutorial overlay
function TutorialOverlay({ onClose }) {
    const [currentStep, setCurrentStep] = useState(0);

    const handleNext = () => {
        if (currentStep < TUTORIAL_STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            onClose();
        }
    };

    const handleSkip = () => {
        onClose();
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/70 z-[1000]"
                onClick={handleSkip}
            />

            {/* Tooltip */}
            <TutorialTooltip
                step={TUTORIAL_STEPS[currentStep]}
                onNext={handleNext}
                onSkip={handleSkip}
                currentStep={currentStep}
                totalSteps={TUTORIAL_STEPS.length}
            />
        </>
    );
}

// Tutorial Provider
export function TutorialProvider({ children }) {
    const [showTutorial, setShowTutorial] = useState(false);
    const [hasSeenTutorial, setHasSeenTutorial] = useState(() => {
        return localStorage.getItem('duelcraft_tutorial_seen') === 'true';
    });

    const startTutorial = () => {
        setShowTutorial(true);
    };

    const endTutorial = () => {
        setShowTutorial(false);
        setHasSeenTutorial(true);
        localStorage.setItem('duelcraft_tutorial_seen', 'true');
    };

    const resetTutorial = () => {
        localStorage.removeItem('duelcraft_tutorial_seen');
        setHasSeenTutorial(false);
    };

    // Show tutorial on first visit (only on hub page)
    useEffect(() => {
        if (!hasSeenTutorial && window.location.pathname === '/hub') {
            const timer = setTimeout(() => {
                setShowTutorial(true);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [hasSeenTutorial]);

    return (
        <TutorialContext.Provider value={{ startTutorial, endTutorial, resetTutorial, hasSeenTutorial }}>
            {children}
            {showTutorial && <TutorialOverlay onClose={endTutorial} />}
        </TutorialContext.Provider>
    );
}

// Hook to use tutorial
export function useTutorial() {
    const context = useContext(TutorialContext);
    if (!context) {
        throw new Error('useTutorial must be used within a TutorialProvider');
    }
    return context;
}

// Tooltip component for inline hints
export function Tooltip({ children, content, position = 'top' }) {
    const [isVisible, setIsVisible] = useState(false);

    const positionClasses = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    };

    return (
        <div
            className="relative inline-block"
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
        >
            {children}
            {isVisible && (
                <div className={`absolute z-50 ${positionClasses[position]} animate-fade-in`}>
                    <div className="bg-slate-800 text-white text-sm px-3 py-2 rounded-lg shadow-xl border border-white/10 whitespace-nowrap">
                        {content}
                    </div>
                </div>
            )}
        </div>
    );
}

export default TutorialProvider;
