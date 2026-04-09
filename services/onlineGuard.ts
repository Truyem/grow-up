// Completely disable offline mode and PWA protections
// All actions are now considered "online" to force sync.

export const ONLINE_ONLY_OFFLINE_MESSAGE = '';

export const isOnline = (): boolean => {
  return true; // Force true
};

export const canPerformOnlineAction = (
  key: string,
  notify?: (message: string, type?: 'success' | 'info' | 'error') => void,
  message: string = ONLINE_ONLY_OFFLINE_MESSAGE
): boolean => {
  return true; // Force true
};
