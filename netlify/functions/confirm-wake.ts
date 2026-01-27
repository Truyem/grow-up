import { type Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

const BLOB_STORE_NAME = "discord-reminder";

export default async (req: Request, context: Context) => {
    const store = getStore(BLOB_STORE_NAME);
    const url = new URL(req.url);
    const userId = url.searchParams.get("id");

    if (!userId) {
        return new Response("Missing User ID", { status: 400 });
    }

    // Set confirmation
    await store.set("confirmed", "true");

    // Return a simple HTML page that closes itself or shows success
    const html = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Xác nhận đã dậy</title>
        <style>
            body {
                font-family: system-ui, -apple-system, sans-serif;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
                background-color: #f0fdf4;
                color: #15803d;
                text-align: center;
            }
            .icon { font-size: 4rem; margin-bottom: 1rem; }
            h1 { margin: 0 0 0.5rem; }
            p { color: #4b5563; }
        </style>
    </head>
    <body>
        <div class="icon">☀️</div>
        <h1>Đã xác nhận!</h1>
        <p>Chúc bạn một ngày tốt lành.</p>
        <script>
            // Optional: Close window if opened via script (browsers block this often, but worth a try)
            setTimeout(() => {
                // window.close();
            }, 3000);
        </script>
    </body>
    </html>
    `;

    return new Response(html, {
        headers: { "Content-Type": "text/html" },
    });
};
