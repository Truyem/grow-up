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
        throw new Error(`Discord API Error: ${res.status} ${res.statusText} - ${await res.text()}`);
    }
    return res.json();
}

async function createDMChannel(userId: string) {
    return discordRequest("/users/@me/channels", "POST", { recipient_id: userId });
}

async function sendMessage(channelId: string, content: string) {
    return discordRequest(`/channels/${channelId}/messages`, "POST", { content });
}

async function getRecentMessages(channelId: string) {
    return discordRequest(`/channels/${channelId}/messages?limit=10`, "GET");
}

export default async (req: Request, context: Context) => {
    const store = getStore(BLOB_STORE_NAME);

    // Get current time in Vietnam
    const now = new Date();
    const vnTime = new Date(now.toLocaleString("en-US", { timeZone: TIMEZONE }));
    const currentHour = vnTime.getHours();
    const currentMinute = vnTime.getMinutes();

    console.log(`Running Daily Reminder. VN Time: ${vnTime.toISOString()}. Hour: ${currentHour}, Minute: ${currentMinute}`);

    try {
        // 1. Get DM Channel ID
        const channel = await createDMChannel(USER_ID);
        const channelId = channel.id;

        // 2. Check logic based on time
        // 5:00 AM - 5:05 AM: Start of day trigger
        if (currentHour === 5 && currentMinute < 5) {
            console.log("Triggering 5 AM valid check...");
            await store.set("confirmed", "false");
            await sendMessage(channelId, "Chào buổi sáng! 🌅 Hãy nhắn lại gì đó để xác nhận bạn đã dậy nhé.");
            return new Response("Sent 5 AM greeting");
        }

        // 3. Spam Check (Any other time)
        const isConfirmed = await store.get("confirmed");

        if (isConfirmed === "true") {
            console.log("User already confirmed today.");
            return new Response("Already confirmed");
        }

        // Check if user has replied since 5 AM today
        const messages = await getRecentMessages(channelId);

        // Find start of today 5 AM in UTC equivalent (approximate is fine for relative check, 
        // strictly we should parse msg timestamp)
        // Let's iterate messages and check timestamps
        const startOfToday5AM = new Date(vnTime);
        startOfToday5AM.setHours(5, 0, 0, 0);

        let userReplied = false;

        for (const msg of messages) {
            // Discord timestamps are ISO8601 (UTC)
            const msgTime = new Date(msg.timestamp);
            // We need to compare this msgTime to the "Start of Today 5 AM VN" in actual time
            // vnTime is "shifted" date object, but we need real timestamp comparison.
            // EASIER: Just check if message time > (Now - X time) OR check if msgTime > 5 AM today (absolute)

            // Re-construct 5 AM VN today in UTC
            // Get YYYY-MM-DD from vnTime
            const y = vnTime.getFullYear();
            const m = vnTime.getMonth();
            const d = vnTime.getDate();
            // Create date object for 5 AM VN
            // We know timezone offset for VN is +7 
            // So 5 AM VN = 22:00 PM previous day UTC usually, but simpler to use string parsing or library if available.
            // Since we don't have date-fns, let's trust the "vnTime" construction for "date" parts
            // but for comparison, we need to be careful.

            // Alternative: Simply check if user sent a message that is AFTER the last "bot prompt" or just "today".
            // Let's trust that if the message timestamp (converted to VN time) is > 5:00 AM TODAY.
            const msgVnTime = new Date(msgTime.toLocaleString("en-US", { timeZone: TIMEZONE }));

            if (msg.author.id === USER_ID) {
                // Check if message is from TODAY and AFTER 5 AM
                if (msgVnTime.getDate() === d && msgVnTime.getMonth() === m && msgVnTime.getFullYear() === y) {
                    if (msgVnTime.getHours() >= 5) {
                        userReplied = true;
                        break;
                    }
                }
            }
        }

        if (userReplied) {
            await store.set("confirmed", "true");
            console.log("User replied. Marking confirmed.");
            return new Response("User confirmed");
        }

        // If not confirmed and not 5 AM window -> SPAM
        console.log("User has not replied. SPAMMING.");
        await sendMessage(channelId, "Dậy đi bạn ơi! ⏰ Trả lời tin nhắn này để tắt báo thức! (5 phút/lần)");

        return new Response("Spam sent");

    } catch (err: any) {
        console.error("Error in daily reminder:", err);
        return new Response(`Error: ${err.message}`, { status: 500 });
    }
};

export const config: Config = {
    schedule: "*/5 * * * *",
};
