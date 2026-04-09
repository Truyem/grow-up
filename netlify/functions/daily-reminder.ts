import { type Config, type Context } from "@netlify/functions";
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

// Use SERVICE ROLE key on server so RLS doesn't block reading subscriptions
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:admin@growup.app';

const TIMEZONE = "Asia/Ho_Chi_Minh";

const SCHEDULE = [
    { id: 'smor-0', hour: 4, minute: 0, title: '🌅 04:00 - Thức dậy!', body: 'Kỷ luật là cầu nối giữa mục tiêu và thành tựu.' },
    { id: 'smor-1', hour: 4, minute: 15, title: '💧 04:15 - Vệ sinh cá nhân', body: 'Bắt đầu ngày mới thật sạch sẽ.' },
    { id: 'smor-2', hour: 4, minute: 30, title: '☕ 04:30 - Ăn sáng & Caffeine 1', body: 'Chuẩn bị bữa sáng và uống Caffeine (lần 1).' },
    { id: 'smor-3', hour: 5, minute: 0, title: '🍳 05:00 - Ăn sáng', body: 'Đến giờ ăn sáng rồi!' },
    { id: 'smor-4', hour: 6, minute: 30, title: '🏋️ 06:30 - Đến phòng tập!', body: 'Trời mưa thì tập ở nhà nhé.' },
    { id: 'smor-5', hour: 7, minute: 0, title: '💪 07:00 - Tập luyện chính', body: 'Hãy cho thấy tinh thần của mày!' },
    { id: 'plan-am', hour: 8, minute: 30, title: '📝 08:30 - Nhắc nhở Kế Hoạch', body: 'Đã tạo lịch tập và dinh dưỡng chưa? Nhớ làm sớm!' },
    { id: 'smor-6', hour: 9, minute: 0, title: '🏠 09:00 - Về nhà & Caffeine 2', body: 'Đã về nhà chưa? Uống Caffeine (lần 2) nào.' },
    { id: 'smor-7', hour: 9, minute: 15, title: '🛒 09:15 - Mua đồ ăn trưa', body: 'Đi mua đồ ăn trưa thôi.' },
    { id: 'smor-8', hour: 9, minute: 30, title: '🥘 09:30 - Chuẩn bị đồ ăn', body: 'Chuẩn bị nguyên liệu.' },
    { id: 'smor-9', hour: 10, minute: 0, title: '👨‍🍳 10:00 - Nấu ăn trưa', body: 'Bắt tay vào nấu ăn nào!' },
    { id: 'smor-10', hour: 10, minute: 30, title: '🍱 10:30 - Ăn trưa', body: 'Ăn trưa ngon miệng!' },
    { id: 'smor-11', hour: 11, minute: 0, title: '💊 11:00 - Nghỉ ngơi & Omega 3', body: 'Rửa bát, nghỉ ngơi. Nhớ uống Omega 3 (lần 1).' },
    { id: 'smor-12', hour: 11, minute: 30, title: '🎒 11:30 - Đến trường', body: 'Chuẩn bị đi học ngay!' },
    { id: 'plan-noon', hour: 12, minute: 30, title: '📝 12:30 - Nhắc nhở Kế Hoạch', body: 'Nghỉ trưa rảnh rỗi, lên lịch tập và thực đơn cho hôm nay/ngày mai đi!' },
    // Water reminders
    { id: 'water-1', hour: 8, minute: 0, title: '💧 08:00 - Uống nước!', body: 'Nhớ uống 300ml nước. Mục tiêu 2.5-3L/ngày.' },
    { id: 'water-2', hour: 12, minute: 0, title: '💧 12:00 - Uống nước!', body: 'Đã uống đủ nước chưa? Uống thêm 300ml nhé.' },
    { id: 'water-3', hour: 15, minute: 0, title: '💧 15:00 - Uống nước!', body: 'Giữa chiều dễ thiếu nước. Uống 300ml ngay!' },
    { id: 'water-4', hour: 17, minute: 0, title: '💧 17:00 - Uống nước!', body: 'Hydrate trước buổi tập tối nào.' },
    // Afternoon
    { id: 'saft-0', hour: 14, minute: 30, title: '😴 14:30 - Về nhà & Magnesium 1', body: 'Về nhà, ngủ trưa 30 phút. Uống Magnesium (lần 1).' },
    { id: 'saft-1', hour: 15, minute: 30, title: '🛒 15:30 - Chuẩn bị bữa tối', body: 'Sắp đến giờ nấu ăn tối rồi.' },
    { id: 'saft-2', hour: 16, minute: 0, title: '⚡ 16:00 - Bật nóng lạnh & cắm cơm', body: 'Đừng quên bật điều hòa và cắm cơm!' },
    { id: 'saft-3', hour: 16, minute: 15, title: '👨‍🍳 16:15 - Nấu ăn tối', body: 'Bắt đầu nấu ăn tối.' },
    { id: 'saft-4', hour: 16, minute: 40, title: '🍛 16:40 - Ăn cơm tối', body: 'Ăn cơm tối ngon miệng!' },
    { id: 'saft-5', hour: 17, minute: 30, title: '🚿 17:30 - Tắm rửa', body: 'Thư giãn sau một ngày dài.' },
    { id: 'saft-6', hour: 18, minute: 0, title: '💊 18:00 - Giặt quần áo & Omega 3 2', body: 'Giặt quần áo. Nhớ uống Omega 3 (lần 2).' },
    { id: 'saft-7', hour: 18, minute: 15, title: '📚 18:15 - Ôn bài', body: 'Đến giờ học tập rồi!' },
    { id: 'saft-8', hour: 19, minute: 0, title: '💪 19:00 - Tập Isolation tại nhà', body: 'Plank/Abs — nhẹ thôi nhưng đều đặn nhé!' },
    // Supplement reminder
    { id: 'whey-1', hour: 19, minute: 30, title: '🥤 19:30 - Whey Protein!', body: 'Uống 1 scoop Whey sau tập để phục hồi cơ bắp.' },
    { id: 'saft-9', hour: 20, minute: 0, title: '💊 20:00 - Giải trí & Creatine', body: 'Uống 5g Creatine và Magnesium (lần 2).' },
    { id: 'plan-1', hour: 20, minute: 30, title: '📝 20:30 - Lên kế hoạch ngày mai', body: 'Đừng quên tạo lịch tập và lên thực đơn dinh dưỡng cho ngày mai nhé!' },
    { id: 'plan-2', hour: 20, minute: 45, title: '⚠️ 20:45 - NHẮC LẠI: Lên kế hoạch!', body: 'Mày đã tạo lịch tập và thực đơn cho ngày mai chưa? Làm ngay đi!' },
    { id: 'plan-3', hour: 20, minute: 55, title: '🚨 20:55 - CẢNH BÁO CUỐI: Kế hoạch!', body: 'Sắp đến giờ tắt màn hình rồi! Lên lịch tập và dinh dưỡng đi!!' },
    { id: 'saft-10', hour: 21, minute: 0, title: '📵 21:00 - Screen-off!', body: 'Tắt toàn bộ máy tính và điện thoại.' },
    { id: 'saft-11', hour: 21, minute: 30, title: '😴 21:30 - Đi ngủ', body: 'Chúc ngủ ngon! Ngày mai tiếp tục bứt phá.' },
];

