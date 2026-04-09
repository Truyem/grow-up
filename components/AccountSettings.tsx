import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { loadLoginHistory } from '../services/supabasePlanSync';
import { subscribeToPush, unsubscribeFromPush, isPushSubscribed, getPushSupportStatus, listenForSubscriptionChanges } from '../services/pushNotification';
import { User } from '@supabase/supabase-js';
import { User as UserIcon, Mail, Lock, LogOut, Loader2, Save, BadgeCheck, AlertCircle, Monitor, Smartphone, Clock, MapPin, Wifi, WifiOff, Globe, Bell, BellOff } from 'lucide-react';
import { Toast } from './ui/Toast';

interface LoginRecord {
    id: string;
    device_info: string;
    ip_address: string;
    location: string;
    login_time: string;
    is_online: boolean;
    last_seen: string;
}

interface AccountSettingsProps {
    user: User;
    onLogout: () => void;
}

export const AccountSettings: React.FC<AccountSettingsProps> = ({ user, onLogout }) => {
    const [fullName, setFullName] = useState(user.user_metadata?.full_name || '');
    const [currentPassword, setCurrentPassword] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loginHistory, setLoginHistory] = useState<LoginRecord[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [isPushOn, setIsPushOn] = useState<boolean | null>(null);
    const [isTestingPush, setIsTestingPush] = useState(false);
    const [isSubscribingPush, setIsSubscribingPush] = useState(false);
    const [pushSupport, setPushSupport] = useState<ReturnType<typeof getPushSupportStatus> | null>(null);

    // Sync full name if it changes externally or initially
    useEffect(() => {
        if (user.user_metadata?.full_name) {
            setFullName(user.user_metadata.full_name);
        }
    }, [user]);

    // Load login history on mount
    useEffect(() => {
        const fetchHistory = async () => {
            setIsLoadingHistory(true);
            try {
                const history = await loadLoginHistory(user.id);
                setLoginHistory(history || []);
            } catch (e) {
                console.error('[AccountSettings] Failed to load login history', e);
            } finally {
                setIsLoadingHistory(false);
            }
        };
        fetchHistory();
    }, [user.id]);

    // Check notification permission status
    useEffect(() => {
        const status = getPushSupportStatus();
        setPushSupport(status);

        if (status.supported) {
            isPushSubscribed().then(setIsPushOn);
        } else {
            setIsPushOn(false);
        }

        // Listen for SW subscription changes
        const cleanup = listenForSubscriptionChanges(user.id);
        return cleanup;
    }, [user.id]);

    const handleSubscribePush = async () => {
        setIsSubscribingPush(true);
        setError(null);
        try {
            const ok = await subscribeToPush(user.id);
            if (ok) {
                setIsPushOn(true);
                setMsg('Đã bật thông báo! Push notification sẽ hoạt động ngay.');
            } else {
                setError('Không thể đăng ký push. Kiểm tra lại quyền thông báo trong trình duyệt.');
            }
        } catch (e: any) {
            setError('Lỗi đăng ký push: ' + e.message);
        } finally {
            setIsSubscribingPush(false);
        }
    };

    const handleUnsubscribePush = async () => {
        setIsSubscribingPush(true);
        try {
            await unsubscribeFromPush(user.id);
            setIsPushOn(false);
            setMsg('Đã tắt thông báo push.');
        } catch (e: any) {
            setError('Lỗi tắt push: ' + e.message);
        } finally {
            setIsSubscribingPush(false);
        }
    };

    const handleTestNotification = async () => {
        setIsTestingPush(true);
        setError(null);
        try {
            const isCapacitor = !!(window as any).Capacitor?.isNativePlatform?.();

            if (isCapacitor) {
                const ln = (window as any).Capacitor?.Plugins?.LocalNotifications;
                if (!ln) {
                    setError('Plugin thông báo không sẵn sàng. Vui lòng cài lại app.');
                    return;
                }
                await ln.schedule({
                    notifications: [{
                        id: Math.floor(Date.now() / 1000),
                        title: '🔔 Test Thông Báo',
                        body: 'Notification hoạt động bình thường!',
                        schedule: { at: new Date(Date.now() + 500) },
                        smallIcon: 'ic_launcher',
                    }]
                });
                setMsg('Đã gửi test notification (Capacitor)!');
            } else {
                // Web browser - use Service Worker showNotification
                if (!('Notification' in window)) {
                    setError('Trình duyệt không hỗ trợ thông báo.');
                    return;
                }
                let permission = Notification.permission;
                if (permission === 'default') {
                    permission = await Notification.requestPermission();
                }
                if (permission !== 'granted') {
                    setError('Chưa cấp quyền thông báo. Vào Cài đặt trình duyệt để cho phép.');
                    return;
                }

                setIsPushOn(true);

                if ('serviceWorker' in navigator) {
                    const reg = await navigator.serviceWorker.ready;
                    await reg.showNotification('🔔 Test Thông Báo', {
                        body: 'Push notification hoạt động bình thường!',
                        icon: '/icons/icon-192.webp',
                        badge: '/icons/icon-96.webp',
                        tag: 'test-notification',
                        vibrate: [200, 100, 200],
                    } as NotificationOptions);
                } else {
                    new Notification('🔔 Test Thông Báo', { body: 'Hoạt động bình thường!' });
                }
                setMsg('Test notification đã gửi!');
            }
        } catch (e: any) {
            setError('Lỗi: ' + (e.message || 'Không gửi được thông báo'));
        } finally {
            setIsTestingPush(false);
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setMsg(null);

        try {
            // Update Auth Metadata
            const { error: authError } = await supabase.auth.updateUser({
                data: { full_name: fullName }
            });
            if (authError) throw authError;

            // Update Profiles Table (for redundancy/easier access)
            const { error: proError } = await supabase
                .from('profiles')
                .update({ full_name: fullName, updated_at: new Date().toISOString() })
                .eq('id', user.id);
            if (proError) throw proError;

            setMsg('Đã cập nhật thông tin thành công!');
        } catch (err: any) {
            setError(err.message || 'Lỗi cập nhật hồ sơ');
        } finally {
            setIsLoading(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError('Mật khẩu nhập lại không khớp');
            return;
        }
        if (password.length < 6) {
            setError('Mật khẩu mới phải có ít nhất 6 ký tự');
            return;
        }
        if (!currentPassword) {
            setError('Vui lòng nhập mật khẩu hiện tại');
            return;
        }

        setIsLoading(true);
        setError(null);
        setMsg(null);

        try {
            // Verify current password first
            const { error: verifyError } = await supabase.auth.signInWithPassword({
                email: user.email!,
                password: currentPassword
            });

            if (verifyError) {
                if (verifyError.message.includes("Invalid login credentials")) {
                    throw new Error("Mật khẩu hiện tại không chính xác");
                }
                throw verifyError;
            }

            // Proceed to update password
            const { error } = await supabase.auth.updateUser({ password: password });
            if (error) throw error;

            setMsg('Đã đổi mật khẩu thành công!');
            setCurrentPassword('');
            setPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            setError(err.message || 'Lỗi đổi mật khẩu');
        } finally {
            setIsLoading(false);
        }
    };

    const formatLoginTime = (isoStr: string) => {
        try {
            const d = new Date(isoStr);
            const now = new Date();
            const diffMs = now.getTime() - d.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);

            if (diffMins < 1) return 'Vừa xong';
            if (diffMins < 60) return `${diffMins} phút trước`;
            if (diffHours < 24) return `${diffHours} giờ trước`;
            if (diffDays < 7) return `${diffDays} ngày trước`;

            return d.toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return isoStr;
        }
    };

    const getDeviceIcon = (deviceInfo: string) => {
        const lower = (deviceInfo || '').toLowerCase();
        if (lower.includes('mobile') || lower.includes('android') || lower.includes('iphone') || lower.includes('ipad')) {
            return <Smartphone className="w-5 h-5" />;
        }
        return <Monitor className="w-5 h-5" />;
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6 pb-20 animate-fade-in">
            {/* Header */}
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-xl">
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl shadow-lg">
                        <UserIcon className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">Cài Đặt Tài Khoản</h2>
                        <p className="text-gray-400">Quản lý thông tin và bảo mật</p>
                    </div>
                </div>

                {/* Profile Section */}
                <form onSubmit={handleUpdateProfile} className="space-y-6 border-b border-white/10 pb-8">
                    <h3 className="text-lg font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                        <BadgeCheck className="w-5 h-5" /> Thông Tin Cá Nhân
                    </h3>

                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-400 ml-1">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-3.5 w-5 h-5 text-gray-500" />
                                <input
                                    type="email"
                                    value={user.email || ''}
                                    disabled
                                    className="w-full bg-white/5 border border-white/5 rounded-xl py-3 pl-12 pr-4 text-gray-400 cursor-not-allowed"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-400 ml-1">Tên hiển thị</label>
                            <div className="relative group">
                                <UserIcon className="absolute left-4 top-3.5 w-5 h-5 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/50 focus:bg-black/30 transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-6 py-2 rounded-lg bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-600/30 hover:text-cyan-300 transition-all font-medium flex items-center gap-2"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Lưu Thông Tin
                        </button>
                    </div>
                </form>

                {/* Password Section */}
                <form onSubmit={handleChangePassword} className="space-y-6 pt-8">
                    <h3 className="text-lg font-semibold text-pink-400 uppercase tracking-wider flex items-center gap-2">
                        <Lock className="w-5 h-5" /> Đổi Mật Khẩu
                    </h3>

                    <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-400 ml-1">Mật khẩu hiện tại</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-3.5 w-5 h-5 text-gray-500 group-focus-within:text-pink-400 transition-colors" />
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-pink-500/50 focus:bg-black/30 transition-all"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-400 ml-1">Mật khẩu mới</label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-3.5 w-5 h-5 text-gray-500 group-focus-within:text-pink-400 transition-colors" />
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-pink-500/50 focus:bg-black/30 transition-all"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-400 ml-1">Nhập lại mật khẩu mới</label>
                                <div className="relative group">
                                    <div className={`absolute left-4 top-3.5 w-5 h-5 transition-colors ${confirmPassword && password === confirmPassword ? 'text-emerald-500' : 'text-gray-500'}`}>
                                        <BadgeCheck className="w-full h-full" />
                                    </div>
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-Pink-500/50 focus:bg-black/30 transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={isLoading || !password || !confirmPassword}
                            className="px-6 py-2 rounded-lg bg-pink-600/20 text-pink-400 border border-pink-500/30 hover:bg-pink-600/30 hover:text-pink-300 transition-all font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Đổi Mật Khẩu
                        </button>
                    </div>
                </form>
            </div>

            {/* Login History Section */}
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl">
                        <Globe className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Lịch Sử Đăng Nhập</h3>
                        <p className="text-sm text-gray-400">Các phiên đăng nhập gần đây</p>
                    </div>
                </div>

                {isLoadingHistory ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
                        <span className="ml-3 text-gray-400">Đang tải...</span>
                    </div>
                ) : loginHistory.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <Monitor className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p>Chưa có lịch sử đăng nhập</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {loginHistory.slice(0, 10).map((record, idx) => (
                            <div
                                key={record.id || idx}
                                className={`relative p-4 rounded-2xl border transition-all ${record.is_online
                                    ? 'bg-emerald-500/5 border-emerald-500/20'
                                    : 'bg-white/[0.02] border-white/5'
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    {/* Device Icon */}
                                    <div className={`p-2 rounded-xl ${record.is_online
                                        ? 'bg-emerald-500/10 text-emerald-400'
                                        : 'bg-white/5 text-gray-500'
                                        }`}>
                                        {getDeviceIcon(record.device_info)}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        {/* Device Info */}
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm font-medium text-white truncate">
                                                {record.device_info || 'Thiết bị không xác định'}
                                            </span>
                                            {record.is_online && (
                                                <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-emerald-500/20 text-emerald-400 rounded-full">
                                                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                                                    Online
                                                </span>
                                            )}
                                        </div>

                                        {/* Details */}
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                                            {record.location && (
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" />
                                                    {record.location}
                                                </span>
                                            )}
                                            {record.ip_address && (
                                                <span className="flex items-center gap-1">
                                                    <Wifi className="w-3 h-3" />
                                                    {record.ip_address}
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {formatLoginTime(record.login_time)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>



            {/* Debug / Notification Section */}
            <div className="bg-black/40 backdrop-blur-xl border border-amber-500/20 rounded-3xl p-6 md:p-8 shadow-xl">
                <div className="flex items-center gap-3 mb-5">
                    <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl">
                        <Bell className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Thông Báo Push</h3>
                        <p className="text-sm text-gray-400">Nhận nhắc nhở uống nước, tập luyện, supplement</p>
                    </div>
                </div>

                {/* Support status */}
                {pushSupport && !pushSupport.supported && (
                    <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-center gap-2">
                        <BellOff className="w-4 h-4 flex-shrink-0" />
                        <span>Trình duyệt này không hỗ trợ push: {pushSupport.reason}</span>
                    </div>
                )}

                {/* Permission status */}
                {pushSupport?.supported && pushSupport.permission === 'denied' && (
                    <div className="mb-4 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-300 text-sm">
                        Thông báo đã bị chặn. Vào Settings → Site Settings → Notifications để bật lại.
                    </div>
                )}

                <div className="space-y-3">
                    {/* Subscribe / Unsubscribe */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                            {isPushOn === null ? (
                                <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                            ) : isPushOn ? (
                                <><Bell className="w-4 h-4 text-emerald-400" /><span className="text-emerald-400">Push đang bật</span></>
                            ) : (
                                <><BellOff className="w-4 h-4 text-gray-500" /><span className="text-gray-500">Push chưa bật</span></>
                            )}
                        </div>
                        {isPushOn ? (
                            <button
                                onClick={handleUnsubscribePush}
                                disabled={isSubscribingPush}
                                className="px-4 py-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                            >
                                {isSubscribingPush ? <Loader2 className="w-3 h-3 animate-spin" /> : <BellOff className="w-3 h-3" />}
                                Tắt Push
                            </button>
                        ) : (
                            <button
                                onClick={handleSubscribePush}
                                disabled={isSubscribingPush || pushSupport?.permission === 'denied' || !pushSupport?.supported}
                                className="px-4 py-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                            >
                                {isSubscribingPush ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bell className="w-3 h-3" />}
                                Bật Push
                            </button>
                        )}
                    </div>

                    {/* Test notification */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                        <span className="text-sm text-gray-400">Kiểm tra thông báo ngay</span>
                        <button
                            onClick={handleTestNotification}
                            disabled={isTestingPush}
                            className="px-5 py-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 hover:text-amber-300 transition-all font-medium flex items-center gap-2 disabled:opacity-50"
                        >
                            {isTestingPush ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
                            Test Thông Báo
                        </button>
                    </div>
                </div>
            </div>

            {/* Logout Section */}
            <div className="bg-red-500/10 backdrop-blur-xl border border-red-500/20 rounded-3xl p-6 md:p-8 shadow-xl flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-red-400 mb-1">Đăng xuất</h3>
                    <p className="text-sm text-red-300/70">Đăng xuất khỏi thiết bị này.</p>
                </div>
                <button
                    onClick={onLogout}
                    className="px-6 py-3 rounded-xl bg-red-500 text-white font-bold shadow-lg hover:bg-red-600 hover:shadow-red-500/30 transition-all flex items-center gap-2"
                >
                    <LogOut className="w-5 h-5" />
                    <span className="hidden md:inline">Đăng Xuất</span>
                </button>
            </div>

            <Toast
                message={msg || error || ''}
                isOpen={!!msg || !!error}
                onClose={() => { setMsg(null); setError(null); }}
                type={error ? 'error' : 'success'}
            />
        </div>
    );
};
