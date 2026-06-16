import { useState, useEffect, useCallback } from 'react';

interface TimerState {
  totalSeconds: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  formatted: string;
}

export function useTimer(targetDate: string | null): TimerState {
  const [totalSeconds, setTotalSeconds] = useState(0);

  const calculate = useCallback(() => {
    if (!targetDate) return 0;
    const diff = new Date(targetDate).getTime() - Date.now();
    return Math.max(0, Math.floor(diff / 1000));
  }, [targetDate]);

  useEffect(() => {
    setTotalSeconds(calculate());

    const interval = setInterval(() => {
      const remaining = calculate();
      setTotalSeconds(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [calculate]);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  const formatted = hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;

  return {
    totalSeconds,
    hours,
    minutes,
    seconds,
    isExpired: totalSeconds <= 0,
    formatted,
  };
}
