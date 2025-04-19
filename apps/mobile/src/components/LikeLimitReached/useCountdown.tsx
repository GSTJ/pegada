import { useEffect, useState } from "react";
import { differenceInSeconds } from "date-fns";

export interface LikeLimitReachedProps {
  likeLimitResetAt: Date;
}
const formatTimeLeft = (totalSeconds: number) => {
  // Time's up
  if (totalSeconds < 0) {
    return "00:00";
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};
export const useCountdown = (likeLimitResetAt: Date) => {
  const [timeLeft, setTimeLeft] = useState(
    formatTimeLeft(differenceInSeconds(likeLimitResetAt, new Date()))
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const distanceInSeconds = differenceInSeconds(likeLimitResetAt, now);

      setTimeLeft(formatTimeLeft(distanceInSeconds));

      if (distanceInSeconds <= 0) {
        clearInterval(interval);
        return;
      }
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [likeLimitResetAt]);

  return timeLeft;
};
export const ZERO_TIME_LEFT = formatTimeLeft(0);
