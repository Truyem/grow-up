import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { Lock, BadgeCheck, Loader2, AlertCircle, Save } from 'lucide-react';
import { Toast } from './ui/Toast';

export const PasswordResetModal: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError('Mật khẩu nhập lại không khớp');
            return;
        }
        if (password.length < 6) {
            setError('Mật khẩu phải có ít nhất 6 ký tự');
            return;
        }

        setIsLoading(true);
        setError(null);
        setMsg(null);

        try {
            const { error } = await supabase.auth.updateUser({ password: password });
            if (error) throw error;
            setMsg('Đã đổi mật khẩu thành công! Bạn có thể đăng nhập ngay bây giờ.');
            setTimeout(() => {
                if (onClose) onClose();
            }, 2000);
        } catch (err: any) {
            setError(err.message || 'Lỗi đổi mật khẩu');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-gray-900 border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl max-w-md w-full relative">
                <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center p-3 bg-pink-500/20 rounded-full mb-4">
                        <Lock className="w-8 h-8 text-pink-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">Đặt Lại Mật Khẩu</h2>
                    <p className="text-gray-400 mt-2">Nhập mật khẩu mới của bạn để hoàn tất khôi phục tài khoản.</p>
                </div>

                <form onSubmit={handleUpdatePassword} className="space-y-5">
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
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-400 ml-1">Nhập lại mật khẩu</label>
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
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 rounded-xl bg-pink-600 text-white font-bold shadow-lg hover:bg-pink-500 hover:shadow-pink-500/30 transition-all flex items-center justify-center gap-2"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        Lưu Mật Khẩu Mới
                    </button>
                </form>
            </div>

            <Toast
                message={msg || error || ''}
                isOpen={!!msg || !!error}
                onClose={() => { setMsg(null); setError(null); }}
                type={error ? 'error' : 'success'}
            />
        </div>
    );
}
