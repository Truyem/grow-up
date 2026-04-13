import { supabase } from './supabase';
import { DailyPlan, UserGoals, UserInput, UserStats, WorkoutHistoryItem, AchievementBadge, SleepQuality } from '../types';

const getTodayDateKey = (): string => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const getPlanDateKey = (planDateText?: string): string => {
    if (planDateText) {
        const parsed = parseVietnameseDateToISO(planDateText);
        if (parsed) return parsed;
    }
    return getTodayDateKey();
};

const parseVietnameseDateToISO = (value: string): string | null => {
    const match = value.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (!match) return null;

    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);

    if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900) {
        return null;
    }

    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

// ========================================
// Debounce utility
// ========================================
let saveTimer: ReturnType<typeof setTimeout> | null = null;

export const debouncedSavePlan = (
    userId: string,
    plan: DailyPlan,
    workoutProgress?: Record<string, any>,
    delay = 100
) => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        void savePlanToSupabase(userId, plan, workoutProgress);
    }, delay);
};

// ========================================
// Save plan to Supabase (upsert by user_id + date)
// ========================================
export const savePlanToSupabase = async (
    userId: string,
    plan: DailyPlan,
    workoutProgress?: Record<string, any>,
    planDateKey?: string
) : Promise<boolean> => {
    const dateKey = planDateKey || getPlanDateKey(plan?.date);

    // Extract workoutProgress from plan if embedded (from PlanDisplay toggle)
    const progressToSave = workoutProgress || (plan as any).workoutProgress || {};

    // Remove workoutProgress from plan_data to avoid duplication
    const { workoutProgress: _wp, ...cleanPlan } = plan as any;

    try {
        // Xóa tất cả các bản ghi cũ của ngày này để ghi đè bản mới nhất
        const { error: deleteError } = await supabase
            .from('daily_plans')
            .delete()
            .eq('user_id', userId)
            .eq('date', dateKey);

        if (deleteError) {
            console.error('[PlanSync] Delete existing plan error:', deleteError);
        }

        const { error } = await supabase.from('daily_plans').insert({
            user_id: userId,
            date: dateKey,
            plan_data: cleanPlan,
            workout_progress: progressToSave,
            updated_at: new Date().toISOString(),
        });

        if (error) {
            console.error('[PlanSync] Save error:', error);
            return false;
        } else {
            console.log('[PlanSync] Plan saved to Supabase');
            return true;
        }
    } catch (err) {
        console.error('[PlanSync] Save failed:', err);
        return false;
    }
};

// ========================================
// Load plan from Supabase for today
// ========================================
export const loadPlanFromSupabase = async (
    userId: string,
    planDateKey?: string
): Promise<{ plan: DailyPlan | null; workoutProgress: Record<string, any> | null }> => {
    const dateKey = planDateKey || getTodayDateKey();

    try {
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
            console.log('[PlanSync] Plan loaded from Supabase:', data);
            return {
                plan: data.plan_data as DailyPlan,
                workoutProgress: data.workout_progress as Record<string, any>,
            };
        }

        return { plan: null, workoutProgress: null };
    } catch (err) {
        console.error('[PlanSync] Load error:', err);
        return { plan: null, workoutProgress: null };
    }
};

// ========================================
// LocalStorage for offline plans (unused - kept for potential future use)
// ========================================
type OfflinePlanData = {
    plan: DailyPlan;
    workoutProgress: Record<string, any> | null;
};

