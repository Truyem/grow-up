import { useEffect, useState } from 'react';
import { isOnline } from '../services/onlineGuard';

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState<boolean>(isOnline());

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return online;
}
