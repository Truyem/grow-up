const USER_ID = "817401534463213628";
const BOT_TOKEN = "MTA5NTMyNjE0MTk3MzI3MDU4OQ.GoIaAl.f0Kx55PEM0GWUMwIJFmx8fDABtsNfSn_eIublk";

async function run() {
    try {
        console.log("Creating DM channel...");
        const channelRes = await fetch("https://discord.com/api/v10/users/@me/channels", {
            method: "POST",
            headers: {
                "Authorization": `Bot ${BOT_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ recipient_id: USER_ID }),
        });

        if (!channelRes.ok) {
            throw new Error(`Failed to create DM: ${await channelRes.text()}`);
        }

        const channel = await channelRes.json();
        const channelId = channel.id;
        console.log(`Channel ID: ${channelId}`);

        console.log("Sending test message...");
        const msgRes = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
            method: "POST",
            headers: {
                "Authorization": `Bot ${BOT_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ content: "Đây là tin nhắn test từ Antigravity! 🚀 Kiểm tra kết nối thành công." }),
        });

        if (!msgRes.ok) {
            throw new Error(`Failed to send message: ${await msgRes.text()}`);
        }

        console.log("Message sent successfully!");
    } catch (error) {
        console.error("Error:", error);
    }
}

run();
