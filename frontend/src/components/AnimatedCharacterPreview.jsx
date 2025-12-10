// src/components/AnimatedCharacterPreview.jsx
// Displays animated character sprite using frame-by-frame animation
import { useState, useEffect, useRef } from 'react';

/**
 * AnimatedCharacterPreview - Shows animated character sprites
 * Cycles through frames for idle/walk/etc animations
 * 
 * @param {Object} character - Character data from characters.js
 * @param {string} animation - Which animation to play ('idle', 'walk', etc)
 * @param {string} className - Additional CSS classes
 * @param {Object} style - Additional inline styles
 */
export default function AnimatedCharacterPreview({
    character,
    animation = 'idle',
    className = '',
    style = {}
}) {
    const [currentFrame, setCurrentFrame] = useState(0);
    const [loadedFrames, setLoadedFrames] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const intervalRef = useRef(null);

    // Get animation config
    const animConfig = character?.animations?.[animation];
    const frames = animConfig?.frames || [];
    const frameRate = animConfig?.frameRate || 6;
    const loop = animConfig?.loop !== false;

    // Preload all animation frames
    useEffect(() => {
        if (!frames || frames.length === 0) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        let loadedCount = 0;
        const loaded = [];

        frames.forEach((frameSrc, index) => {
            const img = new Image();
            img.onload = () => {
                loaded[index] = frameSrc;
                loadedCount++;
                if (loadedCount === frames.length) {
                    setLoadedFrames(loaded);
                    setIsLoading(false);
                }
            };
            img.onerror = () => {
                console.warn(`Failed to load frame: ${frameSrc}`);
                loaded[index] = null;
                loadedCount++;
                if (loadedCount === frames.length) {
                    setLoadedFrames(loaded.filter(Boolean));
                    setIsLoading(false);
                }
            };
            img.src = frameSrc;
        });
    }, [frames.join(',')]);

    // Animation loop
    useEffect(() => {
        if (loadedFrames.length === 0) return;

        // Clear any existing interval
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        // Start animation
        const frameDuration = 1000 / frameRate;
        intervalRef.current = setInterval(() => {
            setCurrentFrame(prev => {
                const next = prev + 1;
                if (next >= loadedFrames.length) {
                    return loop ? 0 : loadedFrames.length - 1;
                }
                return next;
            });
        }, frameDuration);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [loadedFrames, frameRate, loop]);

    // If no animations, show static image
    if (!animConfig || frames.length === 0) {
        return (
            <img
                src={character?.image}
                alt={character?.name}
                className={`w-full h-full object-contain ${className}`}
                style={{
                    imageRendering: 'pixelated',
                    ...style
                }}
            />
        );
    }

    // Loading state
    if (isLoading) {
        return (
            <div className={`w-full h-full flex items-center justify-center ${className}`}>
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-amber-500 border-t-transparent"></div>
            </div>
        );
    }

    // Show animated frame
    const currentSrc = loadedFrames[currentFrame] || character?.image;

    return (
        <div className={`relative w-full h-full ${className}`} style={style}>
            <img
                src={currentSrc}
                alt={`${character?.name} - ${animation} frame ${currentFrame + 1}`}
                className="w-full h-full object-contain"
                style={{
                    imageRendering: 'pixelated',
                    transform: `scale(${character?.displayScale || 1.6}) translateX(${character?.displayOffsetX || 0}%)`,
                    ...style
                }}
            />

            {/* Frame indicator (for debugging, can be removed) */}
            {process.env.NODE_ENV === 'development' && (
                <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-xs text-white">
                    Frame {currentFrame + 1}/{loadedFrames.length}
                </div>
            )}
        </div>
    );
}
