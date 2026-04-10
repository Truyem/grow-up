/**
 * scheduleNotifications.ts
 * Cancel all local notifications for the Android app.
 */

export async function scheduleAllDailyNotifications(plan?: any): Promise<void> {
    const ln = (window as any).Capacitor?.Plugins?.LocalNotifications;
    if (!ln) {
        // Không có Capacitor bridge → đang chạy trên web, bỏ qua
        return;
    }

    try {
        // Cancel toàn bộ notifications cũ (ID 1000-1050) đã được set trước đây
        const idsToCancel = Array.from({ length: 51 }, (_, i) => ({ id: 1000 + i }));
        await ln.cancel({ notifications: idsToCancel }).catch(() => { });
        console.log('[Notifications] Đã gỡ toàn bộ thông báo lịch trình trên app Android theo yêu cầu.');
    } catch (e) {
        console.warn('[Notifications] Không thể huỷ thông báo:', e);
    }
}
