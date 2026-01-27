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
    const body: any = { content };
    if (components.length > 0) {
        body.components = components;
    }
    return discordRequest(`/channels/${channelId}/messages`, "POST", body);
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

    // Button Component (Interaction Style)
    const buttonComponent = {
        type: 1, // Action Row
        components: [
            {
                type: 2, // Button
                style: 3, // Green Button (SUCCESS style)
                label: "✅ Tôi đã dậy rồi!",
                custom_id: "wake_confirm"
            }
        ]
    };

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
            await sendMessage(
                channelId,
                "Chào buổi sáng! 🌅 Hãy bấm nút dưới để xác nhận bạn đã dậy nhé.",
                [buttonComponent]
            );
            return new Response("Sent 5 AM greeting");
        }

        // 3. Spam Check (Any other time)
        const isConfirmed = await store.get("confirmed");

        if (isConfirmed === "true") {
            console.log("User already confirmed today.");
            return new Response("Already confirmed");
        }

        // Check if user has replied since 5 AM today (keeping this logic as fallback)
        const messages = await getRecentMessages(channelId);

        const y = vnTime.getFullYear();
        const m = vnTime.getMonth();
        const d = vnTime.getDate();

        let userReplied = false;

        for (const msg of messages) {
            const msgTime = new Date(msg.timestamp);
            const msgVnTime = new Date(msgTime.toLocaleString("en-US", { timeZone: TIMEZONE }));

            if (msg.author.id === USER_ID) {
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
        await sendMessage(
            channelId,
            "Dậy đi bạn ơi! ⏰ BẤM XÁC NHẬN NGAY! (5 phút/lần)",
            [buttonComponent]
        );

        return new Response("Spam sent");

    } catch (err: any) {
        console.error("Error in daily reminder:", err);
        return new Response(`Error: ${err.message}`, { status: 500 });
    }
};

export const config: Config = {
    schedule: "*/5 * * * *",
};
