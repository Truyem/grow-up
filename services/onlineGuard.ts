const OFFLINE_NOTICE_COOLDOWN_MS = 4000;

const lastNoticeByKey = new Map<string, number>();

export const ONLINE_ONLY_OFFLINE_MESSAGE = 'Mất kết nối mạng. Chế độ online-only: không thể lưu dữ liệu khi offline.';

export const isOnline = (): boolean => {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
};

export const canPerformOnlineAction = (
  key: string,
  notify?: (message: string, type?: 'success' | 'info' | 'error') => void,
  message: string = ONLINE_ONLY_OFFLINE_MESSAGE
): boolean => {
  if (isOnline()) return true;

  if (notify) {
    const now = Date.now();
    const lastAt = lastNoticeByKey.get(key) || 0;
    if (now - lastAt >= OFFLINE_NOTICE_COOLDOWN_MS) {
      lastNoticeByKey.set(key, now);
      notify(message, 'error');
    }
  }

  return false;
};