const getOfflinePlansFromStorage = (): Record<string, OfflinePlanData> => {
    try {
        const stored = localStorage.getItem(OFFLINE_PLANS_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch {
        return {};
    }
};

const saveToOfflineStorage = (userId: string, plan: DailyPlan, workoutProgress: Record<string, any> | null, dateKey: string): void => {
    try {
        const plans = getOfflinePlansFromStorage();
        const key = `${userId}_${dateKey || getPlanDateKey(plan?.date)}`;
        plans[key] = { plan, workoutProgress };
        localStorage.setItem(OFFLINE_PLANS_KEY, JSON.stringify(plans));
        console.log('[PlanSync] Plan saved to offline storage:', key);
    } catch (err) {
        console.error('[PlanSync] Offline storage error:', err);
    }
};

const loadFromOfflineStorage = (userId: string, dateKey?: string): { plan: DailyPlan | null; workoutProgress: Record<string, any> | null } => {
    try {
        const plans = getOfflinePlansFromStorage();
        const key = `${userId}_${dateKey || getTodayDateKey()}`;
        const data = plans[key];
        return data ? { plan: data.plan, workoutProgress: data.workoutProgress || null } : { plan: null, workoutProgress: null };
    } catch {
        return { plan: null, workoutProgress: null };
    }
};

export const syncOfflinePlansToSupabase = async (userId: string): Promise<number> => {
    if (!isOnline()) return 0;
    const plans = getOfflinePlansFromStorage();
    let synced = 0;
    for (const key in plans) {
        if (key.startsWith(userId + '_')) {
            const { plan, workoutProgress } = plans[key];
            const dateKey = key.replace(userId + '_', '');
            const success = await savePlanToSupabase(userId, plan, workoutProgress, dateKey);
            if (success) {
                delete plans[key];
                synced++;
            }
        }
    }
    if (synced > 0) {
        localStorage.setItem(OFFLINE_PLANS_KEY, JSON.stringify(plans));
        console.log('[PlanSync] Synced', synced, 'offline plans to Supabase');
    }
    return synced;
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
// LocalStorage sync helpers
// ========================================

export const syncUserSettingsToSupabase = async (userId: string, settings: UserInput) => {
    try {
        const { data: existing } = await supabase
            .from('profiles')
            .select('settings')
            .eq('id', userId)
            .maybeSingle();

        const existingSettings = (existing?.settings && typeof existing.settings === 'object')
            ? existing.settings
            : {};

        const mergedSettings = {
            ...existingSettings,
            userData: settings,
        };

        const { error } = await supabase
            .from('profiles')
            .upsert(
                {
                    id: userId,
                    settings: mergedSettings,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'id' }
            );

        if (error) {
            console.error('[ProfileSync] settings sync error:', error);
        }
    } catch (err) {
        console.error('[ProfileSync] settings unexpected error:', err);
    }
};

export const syncUserStatsToSupabase = async (userId: string, stats: UserStats) => {
    try {
        const { data: existing } = await supabase
            .from('profiles')
            .select('settings')
            .eq('id', userId)
            .maybeSingle();

        const existingSettings = (existing?.settings && typeof existing.settings === 'object')
            ? existing.settings
            : {};

        const mergedSettings = {
            ...existingSettings,
            userStats: stats,
        };

        const { error } = await supabase
            .from('profiles')
            .upsert(
                {
                    id: userId,
                    settings: mergedSettings,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'id' }
            );

        if (error) {
            console.error('[ProfileSync] stats sync error:', error);
        }
    } catch (err) {
        console.error('[ProfileSync] stats unexpected error:', err);
    }
};

export const syncUserGoalsToSupabase = async (userId: string, goals: UserGoals | null) => {
    if (!goals) return;
    try {
        const { data: existing } = await supabase
            .from('profiles')
            .select('settings')
            .eq('id', userId)
            .maybeSingle();

        const existingSettings = (existing?.settings && typeof existing.settings === 'object')
            ? existing.settings
            : {};

        const mergedSettings = {
            ...existingSettings,
            userGoals: goals,
        };

        const { error } = await supabase
            .from('profiles')
            .upsert(
                {
                    id: userId,
                    settings: mergedSettings,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'id' }
            );

        if (error) {
            console.error('[ProfileSync] goals sync error:', error);
        }
    } catch (err) {
        console.error('[ProfileSync] goals unexpected error:', err);
    }
};

export const syncWorkoutHistoryToSupabase = async (userId: string, history: WorkoutHistoryItem[]) => {
    if (!history || history.length === 0) return;
    try {
        const rows = history.map((item) => ({
            user_id: userId,
            date: parseVietnameseDateToISO(item.date) || new Date(item.timestamp).toISOString().split('T')[0],
            data: item,
        }));

        const dates = [...new Set(rows.map((r) => r.date))];

        // Xóa tất cả các bản ghi cũ của các ngày này để ghi đè bản mới nhất
        const { error: deleteError } = await supabase
            .from('workout_logs')
            .delete()
            .eq('user_id', userId)
            .in('date', dates);

        if (deleteError) {
            console.error('[HistorySync] delete existing logs error:', deleteError);
        }

        const { error } = await supabase
            .from('workout_logs')
            .insert(rows);

        if (error) {
            // Graceful fallback if table is missing in this project
            const code = (error as any)?.code;
            if (code === 'PGRST204' || code === 'PGRST205') {
                console.warn('[HistorySync] workout_logs table/columns not available. Skipping cloud sync.');
                return;
            }
            console.error('[HistorySync] workout history sync error:', error);
        }
    } catch (err) {
        console.error('[HistorySync] workout history unexpected error:', err);
    }
};

export const syncAchievementsToSupabase = async (userId: string, achievements: AchievementBadge[]) => {
    try {
        const unlockedAchievements = achievements
            .filter(a => a.unlocked)
            .map(a => ({
                user_id: userId,
                achievement_id: a.id,
                unlocked_at: new Date().toISOString(),
            }));

        if (unlockedAchievements.length > 0) {
            const { error } = await supabase
                .from('user_achievements')
                .upsert(unlockedAchievements, { onConflict: 'user_id,achievement_id' });
            if (error) {
                console.error('[AchievementsSync] upsert error:', error);
            }
        } else {
            await supabase.from('user_achievements').delete().eq('user_id', userId);
        }
    } catch (err) {
        console.error('[AchievementsSync] unexpected error:', err);
    }
};

export const loadAchievementsFromSupabase = async (userId: string): Promise<Set<string> | null> => {
    try {
        const { data, error } = await supabase
            .from('user_achievements')
            .select('achievement_id')
            .eq('user_id', userId);

        if (error) {
            console.error('[AchievementsSync] load error:', error);
            return null;
        }

        return new Set((data || []).map(r => r.achievement_id));
    } catch (err) {
        console.error('[AchievementsSync] load unexpected error:', err);
        return null;
    }
};

export const deletePlanByDate = async (userId: string, dateKey: string): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('daily_plans')
            .delete()
            .eq('user_id', userId)
            .eq('date', dateKey);

        if (error) {
            console.error('[PlanSync] Delete plan error:', error);
            return false;
        }

        return true;
    } catch (err) {
        console.error('[PlanSync] Unexpected delete plan error:', err);
        return false;
    }
};

export const upsertWorkoutHistoryItemToSupabase = async (userId: string, item: WorkoutHistoryItem): Promise<boolean> => {
    try {
        const dateKey = parseVietnameseDateToISO(item.date) || new Date(item.timestamp).toISOString().split('T')[0];
        const currentRecordType = item.recordType || 'workout'; // Mặc định là workout nếu không có
        
        // Lấy các bản ghi trong ngày
        const { data: existingRecords } = await supabase
            .from('workout_logs')
            .select('id, data')
            .eq('user_id', userId)
            .eq('date', dateKey);

        if (existingRecords && existingRecords.length > 0) {
            // Chỉ xóa những bản ghi CÙNG NGÀY và CÙNG LOẠI (sleep vs workout/nutrition)
            // Tránh việc lưu Sleep lại vô tình xóa mất Workout của ngày hôm đó
            const idsToDelete = existingRecords.filter(row => {
                const rowType = row.data?.recordType || 'workout';
                return rowType === currentRecordType;
            }).map(row => row.id);

            if (idsToDelete.length > 0) {
                const { error: deleteError } = await supabase
                    .from('workout_logs')
                    .delete()
                    .in('id', idsToDelete);
                
                if (deleteError) {
                    console.error('[HistorySync] delete existing logs error:', deleteError);
                }
            }
        }

        const { error } = await supabase
            .from('workout_logs')
            .insert({
                user_id: userId,
                date: dateKey,
                data: item,
            });

        if (error) {
            const code = (error as any)?.code;
            if (code === 'PGRST204' || code === 'PGRST205') {
                console.warn('[HistorySync] workout_logs table/columns not available. Skipping save.');
                return false;
            }
            console.error('[HistorySync] insert item error:', error);
            return false;
        }

        return true;
    } catch (err) {
        console.error('[HistorySync] overwrite item unexpected error:', err);
        return false;
    }
};

export const deleteWorkoutHistoryItemFromSupabase = async (userId: string, timestamp: number): Promise<boolean> => {
    try {
        const dateKey = new Date(timestamp).toISOString().split('T')[0];
        const { error } = await supabase
            .from('workout_logs')
            .delete()
            .eq('user_id', userId)
            .eq('date', dateKey);

        if (error) {
            console.error('[HistorySync] delete item error:', error);
            return false;
        }

        return true;
    } catch (err) {
        console.error('[HistorySync] delete item unexpected error:', err);
        return false;
    }
};

export const loadWorkoutHistoryFromSupabase = async (userId: string): Promise<WorkoutHistoryItem[]> => {
    try {
        const { data, error } = await supabase
            .from('workout_logs')
            .select('data')
            .eq('user_id', userId)
            .order('date', { ascending: false });

        if (error) {
            const code = (error as any)?.code;
            if (code === 'PGRST204' || code === 'PGRST205') {
                console.warn('[HistorySync] workout_logs table/columns not available. Returning empty history.');
                return [];
            }
            console.error('[HistorySync] load history error:', error);
            return [];
        }

        const history = (data || [])
            .map((row: any) => row?.data)
            .filter((item: any) => item && typeof item.timestamp === 'number');

        // Chỉ phân loại trùng lặp DỰA TRÊN NGÀY + LOẠI BẢN GHI (sleep vs workout)
        // để không bị ghi đè sleep vào workout
        const dedupByDateAndType = new Map<string, WorkoutHistoryItem>();
        history.forEach((item: WorkoutHistoryItem) => {
            const keyDate = parseVietnameseDateToISO(item.date) || new Date(item.timestamp).toISOString().split('T')[0];
            const recordType = item.recordType || 'workout';
            const compoundKey = `${keyDate}_${recordType}`;
            
            const existing = dedupByDateAndType.get(compoundKey);
            if (!existing || item.timestamp > existing.timestamp) {
                dedupByDateAndType.set(compoundKey, item);
            }
        });

        // Tách riêng workout để hiển thị (do code cũ yêu cầu)
        // Những hàm như loadSleepRecoveryFromSupabase sẽ cần dùng đến cả sleep
        return Array.from(dedupByDateAndType.values()).sort((a, b) => b.timestamp - a.timestamp);
    } catch (err) {
        console.error('[HistorySync] load history unexpected error:', err);
        return [];
    }
};

export const upsertSleepLogToWorkoutLogs = async (userId: string, sleepStart: string, sleepEnd: string, dateText?: string): Promise<boolean> => {
    try {
        const timestamp = Date.now();
        const date = dateText || new Date(timestamp).toLocaleDateString('vi-VN');
        const hours = (() => {
            const [startHour, startMinute] = sleepStart.split(':').map(Number);
            const [endHour, endMinute] = sleepEnd.split(':').map(Number);
            if ([startHour, startMinute, endHour, endMinute].some((n) => Number.isNaN(n))) return 8;
            const start = startHour * 60 + startMinute;
            let end = endHour * 60 + endMinute;
            if (end <= start) end += 24 * 60;
            return Math.min(12, Math.max(3, (end - start) / 60));
        })();
        const item: WorkoutHistoryItem = {
            recordType: 'sleep',
            date,
            timestamp,
            levelSelected: 'Giấc ngủ',
            summary: 'Ghi nhận giấc ngủ',
            completedExercises: [],
            sleepStart,
            sleepEnd,
            sleepHours: hours,
            sleepQuality: (hours >= 7 ? 'good' : hours >= 5.5 ? 'average' : 'bad') as SleepQuality,
        };

        return upsertWorkoutHistoryItemToSupabase(userId, item);
    } catch (err) {
        console.error('[HistorySync] sleep log unexpected error:', err);
        return false;
    }
};

export const loadSleepRecoveryFromSupabase = async (userId: string) => {
    const history = await loadWorkoutHistoryFromSupabase(userId);
    return history.filter((item) => item.recordType === 'sleep' || (item.sleepHours != null && item.completedExercises.length === 0));
};

export const loadProfileSettingsFromSupabase = async (userId: string) => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('settings')
            .eq('id', userId)
            .maybeSingle();

        if (error) {
            console.error('[ProfileSync] profile settings load error:', error);
            return null;
        }

        return (data?.settings && typeof data.settings === 'object') ? data.settings as any : null;
    } catch (err) {
        console.error('[ProfileSync] profile settings unexpected error:', err);
        return null;
    }
};

