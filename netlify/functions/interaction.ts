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

            // To update supabase we need the user's ID. 
            // We know the discord USER_ID, but the app uses a Supabase UUID.
            // Wait, we can't easily map Discord ID to Supabase ID unless we have a link.
            // As a quick fix, since the user is the only one using it, we could hardcode the user ID, 
            // or we could fetch the first user from profiles/users table if it's a single-user app.
            // Let's assume the user has a specific email or we can fetch the latest plan.

            // Actually, we can fetch the most recent plan regardless of user_id, since it's personal.
            // Better: fetch where date is today.
            const now = new Date();
            const vnTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
            const dateKey = `${vnTime.getFullYear()}-${String(vnTime.getMonth() + 1).padStart(2, '0')}-${String(vnTime.getDate()).padStart(2, '0')}`;

            const { data: plans, error: fetchErr } = await supabase
                .from('daily_plans')
                .select('*')
                .eq('date', dateKey)
                .limit(1);

            if (fetchErr || !plans || plans.length === 0) {
                return new Response(JSON.stringify({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        content: "❌ Không tìm thấy lịch trình hôm nay trong hệ thống.",
                        flags: 64 // Ephemeral
                    }
                }), { status: 200, headers: { "Content-Type": "application/json" } });
            }

            const planRow = plans[0];
            const userId = planRow.user_id;
            const progress = planRow.workout_progress || {};
            const scheduleState = progress.scheduleState || {};

            // Toggle
            const isChecked = !scheduleState[scheduleId];
            scheduleState[scheduleId] = isChecked;
            progress.scheduleState = scheduleState;

            const { error: updateErr } = await supabase
                .from('daily_plans')
                .update({ workout_progress: progress, updated_at: new Date().toISOString() })
                .eq('id', planRow.id);

            if (updateErr) {
                console.error("Failed to update schedule status:", updateErr);
            }

            // Also update workout_logs so the history view has it
            const SCHEDULE_LABELS: Record<string, string> = {
                'smor-0': 'Thức dậy',
                'smor-1': 'Vệ sinh cá nhân',
                'smor-2': 'Uống nước (300ml)',
                'smor-3': 'Skin care sáng',
                'smor-4': 'Học bài',
                'saft-0': 'Nghỉ trưa',
                'saft-1': 'Học bài',
                'seve-0': 'Vệ sinh cá nhân',
                'seve-1': 'Skin care tối',
                'seve-2': 'Ngủ'
            };

            const completedSchedule: string[] = [];
            Object.entries(scheduleState).forEach(([key, checked]) => {
                if (checked && SCHEDULE_LABELS[key]) {
                    completedSchedule.push(SCHEDULE_LABELS[key]);
                }
            });

            const { data: logData } = await supabase
                .from('daily_schedules_logs')
                .select('id, completed_schedule, timestamp')
                .eq('user_id', userId)
                .eq('date', dateKey)
                .limit(1);

            if (logData && logData.length > 0) {
                const logRow = logData[0];

                await supabase.from('daily_schedules_logs').update({
                    completed_schedule: completedSchedule
                }).eq('id', logRow.id);
            } else {
                await supabase.from('daily_schedules_logs').insert({
                    user_id: userId,
                    date: dateKey,
                    timestamp: new Date().getTime(),
                    completed_schedule: completedSchedule
                });
            }

            return new Response(JSON.stringify({
                type: InteractionResponseType.UPDATE_MESSAGE,
                data: {
                    content: `✅ Đã đánh dấu hoàn thành mục lục!`,
                    components: [] // remove the button after clicking
                }
            }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });
        }
    }

    return new Response("Unknown Interaction", { status: 400 });
};