// Send a Web Push notification using the web-push library (properly encrypted)
async function sendWebPush(
    endpoint: string,
    p256dh: string,
    auth: string,
    payload: object
): Promise<boolean> {
    try {
        webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

        const pushSubscription = {
            endpoint,
            keys: { p256dh, auth },
        };

        await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
        return true;
    } catch (err: any) {
        console.error(`[Push] Failed for ${endpoint.substring(0, 50)}:`, err?.statusCode, err?.body);
        // 410 Gone or 404 = subscription expired
        if (err?.statusCode === 410 || err?.statusCode === 404) {
            await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
            console.log('[Push] Removed expired subscription');
        }
        return false;
    }
}

// Send notification to all subscriptions in DB
async function notifyAll(payload: object): Promise<{ sent: number; failed: number }> {
    const { data: subs, error } = await supabase
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth');

    if (error) {
        console.error('[Push] DB error fetching subscriptions:', error);
        return { sent: 0, failed: 0 };
    }

    if (!subs || subs.length === 0) {
        console.log('[Push] No subscriptions found in DB.');
        return { sent: 0, failed: 0 };
    }

    console.log(`[Push] Sending to ${subs.length} subscription(s)...`);

    const results = await Promise.all(
        subs.map((s: any) => sendWebPush(s.endpoint, s.p256dh, s.auth, payload))
    );

    const sent = results.filter(Boolean).length;
    const failed = results.length - sent;
    return { sent, failed };
}

