import { type Config, type Context } from "@netlify/functions";
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
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

async function buildVapidJwt(audience: string): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const payload = { aud: audience, exp: now + 12 * 3600, sub: VAPID_EMAIL };
    const header = { alg: 'ES256', typ: 'JWT' };
    const b64u = (obj: object | string) => {
        const str = typeof obj === 'string' ? obj : JSON.stringify(obj);
        return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    };
    const signingInput = `${b64u(header)}.${b64u(payload)}`;
    const rawPrivate = Uint8Array.from(
        atob(VAPID_PRIVATE_KEY.replace(/-/g, '+').replace(/_/g, '/')),
        c => c.charCodeAt(0)
    );
    const pkcs8Header = new Uint8Array([
        0x30, 0x41, 0x02, 0x01, 0x00, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01,
        0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07, 0x04, 0x27, 0x30, 0x25, 0x02, 0x01,
        0x01, 0x04, 0x20
    ]);
    const pkcs8 = new Uint8Array(pkcs8Header.length + rawPrivate.length);
    pkcs8.set(pkcs8Header);
    pkcs8.set(rawPrivate, pkcs8Header.length);
    const cryptoKey = await crypto.subtle.importKey(
        'pkcs8', pkcs8.buffer,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false, ['sign']
    );
    const sig = await crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        cryptoKey,
        new TextEncoder().encode(signingInput)
    );
    const sigB64u = btoa(String.fromCharCode(...new Uint8Array(sig)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    return `${signingInput}.${sigB64u}`;
}

async function sendWebPush(endpoint: string, p256dh: string, auth: string, payload: object): Promise<void> {
    try {
        const url = new URL(endpoint);
        const audience = `${url.protocol}//${url.host}`;
        const jwt = await buildVapidJwt(audience);
        const bodyBytes = new TextEncoder().encode(JSON.stringify(payload));
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `vapid t=${jwt},k=${VAPID_PUBLIC_KEY}`,
                'Content-Type': 'application/json',
                'TTL': '86400',
            },
            body: bodyBytes,
        });
        if (!res.ok) {
            const text = await res.text();
            console.error(`[Push] ${res.status}: ${text}`);
            if (res.status === 410 || res.status === 404) {
                await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
            }
        }
    } catch (err) {
        console.error('[Push] Error:', err);
    }
}

export default async (req: Request, context: Context) => {
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
        };

        // Get all subscriptions and send
        const { data: subs } = await supabase
            .from('push_subscriptions')
            .select('endpoint, p256dh, auth');

        if (subs && subs.length > 0) {
            await Promise.all(
                subs.map((s: any) => sendWebPush(s.endpoint, s.p256dh, s.auth, notificationPayload))
            );
            console.log(`[DailySummary] Sent push to ${subs.length} subscription(s).`);
        } else {
            console.log('[DailySummary] No subscriptions found.');
        }

        return new Response('Daily summary sent via Web Push!', { status: 200 });
    } catch (err: any) {
        console.error('[DailySummary] Error:', err);
        return new Response(`Error: ${err.message}`, { status: 500 });
    }
};

// Cron job at 23:00 VN (16:00 UTC)
export const config: Config = {
    schedule: '0 16 * * *',
};
