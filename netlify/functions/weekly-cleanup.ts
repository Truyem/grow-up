import { type Config, type Context } from "@netlify/functions";
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default async (req: Request, context: Context) => {
    // Tính ngày cutoff: hôm nay VN - 7 ngày
    const vnOffsetMs = 7 * 60 * 60 * 1000;
    const vnNow = new Date(Date.now() + vnOffsetMs);
    vnNow.setUTCDate(vnNow.getUTCDate() - 7);
    const cutoffDate = `${vnNow.getUTCFullYear()}-${String(vnNow.getUTCMonth() + 1).padStart(2, '0')}-${String(vnNow.getUTCDate()).padStart(2, '0')}`;

    console.log(`[WeeklyCleanup] Xóa daily_schedules_logs trước ngày ${cutoffDate}`);

    const { error: scheduleErr, count: scheduleCount } = await supabase
        .from('daily_schedules_logs')
        .delete({ count: 'exact' })
        .lt('date', cutoffDate);

    if (scheduleErr) {
        console.error('[WeeklyCleanup] Lỗi xóa daily_schedules_logs:', scheduleErr);
        return new Response(`Error: ${scheduleErr.message}`, { status: 500 });
    }

    console.log(`[WeeklyCleanup] Đã xóa ${scheduleCount} row daily_schedules_logs`);

    // Cũng dọn notifications cũ hơn 7 ngày
    const { error: notifErr, count: notifCount } = await supabase
        .from('notifications')
        .delete({ count: 'exact' })
        .lt('created_at', new Date(Date.now() + vnOffsetMs - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (notifErr) {
        console.error('[WeeklyCleanup] Lỗi xóa notifications:', notifErr);
    } else {
        console.log(`[WeeklyCleanup] Đã xóa ${notifCount} row notifications`);
    }

    return new Response(
        `✅ Cleanup hoàn tất: xóa ${scheduleCount} lịch, ${notifCount ?? 0} notification cũ hơn 7 ngày.`,
        { status: 200 }
    );
};

// Chạy mỗi thứ 2 lúc 00:00 VN = Chủ nhật 17:00 UTC
export const config: Config = {
    schedule: "0 17 * * 0",
};
