import { useEffect, useState, type RefObject } from "react";

export function useLiveElapsed(
  isLoading: boolean,
  turnStartRef: RefObject<number | null>,
): number | null {
  const [liveElapsed, setLiveElapsed] = useState<number | null>(null);

  useEffect(() => {
    if (!isLoading) return;
    const interval = setInterval(() => {
      if (turnStartRef.current !== null) {
        setLiveElapsed((Date.now() - turnStartRef.current) / 1000);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [isLoading, turnStartRef]);

  return liveElapsed;
}
