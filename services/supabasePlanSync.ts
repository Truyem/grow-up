import { supabase } from './supabase';
import { DailyPlan } from '../types';

// ========================================
// Debounce utility
// ========================================
let saveTimer: ReturnType<typeof setTimeout> | null = null;

export const debouncedSavePlan = (
    userId: string,
    plan: DailyPlan,
    workoutProgress?: Record<string, any>,
    delay = 500
) => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        savePlanToSupabase(userId, plan, workoutProgress);
    }, delay);
};

// ========================================
// Save plan to Supabase (upsert by user_id + date)
// ========================================
export const savePlanToSupabase = async (
    userId: string,
    plan: DailyPlan,
    workoutProgress?: Record<string, any>
) => {
    try {
        const now = new Date();
        const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        // Extract workoutProgress from plan if embedded (from PlanDisplay toggle)
        const progressToSave = workoutProgress || (plan as any).workoutProgress || {};

        // Remove workoutProgress from plan_data to avoid duplication
        const { workoutProgress: _wp, ...cleanPlan } = plan as any;

        const { error } = await supabase.from('daily_plans').upsert(
            {
                user_id: userId,
                date: dateKey,
                plan_data: cleanPlan,
                workout_progress: progressToSave,
                updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,date' }
        );

        if (error) {
            console.error('[PlanSync] Save error:', error);
        } else {
            console.log('[PlanSync] Plan saved to Supabase');
        }
    } catch (err) {
        console.error('[PlanSync] Unexpected error:', err);
    }
};

// ========================================
// Load plan from Supabase for today
// ========================================
export const loadPlanFromSupabase = async (
    userId: string
): Promise<{ plan: DailyPlan | null; workoutProgress: Record<string, any> | null }> => {
    try {
        const now = new Date();
        const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        const { data, error } = await supabase
            .from('daily_plans')
            .select('plan_data, workout_progress')
            .eq('user_id', userId)
            .eq('date', dateKey)
            .maybeSingle();

        if (error) {
            console.error('[PlanSync] Load error:', error);
            return { plan: null, workoutProgress: null };
        }

        if (data) {
            console.log('[PlanSync] Plan loaded from Supabase');
            return {
                plan: data.plan_data as DailyPlan,
                workoutProgress: data.workout_progress as Record<string, any>,
            };
        }

        return { plan: null, workoutProgress: null };
    } catch (err) {
        console.error('[PlanSync] Unexpected load error:', err);
        return { plan: null, workoutProgress: null };
    }
};

// ========================================
// Delete old daily plans (for day change cleanup)
// ========================================
export const deleteOldPlans = async (userId: string, beforeDate: string) => {
    try {
        const { error } = await supabase
            .from('daily_plans')
            .delete()
            .eq('user_id', userId)
            .lt('date', beforeDate);

        if (error) {
            console.error('[PlanSync] Delete old plans error:', error);
        } else {
            console.log('[PlanSync] Old plans deleted');
        }
    } catch (err) {
        console.error('[PlanSync] Unexpected delete error:', err);
    }
};

// ========================================
// Record login history
// ========================================
export const recordLoginHistory = async (userId: string) => {
    try {
        // Get device info
        const deviceInfo = getDeviceInfo();

        // Check if an entry for this device already exists
        const { data: existingRecords, error: fetchError } = await supabase
            .from('login_history')
            .select('id')
            .eq('user_id', userId)
            .eq('device_info', deviceInfo)
            .order('last_seen', { ascending: false })
            .limit(1);

        if (fetchError) {
            console.warn('[LoginHistory] Fetch error:', fetchError);
        }

        const now = new Date().toISOString();

        if (existingRecords && existingRecords.length > 0) {
            // Update the existing record instead of creating a new one
            const recordId = existingRecords[0].id;
            const { error: updateError } = await supabase
                .from('login_history')
                .update({
                    login_time: now,
                    last_seen: now,
                    is_online: true
                })
                .eq('id', recordId);

            if (updateError) {
                console.error('[LoginHistory] Update error:', updateError);
            } else {
                console.log('[LoginHistory] Existing device login updated');
            }
            return;
        }

        // It's a new device, so fetch IP and location
        let ipAddress = 'Unknown';
        let location = 'Unknown';
        try {
            const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) });
            if (res.ok) {
                const geo = await res.json();
                ipAddress = geo.ip || 'Unknown';
                location = [geo.city, geo.region, geo.country_name].filter(Boolean).join(', ') || 'Unknown';
            }
        } catch {
            // Silently fail - geo is optional
        }

        const { error } = await supabase.from('login_history').insert({
            user_id: userId,
            device_info: deviceInfo,
            location,
            ip_address: ipAddress,
            login_time: now,
            is_online: true,
            last_seen: now,
        });

        if (error) {
            console.error('[LoginHistory] Insert error:', error);
        } else {
            console.log('[LoginHistory] New device login recorded');
        }
    } catch (err) {
        console.error('[LoginHistory] Unexpected error:', err);
    }
};

// ========================================
// Update last_seen for heartbeat
// ========================================
export const updateLastSeen = async (userId: string, loginId: string) => {
    try {
        await supabase.from('login_history').update({
            last_seen: new Date().toISOString(),
            is_online: true,
        }).eq('id', loginId);
    } catch {
        // Silent
    }
};

// ========================================
// Mark session offline
// ========================================
export const markOffline = async (userId: string, loginId: string) => {
    try {
        await supabase.from('login_history').update({
            is_online: false,
            last_seen: new Date().toISOString(),
        }).eq('id', loginId);
    } catch {
        // Silent
    }
};

// ========================================
// Load login history
// ========================================
export const loadLoginHistory = async (userId: string) => {
    try {
        const { data, error } = await supabase
            .from('login_history')
            .select('*')
            .eq('user_id', userId)
            .order('login_time', { ascending: false })
            .limit(20);

        if (error) {
            console.error('[LoginHistory] Load error:', error);
            return [];
        }

        return data || [];
    } catch {
        return [];
    }
};

// ========================================
// Helper: Get device info string
// ========================================
const getDeviceInfo = (): string => {
    const ua = navigator.userAgent;
    let device = 'Unknown Device';

    if (/iPhone/.test(ua)) device = 'iPhone';
    else if (/iPad/.test(ua)) device = 'iPad';
    else if (/Android/.test(ua)) {
        const match = ua.match(/Android.*?;\s*([^)]+)\)/);
        device = match ? match[1].trim() : 'Android Device';
    } else if (/Windows/.test(ua)) device = 'Windows PC';
    else if (/Mac/.test(ua)) device = 'Mac';
    else if (/Linux/.test(ua)) device = 'Linux PC';

    let browser = 'Unknown Browser';
    if (/Chrome\//.test(ua) && !/Edge/.test(ua)) browser = 'Chrome';
    else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) browser = 'Safari';
    else if (/Firefox\//.test(ua)) browser = 'Firefox';
    else if (/Edge\//.test(ua) || /Edg\//.test(ua)) browser = 'Edge';

    return `${device} — ${browser}`;
};
