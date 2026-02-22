import { type Config, type Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

const USER_ID = "817401534463213628";
const BOT_TOKEN = "MTA5NTMyNjE0MTk3MzI3MDU4OQ.GoIaAl.f0Kx55PEM0GWUMwIJFmx8fDABtsNfSn_eIublk";
const BLOB_STORE_NAME = "discord-reminder";
const TIMEZONE = "Asia/Ho_Chi_Minh";

// Helper to interact with Discord API
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

async function sendMessage(channelId: string, content: string, components: any[] = []) {
    const payload: any = { content };
    if (components && components.length > 0) {
        payload.components = components;
    }
    return discordRequest(`/channels/${channelId}/messages`, "POST", payload);
}

const SCHEDULE = [
    { id: 'smor-0', hour: 4, minute: 0, msg: "🌅 04:00 - Thức dậy thôi! Kỷ luật là cầu nối giữa mục tiêu và thành tựu." },
    { id: 'smor-1', hour: 4, minute: 15, msg: "💧 04:15 - Vệ sinh cá nhân." },
    { id: 'smor-2', hour: 4, minute: 30, msg: "☕ 04:30 - Chuẩn bị ăn sáng. Đừng quên uống Caffeine (lần 1) nhé!" },
    { id: 'smor-3', hour: 5, minute: 0, msg: "🍳 05:00 - Đến giờ ăn sáng." },
    { id: 'smor-4', hour: 6, minute: 30, msg: "🏋️ 06:30 - Chuẩn bị đến phòng tập! (Trời mưa thì tập ở nhà nhé)" },
    { id: 'smor-5', hour: 9, minute: 0, msg: "🏠 09:00 - Về nhà thôi. Uống Caffeine (lần 2) nào!" },
    { id: 'smor-6', hour: 9, minute: 15, msg: "🛒 09:15 - Đi mua đồ ăn trưa." },
    { id: 'smor-7', hour: 10, minute: 0, msg: "👨‍🍳 10:00 - Đến giờ nấu ăn trưa." },
    { id: 'smor-8', hour: 10, minute: 30, msg: "🍱 10:30 - Ăn trưa ngon miệng!" },
    { id: 'smor-9', hour: 11, minute: 0, msg: "💊 11:00 - Rửa bát, nghỉ ngơi. Nhớ uống Omega 3 (lần 1) nha." },
    { id: 'smor-10', hour: 11, minute: 30, msg: "🎒 11:30 - Đến giờ đi học." },
    { id: 'saft-0', hour: 14, minute: 30, msg: "💊 14:30 - Về nhà rèn luyện / Ngủ trưa. Uống Magnesium (lần 1) trước khi ngủ." },
    { id: 'saft-1', hour: 15, minute: 30, msg: "🛒 15:30 - Chuẩn bị bữa tối." },
    { id: 'saft-2', hour: 16, minute: 0, msg: "⚡ 16:00 - Bật nóng lạnh và cắm cơm nào." },
    { id: 'saft-3', hour: 16, minute: 15, msg: "👨‍🍳 16:15 - Bắt đầu nấu ăn." },
    { id: 'saft-4', hour: 16, minute: 40, msg: "🍛 16:40 - Đến giờ ăn cơm tối." },
    { id: 'saft-5', hour: 17, minute: 30, msg: "🚿 17:30 - Tắm rửa thư giãn." },
    { id: 'saft-6', hour: 18, minute: 0, msg: "💊 18:00 - Giặt quần áo. Nhớ uống Omega 3 (lần 2)." },
    { id: 'saft-7', hour: 18, minute: 15, msg: "📚 18:15 - Ôn bài." },
    { id: 'saft-8', hour: 19, minute: 0, msg: "💪 19:00 - Tập Isolation (Nhẹ) tại nhà (Plank/Abs)." },
    { id: 'saft-9', hour: 20, minute: 0, msg: "💊 20:00 - Giải trí & Thực phẩm bổ sung. Uống 5g Creatine và Magnesium (lần 2)." },
    { id: 'saft-10', hour: 21, minute: 0, msg: "📵 21:00 - Screen-off! Tắt toàn bộ máy tính và điện thoại." },
    { id: 'saft-11', hour: 21, minute: 30, msg: "😴 21:30 - Đi ngủ. Chúc ngủ ngon!" }
];

export default async (req: Request, context: Context) => {
    const store = getStore(BLOB_STORE_NAME);

    // Get current time in Vietnam
    const now = new Date();
    const vnTime = new Date(now.toLocaleString("en-US", { timeZone: TIMEZONE }));
    const currentHour = vnTime.getHours();
    const currentMinute = vnTime.getMinutes();
    const todayStr = `${vnTime.getFullYear()}-${vnTime.getMonth() + 1}-${vnTime.getDate()}`;

    console.log(`Running Daily Reminder. VN Time: ${vnTime.toISOString()}. Hour: ${currentHour}, Minute: ${currentMinute}`);

    try {
        // Find if current time matches any schedule within a 4 minute window
        // (This allows for cron execution delays of up to 4 minutes)
        const activeEvent = SCHEDULE.find(e => e.hour === currentHour && Math.abs(currentMinute - e.minute) <= 4);

        if (!activeEvent) {
            console.log("No active event for this time.");
            return new Response("No active event");
        }

        const eventId = `sent_${todayStr}_${activeEvent.hour}_${activeEvent.minute}`;
        const isSent = await store.get(eventId, { type: "text" });

        if (isSent === "true") {
            console.log(`Event ${activeEvent.hour}:${activeEvent.minute} already sent today.`);
            return new Response("Already sent");
        }

        // Send the reminder
        const channel = await createDMChannel(USER_ID);

        const components = [
            {
                type: 1, // ActionRow
                components: [
                    {
                        type: 2, // Button
                        style: 3, // SUCCESS style (green)
                        label: "Đã hoàn thành",
                        custom_id: `check_${activeEvent.id}`
                    }
                ]
            }
        ];

        await sendMessage(channel.id, activeEvent.msg, components);

        // Mark as sent
        await store.set(eventId, "true");

        console.log(`Reminder sent: ${activeEvent.msg}`);
        return new Response(`Sent: ${activeEvent.msg}`);

    } catch (err: any) {
        console.error("Error in daily reminder:", err);
        return new Response(`Error: ${err.message}`, { status: 500 });
    }
};

export const config: Config = {
    schedule: "*/5 * * * *",
};
