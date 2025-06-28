import type { Dispatch, SetStateAction } from "react";
import { useEffect, useState } from "react";

const useTimer = (
  seconds: number
): [number, Dispatch<SetStateAction<number>>] => {
  const [timer, setTimer] = useState(seconds);

  useEffect(() => {
    if (!timer) return;

    const interval = setInterval(() => setTimer((count) => count - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  return [timer, setTimer];
};

export default useTimer;