async function checkPlansAndNotifyContinuous(): Promise<{ sent: number; failed: number }> {
    const vnTime = new Date(new Date().toLocaleString('en-US', { timeZone: TIMEZONE }));
    const dateKey = `${vnTime.getFullYear()}-${String(vnTime.getMonth() + 1).padStart(2, '0')}-${String(vnTime.getDate()).padStart(2, '0')}`;

    const { data: subs, error } = await supabase
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth, user_id');

    if (error || !subs || subs.length === 0) return { sent: 0, failed: 0 };

    const usersSubs = subs.reduce((acc: any, sub: any) => {
        if (sub.user_id) {
            if (!acc[sub.user_id]) acc[sub.user_id] = [];
            acc[sub.user_id].push(sub);
        }
        return acc;
    }, {});

    let sent = 0;
    let failed = 0;

    for (const userId of Object.keys(usersSubs)) {
        const { data: planData } = await supabase
            .from('daily_plans')
            .select('plan_data')
            .eq('user_id', userId)
            .eq('date', dateKey)
            .maybeSingle();

        let needsReminder = false;
        if (!planData || !planData.plan_data) {
            needsReminder = true;
        } else {
            const pd = planData.plan_data as any;
            const hasWorkout = pd.workout?.isGenerated === true || pd.workout?.detail?.morning?.length > 0 || pd.workout?.detail?.evening?.length > 0;
            const hasNutrition = pd.nutrition?.isGenerated === true || pd.nutrition?.meals?.length > 0;
            
            if (!hasWorkout && !hasNutrition) {
                needsReminder = true;
            }
        }

        if (needsReminder) {
            const payload = {
                title: '🚨 CHƯA CÓ LỊCH TRÌNH!',
                body: 'Phát hiện m chưa tạo lịch tập hoặc dinh dưỡng cho hôm nay! Vào app làm ngay đi!',
                tag: 'continuous-plan-reminder',
                url: '/#schedule',
                icon: '/icons/icon-192.webp',
                badge: '/icons/icon-96.webp',
            };

            for (const sub of usersSubs[userId]) {
                const success = await sendWebPush(sub.endpoint, sub.p256dh, sub.auth, payload);
                if (success) sent++;
                else failed++;
            }
        }
    }
    return { sent, failed };
}

export default async (req: Request, context: Context) => {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
        console.error('[DailyReminder] VAPID keys missing!');
        return new Response('VAPID keys not configured', { status: 500 });
    }

    const now = new Date();
    const vnTime = new Date(now.toLocaleString('en-US', { timeZone: TIMEZONE }));
    const currentHour = vnTime.getHours();
    const currentMinute = vnTime.getMinutes();

    console.log(`[DailyReminder] VN Time: ${vnTime.toLocaleString('vi-VN')}. Hour: ${currentHour}, Minute: ${currentMinute}`);

    // Find matching schedule event (within 4-minute window)
    const activeEvent = SCHEDULE.find(
        e => e.hour === currentHour && Math.abs(currentMinute - e.minute) <= 4
    );

    if (!activeEvent) {
        // Nếu không có event cố định, kiểm tra liên tục mỗi 15/45 phút
        const isContinuousCheckTime = currentHour >= 8 && currentHour <= 21 && 
            (Math.abs(currentMinute - 15) <= 4 || Math.abs(currentMinute - 45) <= 4);
            
        if (isContinuousCheckTime) {
            console.log(`[DailyReminder] Running continuous plan check at ${currentHour}:${currentMinute}`);
            const { sent, failed } = await checkPlansAndNotifyContinuous();
            return new Response(`Continuous Check: Sent ${sent}, Failed ${failed}`, { status: 200 });
        }

        return new Response('No active event at this time', { status: 200 });
    }

    const payload = {
        title: activeEvent.title,
        body: activeEvent.body,
        tag: activeEvent.id,
        url: '/#schedule',
        icon: '/icons/icon-192.webp',
        badge: '/icons/icon-96.webp',
    };

    const { sent, failed } = await notifyAll(payload);

    console.log(`[DailyReminder] Sent push for "${activeEvent.title}" → ${sent} OK, ${failed} failed`);
    return new Response(`Sent: ${activeEvent.title} (${sent} success, ${failed} failed)`, { status: 200 });
};

export const config: Config = {
    schedule: '*/5 * * * *',
};
