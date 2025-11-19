
import React, { useEffect, useRef, useState } from 'react';

declare global {
    interface Window {
        lottie: any;
    }
}

export const HourglassIcon: React.FC<{ className?: string }> = ({ className }) => {
    const container = useRef<HTMLDivElement>(null);
    const [animationData, setAnimationData] = useState(null);

    useEffect(() => {
        import('../../data/hourglassLottie')
            .then(module => setAnimationData(module.default))
            .catch(err => console.error("Failed to load hourglass animation:", err));
    }, []);

    useEffect(() => {
        if (container.current && window.lottie && animationData) {
            const anim = window.lottie.loadAnimation({
                container: container.current,
                renderer: 'svg',
                loop: true,
                autoplay: true,
                animationData: animationData,
            });
            return () => anim.destroy(); // Cleanup on unmount
        }
    }, [animationData]);

    return <div ref={container} className={className}></div>;
};