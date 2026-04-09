export function useOnlineStatus(): boolean {
  // Offline mode has been removed. Always return true to ensure sync never gets blocked.
  return true;
}
