import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { User } from '@supabase/supabase-js';
import { User as UserIcon, Mail, Lock, LogOut, Loader2, Save, BadgeCheck, AlertCircle } from 'lucide-react';
import { Toast } from './ui/Toast';

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

    // Sync full name if it changes externally or initially
    useEffect(() => {
        if (user.user_metadata?.full_name) {
            setFullName(user.user_metadata.full_name);
        }
    }, [user]);

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
