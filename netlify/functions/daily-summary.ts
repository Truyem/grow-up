import { type Config, type Context } from "@netlify/functions";
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const BOT_TOKEN = "MTA5NTMyNjE0MTk3MzI3MDU4OQ.GoIaAl.f0Kx55PEM0GWUMwIJFmx8fDABtsNfSn_eIublk";
const USER_ID = "817401534463213628";
const TIMEZONE = "Asia/Ho_Chi_Minh";

const TOTAL_DAILY_TASKS = 26;
const TOTAL_WEEKLY_TASKS = 26 * 7;

async function discordRequest(endpoint: string, method: string = "GET", body: any = null) {
    const url = `https://discord.com/api/v10${endpoint}`;
    const options: RequestInit = {
        method,
        headers: {
            "Authorization": `Bot ${BOT_TOKEN}`,
            "Content-Type": "application/json",
        },
    };
    if (body) {
        options.body = JSON.stringify(body);
    }
    const res = await fetch(url, options);
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Discord API Error: ${res.status} ${res.statusText} - ${text}`);
    }
    return res.json();
}

async function createDMChannel(userId: string) {
    return discordRequest("/users/@me/channels", "POST", { recipient_id: userId });
}

async function sendMessage(channelId: string, content: string) {
    return discordRequest(`/channels/${channelId}/messages`, "POST", { content });
}

function renderProgressBar(percentage: number): string {
    const totalBlocks = 10;
    const filledBlocks = Math.round((percentage / 100) * totalBlocks);
    const emptyBlocks = totalBlocks - filledBlocks;
    return '🟩'.repeat(Math.max(0, filledBlocks)) + '⬜'.repeat(Math.max(0, emptyBlocks));
}

// Lấy danh sách các ngày trong tuần (Mon->Sun) thuộc về tuần chứa `targetDate`
function getDatesInWeek(targetDate: Date): string[] {
    const d = new Date(targetDate);
    const day = d.getDay(); // 0 (Sun) to 6 (Sat)
    const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1); // Điều chỉnh để Thứ 2 là ngày đầu tuần

    const startOfWeek = new Date(d.setDate(diffToMonday));
    const dates = [];

    for (let i = 0; i < 7; i++) {
        const curr = new Date(startOfWeek);
        curr.setDate(startOfWeek.getDate() + i);
        const dateStr = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}-${String(curr.getDate()).padStart(2, '0')}`;
        dates.push(dateStr);
    }
    return dates;
}

export default async (req: Request, context: Context) => {
    try {
        const now = new Date();
        const vnTime = new Date(now.toLocaleString("en-US", { timeZone: TIMEZONE }));
        const dateKey = `${vnTime.getFullYear()}-${String(vnTime.getMonth() + 1).padStart(2, '0')}-${String(vnTime.getDate()).padStart(2, '0')}`;

        // Get limits of this week
        const weekDates = getDatesInWeek(vnTime);
        const startOfWeek = weekDates[0];
        const endOfWeek = weekDates[6];

        // Ensure we load the user id properly, for now, we just query all logs and assume single user
        // Or get user from top profiles if not specified
        const { data: profiles } = await supabase.from('profiles').select('id').limit(1);
        const dbUserId = profiles && profiles.length > 0 ? profiles[0].id : null;

        if (!dbUserId) {
            console.error("No user found in Supabase.");
            return new Response("No user found", { status: 500 });
        }

        // Query today's completed schedules
        const { data: todayLogs } = await supabase
            .from('daily_schedules_logs')
            .select('completed_schedule')
            .eq('user_id', dbUserId)
            .eq('date', dateKey)
            .maybeSingle();

        const todayCompletedCount = todayLogs && todayLogs.completed_schedule ? todayLogs.completed_schedule.length : 0;
        const todayPercentage = Math.round((todayCompletedCount / TOTAL_DAILY_TASKS) * 100);
        const todayProgressBar = renderProgressBar(todayPercentage);

        // Query this week's completed schedules
        const { data: weekLogs } = await supabase
            .from('daily_schedules_logs')
            .select('completed_schedule')
            .eq('user_id', dbUserId)
            .gte('date', startOfWeek)
            .lte('date', endOfWeek);

        let weekCompletedCount = 0;
        if (weekLogs) {
            weekLogs.forEach(log => {
                if (log.completed_schedule) {
                    weekCompletedCount += log.completed_schedule.length;
                }
            });
        }

        const weekPercentage = Math.round((weekCompletedCount / TOTAL_WEEKLY_TASKS) * 100);
        const weekProgressBar = renderProgressBar(weekPercentage);
        const remainingWeekTasks = Math.max(0, TOTAL_WEEKLY_TASKS - weekCompletedCount);

        // Construct Message
        const message = `
📊 **BÁO CÁO NHIỆM VỤ LỊCH TRÌNH CUỐI NGÀY** 📊

🔹 **Hôm nay (${dateKey})**:
> Đã hoàn thành: **${todayCompletedCount}/${TOTAL_DAILY_TASKS}** việc
> Tiến độ: ${todayProgressBar} (${todayPercentage}%)

🔹 **Trong tuần này**:
> Đã hoàn thành: **${weekCompletedCount}/${TOTAL_WEEKLY_TASKS}** việc
> Còn lại: **${remainingWeekTasks}** việc
> Tiến độ: ${weekProgressBar} (${weekPercentage}%)

Chúc bạn ngủ ngon và chuẩn bị năng lượng cho ngày mai! 🛌💤
        `.trim();

        const channel = await createDMChannel(USER_ID);
        await sendMessage(channel.id, message);

        return new Response("Report sent via Discord!", { status: 200 });
    } catch (err: any) {
        console.error("Error sending daily summary:", err);
        return new Response(`Error: ${err.message}`, { status: 500 });
    }
};

// Cron job run at 23:00 VN time (16:00 UTC)
export const config: Config = {
    schedule: "0 16 * * *",
};
