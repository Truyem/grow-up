import { type Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { verifyKey, InteractionType, InteractionResponseType } from "discord-interactions";

// Fallback hardcoded key (user should prefer Env Var)
const HARDCODED_PUBLIC_KEY = "2d5d49896f6caf63fedd377ceb2c34da16b292dc7d3f3abd7db4197b1ba7da0a";
const BLOB_STORE_NAME = "discord-reminder";

export default async (req: Request, context: Context) => {
    // Prefer Environment Variable, fallback to hardcoded
    const publicKey = process.env.DISCORD_PUBLIC_KEY || HARDCODED_PUBLIC_KEY;

    // 1. Get Headers & Body
    const signature = req.headers.get("X-Signature-Ed25519");
    const timestamp = req.headers.get("X-Signature-Timestamp");
    const body = await req.text();

    console.log(`[Interaction] Request received. Method: ${req.method}. Body Length: ${body.length}`);

    // 2. Validate existence of headers (Browser vs Discord check)
    if (!signature || !timestamp) {
        console.warn("[Interaction] Missing Discord Headers (Likely browser access)");
        return new Response("Missing or Invalid Discord Headers", { status: 401 });
    }

    // 3. Verify Signature
    const isValid = verifyKey(body, signature, timestamp, publicKey);

    if (!isValid) {
        console.error("[Interaction] Signature Verification FAILED");
        console.error(`- PublicKey Used: ${publicKey.substring(0, 10)}...`);
        console.error(`- Signature: ${signature}`);
        console.error(`- Timestamp: ${timestamp}`);
        return new Response("Bad Request Signature", { status: 401 });
    }

    // 4. Parse Body (Safe now)
    const interaction = JSON.parse(body);
    console.log(`[Interaction] Type: ${interaction.type}`);

    // 5. Handle PING (Verification)
    if (interaction.type === InteractionType.PING) {
        console.log("[Interaction] PING received. Replying PONG.");
        return new Response(JSON.stringify({
            type: InteractionResponseType.PONG,
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    }

    // 6. Handle Button Click
    if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
        if (interaction.data.custom_id === "wake_confirm") {
            console.log("[Interaction] 'wake_confirm' button clicked.");
            const store = getStore(BLOB_STORE_NAME);

            await store.set("confirmed", "true");

            return new Response(JSON.stringify({
                type: InteractionResponseType.UPDATE_MESSAGE,
                data: {
                    content: "✅ Tuyệt vời! Bạn đã xác nhận dậy thành công. Chúc một ngày tốt lành! ☀️",
                    components: []
                }
            }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });
        }
    }

    return new Response("Unknown Interaction", { status: 400 });
};
