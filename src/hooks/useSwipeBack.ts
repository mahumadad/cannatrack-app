import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Hook that detects a right-swipe starting from the left edge of the screen
 * and navigates back (like the iOS swipe-back gesture).
 *
 * @param enabled  – set to false to temporarily disable (e.g. during modals)
 * @param edgeZone – max X position (px) where the swipe must start (default 30)
 * @param threshold – min horizontal distance (px) to trigger navigation (default 80)
 */
export default function useSwipeBack(
  enabled = true,
  edgeZone = 30,
  threshold = 80,
) {
  const navigate = useNavigate();
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch.clientX <= edgeZone) {
        startX.current = touch.clientX;
        startY.current = touch.clientY;
      } else {
        startX.current = null;
        startY.current = null;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (startX.current === null || startY.current === null) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - startX.current;
      const dy = Math.abs(touch.clientY - startY.current);

      // Must swipe right, far enough, and mostly horizontal
      if (dx >= threshold && dy < dx * 0.6) {
        navigate(-1);
      }

      startX.current = null;
      startY.current = null;
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [enabled, edgeZone, threshold, navigate]);
}
