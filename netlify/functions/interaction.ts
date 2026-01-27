import { type Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { verifyKey, InteractionType, InteractionResponseType } from "discord-interactions";

const PUBLIC_KEY = "2d5d49896f6caf63fedd377ceb2c34da16b292dc7d3f3abd7db4197b1ba7da0a";
const BLOB_STORE_NAME = "discord-reminder";

export default async (req: Request, context: Context) => {
    // 1. Verify Signature
    const signature = req.headers.get("X-Signature-Ed25519");
    const timestamp = req.headers.get("X-Signature-Timestamp");
    const body = await req.text();

    if (!signature || !timestamp || !verifyKey(body, signature, timestamp, PUBLIC_KEY)) {
        console.error("Invalid Request Signature");
        return new Response("Bad Request Signature", { status: 401 });
    }

    const interaction = JSON.parse(body);

    // 2. Handle specific Interaction Types

    // PING (Required by Discord for endpoint verification)
    if (interaction.type === InteractionType.PING) {
        return new Response(JSON.stringify({
            type: InteractionResponseType.PONG,
        }), {
            headers: { "Content-Type": "application/json" },
        });
    }

    // COMPONENT INTERACTION (Button Click)
    if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
        if (interaction.data.custom_id === "wake_confirm") {
            const store = getStore(BLOB_STORE_NAME);

            // Mark as confirmed
            await store.set("confirmed", "true");

            // Respond to the user (update message or silence it)
            return new Response(JSON.stringify({
                type: InteractionResponseType.UPDATE_MESSAGE, // Updates the message that contained the button
                data: {
                    content: "✅ Tuyệt vời! Bạn đã xác nhận dậy thành công. Chúc một ngày tốt lành! ☀️",
                    components: [] // Remove components (buttons) after confirmation
                }
            }), {
                headers: { "Content-Type": "application/json" }
            });
        }
    }

    // Default Fallback
    return new Response("Unknown Interaction", { status: 400 });
};
