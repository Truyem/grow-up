import { Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

export default async (req: Request, context: Context) => {
    const store = getStore("presence");
    const now = Date.now();
    const WALKING_WINDOW = 60 * 1000; // 60 seconds

    if (req.method === "POST") {
        try {
            const { sessionId } = await req.json();
            if (!sessionId) {
                return new Response("Missing sessionId", { status: 400 });
            }

            // Store/Update the heartbeat for this session
            await store.set(sessionId, now.toString());

            return new Response(JSON.stringify({ success: true }), {
                headers: { "Content-Type": "application/json" },
            });
        } catch (error) {
            return new Response("Invalid JSON", { status: 400 });
        }
    }

    if (req.method === "GET") {
        // Get all keys (sessionIds)
        const { blobs } = await store.list();
        let onlineCount = 0;

        // Filter blobs that are newer than WALKING_WINDOW
        // Note: In a large scale app, we'd want to prune old blobs, 
        // but for this small app, we'll just filter them during the GET request.
        for (const blob of blobs) {
            const lastHeartbeat = await store.get(blob.key, { type: "text" });
            if (lastHeartbeat && (now - parseInt(lastHeartbeat)) < WALKING_WINDOW) {
                onlineCount++;
            } else {
                // Automatically cleanup stale blobs
                await store.delete(blob.key);
            }
        }

        return new Response(JSON.stringify({ onlineCount: Math.max(1, onlineCount) }), {
            headers: { "Content-Type": "application/json" },
        });
    }

    return new Response("Method not allowed", { status: 405 });
};
