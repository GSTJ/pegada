import { useEffect, useState } from "react";
export interface LikeLimitReachedProps {
  likeLimitResetAt: Date;
}

export const getCountdownState = (likeLimitResetAt: Date, now = new Date()) => {
  const remainingMillis = likeLimitResetAt.getTime() - now.getTime();
  const totalMinutes = Math.ceil(Math.max(remainingMillis, 0) / 60_000);

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return {
    isExpired: remainingMillis <= 0,
    timeLeft: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
  };
};

export const useCountdown = (likeLimitResetAt: Date) => {
  const [countdown, setCountdown] = useState(() => getCountdownState(likeLimitResetAt));

  useEffect(() => {
    const updateCountdown = () => {
      const nextCountdown = getCountdownState(likeLimitResetAt);
      setCountdown(nextCountdown);
      return nextCountdown.isExpired;
    };

    if (updateCountdown()) return;

    const interval = setInterval(() => {
      if (updateCountdown()) {
        clearInterval(interval);
      }
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [likeLimitResetAt]);

  return countdown;
};
