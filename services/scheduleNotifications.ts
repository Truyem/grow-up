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

// Các mục lịch trình cứng (sync với ScheduleView.tsx)
const morningSchedule: ScheduleItem[] = [
    { time: '04:00', label: 'Thức dậy' },
    { time: '04:15', label: 'Vệ sinh cá nhân' },
    { time: '04:30', label: 'Chuẩn bị ăn sáng', detail: 'Uống Caffeine (lần 1)' },
    { time: '05:00', label: 'Ăn sáng' },
    { time: '06:30', label: 'Đến phòng tập' },
    { time: '07:00', label: 'Tập luyện chính' },
    { time: '08:30', label: 'Nhắc nhở Kế Hoạch', detail: 'Đã tạo lịch tập và dinh dưỡng chưa? Nhớ làm sớm!' },
    { time: '09:00', label: 'Về nhà', detail: 'Uống Caffeine (lần 2)' },
    { time: '09:15', label: 'Mua đồ ăn trưa' },
    { time: '09:30', label: 'Chuẩn bị đồ ăn' },
    { time: '10:00', label: 'Nấu ăn' },
    { time: '10:30', label: 'Ăn trưa' },
    { time: '11:00', label: 'Nghỉ ngơi', detail: 'Uống Omega 3 (lần 1) sau khi ăn' },
    { time: '11:30', label: 'Đến trường' },
    { time: '12:30', label: 'Nhắc nhở Kế Hoạch', detail: 'Nghỉ trưa rảnh rỗi, lên lịch tập và thực đơn cho hôm nay/ngày mai đi!' },
];

const afternoonSchedule: ScheduleItem[] = [
    { time: '14:30', label: 'Về nhà', detail: 'Uống Magnesium (lần 1)' },
    { time: '15:15', label: 'Nhắc nhở Kế Hoạch', detail: 'Nhắc lần 3 trong ngày! Lên lịch tập và dinh dưỡng đi nhé!' },
    { time: '15:30', label: 'Chuẩn bị bữa tối' },
    { time: '16:00', label: 'Bật nóng lạnh, cắm cơm' },
    { time: '16:15', label: 'Nấu ăn' },
    { time: '16:40', label: 'Ăn cơm' },
    { time: '17:30', label: 'Tắm rửa' },
    { time: '18:00', label: 'Giặt quần áo', detail: 'Uống Omega 3 (lần 2)' },
    { time: '18:15', label: 'Ôn bài' },
    { time: '19:00', label: 'Tập Isolation', detail: 'Plank hoặc Abs tại nhà' },
    { time: '20:00', label: 'Giải trí & TPBS', detail: 'Uống 5g Creatine, Magnesium (lần 2)' },
    { time: '20:30', label: 'Lên kế hoạch', detail: 'Tạo lịch tập và lên thực đơn dinh dưỡng cho ngày mai' },
    { time: '20:45', label: 'NHẮC LẠI', detail: 'Chưa lên lịch tập và thực đơn thì làm ngay đi!' },
    { time: '20:55', label: 'CẢNH BÁO', detail: 'Sắp 21h rồi! Chuẩn bị ngay cho ngày mai!!' },
    { time: '21:00', label: 'Screen-off', detail: 'Tắt toàn bộ màn hình' },
    { time: '21:30', label: 'Đi ngủ' },
];

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

    let allItems = [...morningSchedule, ...afternoonSchedule];

    // Nếu đã có lịch trình, bỏ qua các thông báo nhắc nhở lên kế hoạch
    if (hasPlan) {
        allItems = allItems.filter(item => 
            item.label !== 'Nhắc nhở Kế Hoạch' && 
            item.label !== 'NHẮC LẠI' && 
            item.label !== 'CẢNH BÁO'
        );
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
