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

const TOTAL_DAILY_TASKS = 26;
const TOTAL_WEEKLY_TASKS = 26 * 7;

function renderProgressBar(percentage: number): string {
    const totalBlocks = 10;
    const filledBlocks = Math.round((percentage / 100) * totalBlocks);
    const emptyBlocks = totalBlocks - filledBlocks;
    const filled = '🟩'.repeat(Math.max(0, filledBlocks));
    const empty = '⬜'.repeat(Math.max(0, emptyBlocks));
    return `${filled}${empty}`;
}

function getDatesInWeek(targetDate: Date): string[] {
    const d = new Date(targetDate);
    const day = d.getDay();
    const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(d.setDate(diffToMonday));
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
        const curr = new Date(startOfWeek);
        curr.setDate(startOfWeek.getDate() + i);
        dates.push(`${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}-${String(curr.getDate()).padStart(2, '0')}`);
    }
    return dates;
}

async function sendWebPush(
    endpoint: string,
    p256dh: string,
    auth: string,
    payload: object
): Promise<boolean> {
    try {
        webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

        await webpush.sendNotification(
            { endpoint, keys: { p256dh, auth } },
            JSON.stringify(payload)
        );
        return true;
    } catch (err: any) {
        console.error(`[Push] Error ${err?.statusCode}: ${err?.body}`);
        if (err?.statusCode === 410 || err?.statusCode === 404) {
            await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
        }
        return false;
    }
}

export default async (req: Request, context: Context) => {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
        console.error('[DailySummary] VAPID keys missing!');
        return new Response('VAPID keys not configured', { status: 500 });
    }

    try {
        const now = new Date();
        const vnTime = new Date(now.toLocaleString('en-US', { timeZone: TIMEZONE }));
        const dateKey = `${vnTime.getFullYear()}-${String(vnTime.getMonth() + 1).padStart(2, '0')}-${String(vnTime.getDate()).padStart(2, '0')}`;

        const weekDates = getDatesInWeek(vnTime);
        const startOfWeek = weekDates[0];
        const endOfWeek = weekDates[6];

        const { data: profiles } = await supabase.from('profiles').select('id').limit(1);
        const dbUserId = profiles && profiles.length > 0 ? profiles[0].id : null;

        if (!dbUserId) {
            return new Response('No user found', { status: 500 });
        }

        // Today's stats
        const { data: todayLogs } = await supabase
            .from('daily_schedules_logs')
            .select('completed_schedule')
            .eq('user_id', dbUserId)
            .eq('date', dateKey)
            .maybeSingle();

        const todayCompletedCount = todayLogs?.completed_schedule?.length || 0;
        const todayPercentage = Math.round((todayCompletedCount / TOTAL_DAILY_TASKS) * 100);
        const todayProgressBar = renderProgressBar(todayPercentage);

        // Weekly stats
        const { data: weekLogs } = await supabase
            .from('daily_schedules_logs')
            .select('completed_schedule')
            .eq('user_id', dbUserId)
            .gte('date', startOfWeek)
            .lte('date', endOfWeek);

        let weekCompletedCount = 0;
        weekLogs?.forEach((log: any) => {
            if (log.completed_schedule) weekCompletedCount += log.completed_schedule.length;
        });

        const weekPercentage = Math.round((weekCompletedCount / TOTAL_WEEKLY_TASKS) * 100);
        const weekProgressBar = renderProgressBar(weekPercentage);
        const remainingWeekTasks = Math.max(0, TOTAL_WEEKLY_TASKS - weekCompletedCount);

        const notificationPayload = {
            title: '📊 Báo Cáo Cuối Ngày',
            body: `Hôm nay: ${todayCompletedCount}/${TOTAL_DAILY_TASKS} việc (${todayPercentage}%) ${todayProgressBar}\nTuần này: ${weekCompletedCount}/${TOTAL_WEEKLY_TASKS} việc (${weekPercentage}%) • Còn ${remainingWeekTasks} việc`,
            tag: 'daily-summary',
            url: '/#schedule',
            icon: '/icons/icon-192.webp',
            badge: '/icons/icon-96.webp',
        };

        // Get all subscriptions and send
        const { data: subs } = await supabase
            .from('push_subscriptions')
            .select('endpoint, p256dh, auth');

        let sent = 0;
        if (subs && subs.length > 0) {
            const results = await Promise.all(
                subs.map((s: any) => sendWebPush(s.endpoint, s.p256dh, s.auth, notificationPayload))
            );
            sent = results.filter(Boolean).length;
            console.log(`[DailySummary] Sent push to ${sent}/${subs.length} subscription(s).`);
        } else {
            console.log('[DailySummary] No subscriptions found.');
        }

        return new Response(`Daily summary sent: ${sent} notifications`, { status: 200 });
    } catch (err: any) {
        console.error('[DailySummary] Error:', err);
        return new Response(`Error: ${err.message}`, { status: 500 });
    }
};

// Cron job at 23:00 VN (16:00 UTC)
export const config: Config = {
    schedule: '0 16 * * *',
};
