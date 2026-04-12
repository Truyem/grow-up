// Completely disable offline mode - always allow actions to sync

export const ONLINE_ONLY_OFFLINE_MESSAGE = '';
export const OFFLINE_WARNING = '';

export const isOnline = (): boolean => {
  return true;
};

export const canPerformOnlineAction = (): boolean => {
  return true;
};
