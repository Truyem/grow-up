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
                title: '🚨 NHẮC NHỞ HÀNG NGÀY',
                body: 'Hôm nay mày chưa lên lịch tập hoặc dinh dưỡng! Vào app làm ngay đi trước khi quá muộn!',
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

    // Chỉ thông báo từ 6h sáng đến 9h tối (6:00 - 21:00)
    // Và kiểm tra liên tục mỗi 15/45 phút (hoặc cứ mỗi giờ tuỳ vào cron)
    const isContinuousCheckTime = currentHour >= 6 && currentHour <= 21 && 
        (Math.abs(currentMinute - 15) <= 4 || Math.abs(currentMinute - 45) <= 4 || Math.abs(currentMinute - 0) <= 4 || Math.abs(currentMinute - 30) <= 4);
        
    if (isContinuousCheckTime) {
        console.log(`[DailyReminder] Running continuous plan check at ${currentHour}:${currentMinute}`);
        const { sent, failed } = await checkPlansAndNotifyContinuous();
        return new Response(`Continuous Check: Sent ${sent}, Failed ${failed}`, { status: 200 });
    }

    return new Response('No active event at this time', { status: 200 });
};

export const config: Config = {
    schedule: '*/5 * * * *',
};
