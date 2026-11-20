import { useEffect, useState } from 'react';

import { clockUntilNextChallenge } from '@/utils/dates';

/** h:mm:ss until the next daily games (UTC midnight), ticking every second. */
export function useCountdown() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return clockUntilNextChallenge(now);
}
