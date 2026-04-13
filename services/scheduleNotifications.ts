/**
 * scheduleNotifications.ts
 * Schedule local notifications for each daily schedule item using Capacitor bridge.
 * Works in Capacitor WebView (Android) via window.Capacitor.Plugins.LocalNotifications.
 */

interface ScheduleItem {
    time: string;
    label: string;
    detail?: string;
}

/**
 * Parse "HH:MM" hoặc "HH:MM - HH:MM" → trả về Date hôm nay với giờ đó
 * Trả về null nếu giờ đã qua
 */
function parseTimeToday(timeStr: string): Date | null {
    // Lấy phần đầu nếu có " - "
    const clean = timeStr.split(' - ')[0].trim();
    const [hStr, mStr] = clean.split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr || '0', 10);
    if (isNaN(h) || isNaN(m)) return null;

    const now = new Date();
    const target = new Date();
    target.setHours(h, m, 0, 0);

    // Nếu giờ đã qua hơn 1 phút, bỏ qua
    if (target.getTime() <= now.getTime() + 60_000) return null;
    return target;
}

/**
 * Schedule local notifications cho tất cả lịch trình hôm nay.
 * Gọi hàm này sau khi user đăng nhập hoặc khi thay đổi plan.
 */
export async function scheduleAllDailyNotifications(plan?: any): Promise<void> {
    const ln = (window as any).Capacitor?.Plugins?.LocalNotifications;
    if (!ln) {
        // Không có Capacitor bridge → đang chạy trên web, bỏ qua
        return;
    }

    // Android 13+ cần quyền runtime cho thông báo
    try {
        const currentPerm = await ln.checkPermissions?.();
        let displayPerm = currentPerm?.display;

        if (displayPerm !== 'granted') {
            const reqPerm = await ln.requestPermissions?.();
            displayPerm = reqPerm?.display;
        }

        if (displayPerm && displayPerm !== 'granted') {
            console.warn('[Notifications] Chưa được cấp quyền thông báo local:', displayPerm);
            return;
        }
    } catch (e) {
        console.warn('[Notifications] Không kiểm tra được quyền thông báo:', e);
        return;
    }

    const hasWorkout = plan?.workout?.isGenerated === true || plan?.workout?.detail?.morning?.length > 0 || plan?.workout?.detail?.evening?.length > 0;
    const hasNutrition = plan?.nutrition?.isGenerated === true || plan?.nutrition?.meals?.length > 0;
    const hasPlan = hasWorkout || hasNutrition;

    let allItems: ScheduleItem[] = [];

    if (!hasPlan) {
        allItems = [
            { time: '08:30', label: 'Nhắc nhở Kế Hoạch', detail: 'Đã tạo lịch tập và dinh dưỡng chưa? Nhớ làm sớm!' },
            { time: '12:30', label: 'Nhắc nhở Kế Hoạch', detail: 'Nghỉ trưa rảnh rỗi, lên lịch tập và thực đơn cho hôm nay/ngày mai đi!' },
            { time: '15:15', label: 'Nhắc nhở Kế Hoạch', detail: 'Nhắc lần 3 trong ngày! Lên lịch tập và dinh dưỡng đi nhé!' },
            { time: '20:45', label: 'NHẮC LẠI', detail: 'Chưa lên lịch tập và thực đơn thì làm ngay đi!' },
            { time: '20:55', label: 'CẢNH BÁO', detail: 'Sắp 21h rồi! Chuẩn bị ngay cho ngày mai!!' },
        ];
    }

    const notifications: object[] = [];

    allItems.forEach((item, index) => {
        const at = parseTimeToday(item.time);
        if (!at) return; // đã qua → bỏ qua

        notifications.push({
            id: 1000 + index, // ID cố định 1000-1050 để dễ cancel
            title: `⏰ ${item.label}`,
            body: item.detail || `Đến giờ: ${item.label} (${item.time})`,
            schedule: { at },
            smallIcon: 'ic_launcher',
        });
    });

    if (notifications.length === 0) return;

    try {
        // Cancel notifications cũ (ID 1000-1050)
        const idsToCancel = Array.from({ length: 51 }, (_, i) => ({ id: 1000 + i }));
        await ln.cancel({ notifications: idsToCancel }).catch(() => { });

        // Schedule mới
        await ln.schedule({ notifications });
        console.log(`[Notifications] Đã đặt ${notifications.length} thông báo lịch trình`);
    } catch (e) {
        console.warn('[Notifications] Không thể đặt thông báo:', e);
    }
}
