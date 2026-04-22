let onlineStatus = typeof navigator !== 'undefined' ? navigator.onLine : true;
let listeners: Array<(online: boolean) => void> = [];

function notifyListeners() {
  listeners.forEach(callback => callback(onlineStatus));
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    onlineStatus = true;
    notifyListeners();
  });
  window.addEventListener('offline', () => {
    onlineStatus = false;
    notifyListeners();
  });
}

export const ONLINE_ONLY_OFFLINE_MESSAGE = 'Vui lòng kết nối internet để thực hiện thao tác này';
export const OFFLINE_WARNING = 'Bạn đang ngoại tuyến';

export const isOnline = (): boolean => {
  return onlineStatus;
};

export const canPerformOnlineAction = (action?: string, showToast?: (msg: string, type: string) => void): boolean => {
  if (!onlineStatus) {
    if (showToast) {
      showToast(ONLINE_ONLY_OFFLINE_MESSAGE, 'error');
    }
    return false;
  }
  return true;
};

export const subscribeToOnlineStatus = (callback: (online: boolean) => void): (() => void) => {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter(cb => cb !== callback);
  };
};
