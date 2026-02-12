import React, { useState, useEffect } from 'react';
import { padZero } from '../utils/dateHelpers';
import type { CountdownState } from '../types';

interface CountdownTimerProps {
  nextDoseDate: Date | null;
  isIntuitive: boolean;
}

const computeCountdown = (nextDoseDate: Date | null): CountdownState => {
  if (!nextDoseDate) return { hours: 0, minutes: 0, seconds: 0, isOverdue: false, isToday: false };

  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const doseDay = new Date(nextDoseDate);
  doseDay.setHours(0, 0, 0, 0);

  const isToday = today.getTime() === doseDay.getTime();
  const diff = nextDoseDate.getTime() - now.getTime();
  const isOverdue = diff <= 0;

  if (isOverdue) {
    const absDiff = Math.abs(diff);
    return {
      hours: Math.floor(absDiff / (1000 * 60 * 60)),
      minutes: Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((absDiff % (1000 * 60)) / 1000),
      isOverdue: true,
      isToday: true
    };
  }

  if (isToday) {
    return {
      hours: Math.floor(diff / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((diff % (1000 * 60)) / 1000),
      isOverdue: false,
      isToday: true
    };
  }

  return { hours: 0, minutes: 0, seconds: 0, isOverdue: false, isToday: false };
};

/**
 * Self-contained countdown timer. Manages its own 1-second interval
 * so the parent component doesn't re-render every second.
 */
const CountdownTimer: React.FC<CountdownTimerProps> = React.memo(({ nextDoseDate, isIntuitive }) => {
  const [countdown, setCountdown] = useState<CountdownState>(() => computeCountdown(nextDoseDate));

  useEffect(() => {
    if (!nextDoseDate || isIntuitive) {
      setCountdown({ hours: 0, minutes: 0, seconds: 0, isOverdue: false, isToday: false });
      return;
    }

    const update = () => setCountdown(computeCountdown(nextDoseDate));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [nextDoseDate, isIntuitive]);

  if (!countdown.isToday && !countdown.isOverdue) return null;

  return (
    <span>
      {countdown.isOverdue ? '-' : ''}{padZero(countdown.hours)}:{padZero(countdown.minutes)}:{padZero(countdown.seconds)}
    </span>
  );
});

CountdownTimer.displayName = 'CountdownTimer';

export default CountdownTimer;
export { computeCountdown };
export type { CountdownTimerProps };
