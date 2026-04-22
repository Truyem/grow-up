import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const isConfigured = supabaseUrl && supabaseAnonKey;

if (!isConfigured) {
    console.warn('⚠️ Supabase environment variables not configured. Auth and database features will be disabled.');
} else if (!supabaseUrl.startsWith('https://')) {
    console.warn('⚠️ Supabase URL should use HTTPS for security.');
}

export const supabase = isConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null;

export const isSupabaseConfigured = (): boolean => isConfigured;

export type Profile = {
    id: string;
    email: string | null;
    full_name: string | null;
    avatar_url: string | null;
    settings: any;
    updated_at: string;
};

export const getSupabaseClient = () => {
    if (!supabase) {
        throw new Error('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
    }
    return supabase;
};