export interface SupplementLogRecord {
    date: string;
    water_ml: number;
    whey: boolean;
    creatine: boolean;
    vitamin: boolean;
    omega3: boolean;
    lastUpdated: number;
}

export const syncSupplementLogToSupabase = async (userId: string, supplementLog: SupplementLogRecord): Promise<boolean> => {
    try {
        const { data: existing } = await supabase
            .from('profiles')
            .select('settings')
            .eq('id', userId)
            .maybeSingle();

        const existingSettings = (existing?.settings && typeof existing.settings === 'object')
            ? existing.settings
            : {};

        const mergedSettings = {
            ...existingSettings,
            supplementLog,
        };

        const { error } = await supabase
            .from('profiles')
            .upsert(
                {
                    id: userId,
                    settings: mergedSettings,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'id' }
            );

        if (error) {
            console.error('[ProfileSync] supplement log sync error:', error);
            return false;
        }

        return true;
    } catch (err) {
        console.error('[ProfileSync] supplement log unexpected error:', err);
        return false;
    }
};

export const loadSupplementLogFromSupabase = async (userId: string): Promise<SupplementLogRecord | null> => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('settings')
            .eq('id', userId)
            .maybeSingle();

        if (error) {
            console.error('[ProfileSync] supplement log load error:', error);
            return null;
        }

        const settings = (data?.settings && typeof data.settings === 'object') ? data.settings as any : {};
        const log = settings?.supplementLog;
        if (!log || typeof log !== 'object') return null;

        if (typeof log.date !== 'string' || typeof log.water_ml !== 'number' || typeof log.lastUpdated !== 'number') {
            return null;
        }

        return {
            date: log.date,
            water_ml: log.water_ml,
            whey: !!log.whey,
            creatine: !!log.creatine,
            vitamin: !!log.vitamin,
            omega3: !!log.omega3,
            lastUpdated: log.lastUpdated,
        };
    } catch (err) {
        console.error('[ProfileSync] supplement log load unexpected error:', err);
        return null;
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
