import { supabase } from './supabase';

const VAPID_PUBLIC_KEY = 'BPOXIYYrw7U6FmISPyjxu_0uy3KuhZKYI1awwnmtabE9P5GJNxhsuIj44CxvVF5iJPxyloZ76wvGQU2olfBbZzw';

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const buffer = new ArrayBuffer(rawData.length);
    const outputArray = new Uint8Array(buffer);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

/**
 * Register Service Worker and subscribe to Web Push.
 * Saves the subscription to Supabase.
 */
export async function subscribeToPush(userId: string): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('[Push] Web Push not supported in this browser.');
        return false;
    }

    try {
        // Register service worker
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        await navigator.serviceWorker.ready;

        // Check existing subscription
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
            // Request permission
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                console.log('[Push] Notification permission denied.');
                return false;
            }

            // Subscribe
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
            });
        }

        const { endpoint, keys } = subscription.toJSON() as any;

        // Upsert into Supabase
        const { error } = await supabase
            .from('push_subscriptions')
            .upsert(
                {
                    user_id: userId,
                    endpoint,
                    p256dh: keys.p256dh,
                    auth: keys.auth,
                },
                { onConflict: 'endpoint' }
            );

        if (error) {
            console.error('[Push] Failed to save subscription:', error);
            return false;
        }

        console.log('[Push] Subscribed successfully.');
        return true;
    } catch (err) {
        console.error('[Push] Subscribe error:', err);
        return false;
    }
}

/**
 * Unsubscribe from Web Push and remove from Supabase.
 */
export async function unsubscribeFromPush(userId: string): Promise<void> {
    if (!('serviceWorker' in navigator)) return;

    const registration = await navigator.serviceWorker.getRegistration('/');
    if (!registration) return;

    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', endpoint)
            .eq('user_id', userId);
        console.log('[Push] Unsubscribed.');
    }
}

/**
 * Check if push notifications are currently active for this user.
 */
export async function isPushSubscribed(): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
    const registration = await navigator.serviceWorker.getRegistration('/');
    if (!registration) return false;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
}
