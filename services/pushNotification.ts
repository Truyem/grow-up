import { supabase } from './supabase';

// Must match VAPID_PUBLIC_KEY used in Netlify functions environment
const VAPID_PUBLIC_KEY = 'BPOXIYYrw7U6FmISPyjxu_0uy3KuhZKYI1awwnmtabE9P5GJNxhsuIj44CxvVF5iJPxyloZ76wvGQU2olfBbZzw';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
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

async function saveSubscriptionToDb(userId: string, subscription: PushSubscription): Promise<boolean> {
    const { endpoint, keys } = subscription.toJSON() as any;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
        console.error('[Push] Subscription missing keys:', { endpoint: !!endpoint, p256dh: !!keys?.p256dh, auth: !!keys?.auth });
        return false;
    }

    const { error } = await supabase
        .from('push_subscriptions')
        .upsert(
            {
                user_id: userId,
                endpoint,
                p256dh: keys.p256dh,
                auth: keys.auth,
                updated_at: new Date().toISOString(),
            },
            { onConflict: 'endpoint' }
        );

    if (error) {
        console.error('[Push] Failed to save subscription to DB:', error);
        return false;
    }

    console.log('[Push] Subscription saved to DB successfully.');
    return true;
}

/**
 * Register Service Worker, request permission, subscribe to Web Push.
 * Saves the subscription to Supabase.
 */
export async function subscribeToPush(userId: string): Promise<boolean> {
    // Check browser support
    if (!('serviceWorker' in navigator)) {
        console.warn('[Push] Service Worker not supported.');
        return false;
    }
    if (!('PushManager' in window)) {
        console.warn('[Push] PushManager not supported.');
        return false;
    }
    if (!('Notification' in window)) {
        console.warn('[Push] Notification API not supported.');
        return false;
    }

    try {
        // 1. Request permission FIRST (before registering SW to avoid timing issues)
        let permission = Notification.permission;
        if (permission === 'default') {
            console.log('[Push] Requesting notification permission...');
            permission = await Notification.requestPermission();
        }
        if (permission !== 'granted') {
            console.warn('[Push] Notification permission denied:', permission);
            return false;
        }

        // 2. Register / get service worker
        let registration = await navigator.serviceWorker.getRegistration('/');
        if (!registration) {
            console.log('[Push] Registering service worker...');
            registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        }

        // 3. Wait for SW to be ready
        await navigator.serviceWorker.ready;
        console.log('[Push] Service worker ready.');

        // 4. Check existing subscription
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
            console.log('[Push] No existing subscription. Creating new one...');
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
            });
            console.log('[Push] New subscription created:', subscription.endpoint.substring(0, 60) + '...');
        } else {
            console.log('[Push] Existing subscription found. Updating DB...');
        }

        // 5. Save to Supabase
        return await saveSubscriptionToDb(userId, subscription);
    } catch (err: any) {
        console.error('[Push] Subscribe error:', err?.message || err);
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
        console.log('[Push] Unsubscribed successfully.');
    }
}

/**
 * Check if push notifications are currently active for this browser.
 */
export async function isPushSubscribed(): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
    const registration = await navigator.serviceWorker.getRegistration('/');
    if (!registration) return false;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
}

/**
 * Check full push support status (for display in UI).
 */
export function getPushSupportStatus(): {
    supported: boolean;
    permission: NotificationPermission | 'unsupported';
    reason?: string;
} {
    if (!('serviceWorker' in navigator)) {
        return { supported: false, permission: 'unsupported', reason: 'Service Worker not supported' };
    }
    if (!('PushManager' in window)) {
        return { supported: false, permission: 'unsupported', reason: 'Push API not supported' };
    }
    if (!('Notification' in window)) {
        return { supported: false, permission: 'unsupported', reason: 'Notification API not supported' };
    }
    return { supported: true, permission: Notification.permission };
}

/**
 * Listen for subscription changes from Service Worker and re-save to DB.
 * Call this once on app startup.
 */
export function listenForSubscriptionChanges(userId: string): () => void {
    if (!('serviceWorker' in navigator)) return () => {};

    const handler = (event: MessageEvent) => {
        if (event.data?.type === 'PUSH_SUBSCRIPTION_CHANGED' && event.data?.subscription) {
            console.log('[Push] Subscription changed by browser, re-saving...');
            // Re-create a PushSubscription-like object to save
            const sub = event.data.subscription;
            supabase.from('push_subscriptions').upsert(
                {
                    user_id: userId,
                    endpoint: sub.endpoint,
                    p256dh: sub.keys?.p256dh,
                    auth: sub.keys?.auth,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'endpoint' }
            ).then(({ error }) => {
                if (error) console.error('[Push] Failed to re-save changed subscription:', error);
                else console.log('[Push] Re-saved subscription after change.');
            });
        }
    };

    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
}
