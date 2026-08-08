import { useEffect, useRef, useState } from 'react';

/**
 * Hook to trigger reveal animation when element enters viewport.
 */
export function useReveal(threshold = 0.15) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, isVisible];
}

/**
 * Hook for staggered reveal of child items.
 */
export function useStaggerReveal(itemCount, baseDelay = 100) {
  const [ref, isVisible] = useReveal(0.1);
  
  const getDelay = (index) => ({
    animationDelay: `${index * baseDelay}ms`,
  });

  return [ref, isVisible, getDelay];
}

/**
 * Animated counter that ticks up to a target value.
 */
export function useAnimatedCounter(target, duration = 2000, startOnVisible = true) {
  const [count, setCount] = useState(0);
  const [ref, isVisible] = useReveal(0.3);
  const hasStarted = useRef(false);

  useEffect(() => {
    if (startOnVisible && !isVisible) return;
    if (hasStarted.current) return;
    hasStarted.current = true;

    const startTime = performance.now();
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [target, duration, isVisible, startOnVisible]);

  return [ref, count];
}
