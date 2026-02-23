import { type Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { verifyKey, InteractionType, InteractionResponseType } from "discord-interactions";
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Fallback hardcoded key (user should prefer Env Var)
const HARDCODED_PUBLIC_KEY = "2d5d49896f6caf63fedd377ceb2c34da16b292dc7d3f3abd7db4197b1ba7da0a";
const BLOB_STORE_NAME = "discord-reminder";

export default async (req: Request, context: Context) => {
    // 1. Get Public Key & Sanitize
    let publicKey = process.env.DISCORD_PUBLIC_KEY || HARDCODED_PUBLIC_KEY;
    publicKey = publicKey.trim(); // CRITICAL: Remove accidental copy-paste whitespace

    // 2. Get Headers & Body
    const signature = req.headers.get("X-Signature-Ed25519");
    const timestamp = req.headers.get("X-Signature-Timestamp");
    const body = await req.text();

    console.log(`[Interaction] Request received.`);
    console.log(`- Method: ${req.method}`);
    console.log(`- Body Length: ${body.length}`);
    console.log(`- Signature: ${signature ? "Present" : "Missing"}`);
    console.log(`- Timestamp: ${timestamp ? "Present" : "Missing"}`);
    console.log(`- PublicKey (first 10 chars): ${publicKey.substring(0, 10)}...`);

    // 3. Validate Headers
    if (!signature || !timestamp) {
        console.warn("[Interaction] Missing Discord Headers (Likely browser access)");
        return new Response("Missing or Invalid Discord Headers", { status: 401 });
    }

    // 4. Verify Signature
    // verifyKey expects strict match. 
    const isValid = await verifyKey(body, signature, timestamp, publicKey);

    if (!isValid) {
        console.error("[Interaction] Signature Verification FAILED");
        console.error("Possible causes: Wrong Public Key, Body Tampering, or Encoding Issue.");
        // We return 401 so Discord knows we rejected it (but we know why)
        return new Response("Bad Request Signature", { status: 401 });
    }

    console.log("[Interaction] Signature Verified Successfully!");

    // 5. Parse Body
    const interaction = JSON.parse(body);
    console.log(`[Interaction] Type: ${interaction.type}`);

    // 6. Handle PING (Verification)
    if (interaction.type === InteractionType.PING) {
        console.log("[Interaction] PING received. Replying PONG.");
        return new Response(JSON.stringify({
            type: InteractionResponseType.PONG,
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    }

    // 7. Handle Button Click
    if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
        // Fallback for old wake_confirm
        if (interaction.data.custom_id === "wake_confirm") {
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

        // Handle new schedule check buttons (e.g. check_smor-0)
        if (interaction.data.custom_id.startsWith("check_")) {
            const scheduleId = interaction.data.custom_id.replace("check_", "");

            // Single-user app → dùng hardcode Supabase user_id
            const USER_SUPABASE_ID = "8807b4b6-6462-471a-a99e-9d69ade70985";

            // Tính ngày VN bằng UTC+7 offset thủ công (đáng tin hơn toLocaleString trên serverless)
            const vnOffsetMs = 7 * 60 * 60 * 1000;
            const vnTime = new Date(Date.now() + vnOffsetMs);
            const dateKey = `${vnTime.getUTCFullYear()}-${String(vnTime.getUTCMonth() + 1).padStart(2, '0')}-${String(vnTime.getUTCDate()).padStart(2, '0')}`;

            console.log(`[Interaction] check_ button. scheduleId=${scheduleId}, dateKey=${dateKey}`);

            // Label mapping cho từng mục lịch sinh hoạt
            const SCHEDULE_LABELS: Record<string, string> = {
                'smor-0': 'Thức dậy',
                'smor-1': 'Vệ sinh cá nhân',
                'smor-2': 'Chuẩn bị ăn sáng / Caffeine 1',
                'smor-3': 'Ăn sáng',
                'smor-4': 'Đến phòng tập',
                'smor-5': 'Về nhà / Caffeine 2',
                'smor-6': 'Đi mua đồ ăn trưa',
                'smor-7': 'Nấu ăn trưa',
                'smor-8': 'Ăn trưa',
                'smor-9': 'Nghỉ ngơi / Omega 3 lần 1',
                'smor-10': 'Đi học',
                'saft-0': 'Về nhà / Ngủ trưa / Magnesium 1',
                'saft-1': 'Chuẩn bị bữa tối',
                'saft-2': 'Bật nóng lạnh, cắm cơm',
                'saft-3': 'Nấu ăn',
                'saft-4': 'Ăn tối',
                'saft-5': 'Tắm rửa',
                'saft-6': 'Giặt quần áo / Omega 3 lần 2',
                'saft-7': 'Ôn bài',
                'saft-8': 'Tập Isolation tại nhà',
                'saft-9': 'Giải trí / Creatine + Magnesium 2',
                'saft-10': 'Screen-off',
                'saft-11': 'Ngủ',
            };

            // Lấy log hôm nay từ daily_schedules_logs
            const { data: logData, error: logErr } = await supabase
                .from('daily_schedules_logs')
                .select('id, completed_schedule, schedule_state')
                .eq('user_id', USER_SUPABASE_ID)
                .eq('date', dateKey)
                .limit(1);

            if (logErr) {
                console.error("[Interaction] Lỗi query daily_schedules_logs:", logErr);
            }

            // Lấy state hiện tại (object key → boolean)
            let scheduleState: Record<string, boolean> = {};
            let logRowId: string | null = null;

            if (logData && logData.length > 0) {
                logRowId = logData[0].id;
                scheduleState = logData[0].schedule_state || {};
            }

            // Toggle trạng thái mục vừa bấm
            scheduleState[scheduleId] = !scheduleState[scheduleId];

            // Tạo mảng completed_schedule từ state
            const completedSchedule: string[] = Object.entries(scheduleState)
                .filter(([, checked]) => checked)
                .map(([key]) => SCHEDULE_LABELS[key] || key);

            if (logRowId) {
                // Cập nhật row đã có
                await supabase.from('daily_schedules_logs').update({
                    schedule_state: scheduleState,
                    completed_schedule: completedSchedule,
                }).eq('id', logRowId);
            } else {
                // Tạo mới row cho hôm nay
                await supabase.from('daily_schedules_logs').insert({
                    user_id: USER_SUPABASE_ID,
                    date: dateKey,
                    timestamp: Date.now(),
                    schedule_state: scheduleState,
                    completed_schedule: completedSchedule,
                });
            }

            const label = SCHEDULE_LABELS[scheduleId] || scheduleId;
            const isDone = scheduleState[scheduleId];

            return new Response(JSON.stringify({
                type: InteractionResponseType.UPDATE_MESSAGE,
                data: {
                    content: isDone
                        ? `✅ **${label}** — Đã hoàn thành!`
                        : `↩️ **${label}** — Đã bỏ đánh dấu.`,
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
