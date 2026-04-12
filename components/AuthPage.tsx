import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { Mail, Lock, User, Loader2, Sparkles, AlertCircle, ArrowRight, KeyRound, BadgeCheck } from 'lucide-react';
import wallpaper from '../wallpaper.webp';
import wallpaperMb from '../wallpaper-mb.webp';
import { Toast } from './ui/Toast';

export const AuthPage: React.FC = () => {
    // Auth Modes
    const [isLogin, setIsLogin] = useState(true);
    const [isForgotPassword, setIsForgotPassword] = useState(false);

    // OTP Modes
    const [authStep, setAuthStep] = useState<'auth' | 'otp'>('auth');
    const [otpType, setOtpType] = useState<'signup' | 'recovery' | null>(null);
    const [otp, setOtp] = useState('');

    // Recovery Password Reset
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');

    const [error, setError] = useState<string | null>(null);
    const [msg, setMsg] = useState<string | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setMsg(null);

        try {
            if (isForgotPassword) {
                // Forgot Password -> Send OTP
                const { error } = await supabase.auth.resetPasswordForEmail(email);
                if (error) throw error;
                setMsg("Đã gửi mã xác nhận vào email của bạn!");
                setAuthStep('otp');
                setOtpType('recovery');
            } else if (isLogin) {
                // Login
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            } else {
                // Sign Up -> Send OTP
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { full_name: fullName },
                    },
                });
                if (error) throw error;
                setMsg("Đã gửi mã xác nhận! Vui lòng kiểm tra email.");
                setAuthStep('otp');
                setOtpType('signup');
            }
        } catch (err: any) {
            setError(err.message === 'Invalid login credentials'
                ? 'Email hoặc mật khẩu không chính xác'
                : err.message || 'Đã có lỗi xảy ra');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setMsg(null);

        try {
            if (otpType === 'signup') {
                const { error } = await supabase.auth.verifyOtp({
                    email,
                    token: otp,
                    type: 'signup'
                });
                if (error) throw error;
                // Success: User is logged in automatically by verifyOtp
                setMsg("Xác thực tài khoản thành công!");
            } else if (otpType === 'recovery') {
                if (newPassword !== confirmNewPassword) {
                    throw new Error("Mật khẩu mới không khớp");
                }
                if (newPassword.length < 6) {
                    throw new Error("Mật khẩu phải có ít nhất 6 ký tự");
                }

                // Verify OTP & Login
                const { error: verifyError } = await supabase.auth.verifyOtp({
                    email,
                    token: otp,
                    type: 'recovery'
                });
                if (verifyError) throw verifyError;

                // Reset Password
                const { error: updateError } = await supabase.auth.updateUser({
                    password: newPassword
                });
                if (updateError) throw updateError;

                setMsg("Đổi mật khẩu thành công! Đang đăng nhập...");
                // Note: Session is set, App.tsx will handle redirect/unmount
            }
        } catch (err: any) {
            setError(err.message || "Mã xác thực không đúng hoặc đã hết hạn");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="relative min-h-screen flex items-center justify-center font-sans overflow-hidden">
            {/* Background Layer */}
            <div className="fixed inset-0 z-0">
                <div className="absolute inset-0 bg-cover bg-center block md:hidden" style={{ backgroundImage: `url(${wallpaperMb})` }} />
                <div className="absolute inset-0 bg-cover bg-center hidden md:block" style={{ backgroundImage: `url(${wallpaper})` }} />
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent" />
            </div>

            {/* Content */}
            <div className="relative z-10 w-full max-w-md px-6 animate-fade-in-up">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center p-3 bg-white/5 rounded-full mb-4 border border-white/10 shadow-lg backdrop-blur-md">
                        <Sparkles className="w-8 h-8 text-cyan-300 animate-pulse" />
                    </div>
                    <h1 className="text-4xl font-bold text-white tracking-tight drop-shadow-lg mb-2">
                        Grow <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Up</span>
                    </h1>
                    <p className="text-gray-400">Tham gia để thay đổi bản thân ngay hôm nay.</p>
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">

                    {authStep === 'otp' ? (
                        // OTP Verification Form
                        <form onSubmit={handleVerifyOtp} className="space-y-5">
                            <div className="text-center mb-4">
                                <h3 className="text-xl font-bold text-white">Xác Thực OTP</h3>
                                <p className="text-sm text-gray-400 mt-1">
                                    Nhập mã xác nhận đã gửi tới <span className="text-cyan-400">{email}</span>
                                </p>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Mã xác nhận</label>
                                <div className="relative group">
                                    <KeyRound className="absolute left-4 top-3.5 w-5 h-5 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="123456"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/50 focus:bg-black/30 transition-all font-mono tracking-widest text-center text-lg"
                                        required
                                        maxLength={10}
                                    />
                                </div>
                            </div>

                            {otpType === 'recovery' && (
                                <>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Mật khẩu mới</label>
                                        <div className="relative group">
                                            <Lock className="absolute left-4 top-3.5 w-5 h-5 text-gray-500 group-focus-within:text-pink-400 transition-colors" />
                                            <input
                                                type="password"
                                                placeholder="••••••••"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-pink-500/50 focus:bg-black/30 transition-all"
                                                required
                                                minLength={6}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Nhập lại mật khẩu</label>
                                        <div className="relative group">
                                            <div className={`absolute left-4 top-3.5 w-5 h-5 transition-colors ${confirmNewPassword && newPassword === confirmNewPassword ? 'text-emerald-500' : 'text-gray-500'}`}>
                                                <BadgeCheck className="w-full h-full" />
                                            </div>
                                            <input
                                                type="password"
                                                placeholder="••••••••"
                                                value={confirmNewPassword}
                                                onChange={(e) => setConfirmNewPassword(e.target.value)}
                                                className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-pink-500/50 focus:bg-black/30 transition-all"
                                                required
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            {error && (
                                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-lg shadow-lg hover:shadow-cyan-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                ) : (
                                    otpType === 'recovery' ? 'Đổi Mật Khẩu' : 'Xác Minh & Tham Gia'
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => { setAuthStep('auth'); setError(null); setMsg(null); }}
                                className="w-full py-2 text-gray-400 hover:text-white text-sm transition-colors"
                            >
                                Quay lại
                            </button>
                        </form>

                    ) : (
                        // Standard Login/Signup/Forgot Forms
                        <>
                            {/* Tabs */}
                            <div className="flex p-1 mb-8 bg-black/20 rounded-xl relative">
                                <div
                                    className={`absolute inset-y-1 w-[calc(50%-4px)] bg-white/10 rounded-lg shadow-lg transition-all duration-300 ease-out`}
                                    style={{ left: isLogin ? '4px' : 'calc(50%)' }}
                                />
                                <button
                                    onClick={() => { setIsLogin(true); setIsForgotPassword(false); }}
                                    className={`flex-1 relative z-10 py-2.5 text-sm font-medium transition-colors duration-200 ${isLogin ? 'text-white' : 'text-gray-400 hover:text-white'}`}
                                >
                                    Đăng nhập
                                </button>
                                <button
                                    onClick={() => { setIsLogin(false); setIsForgotPassword(false); }}
                                    className={`flex-1 relative z-10 py-2.5 text-sm font-medium transition-colors duration-200 ${!isLogin ? 'text-white' : 'text-gray-400 hover:text-white'}`}
                                >
                                    Đăng ký
                                </button>
                            </div>

                            {isForgotPassword ? (
                                <form onSubmit={handleAuth} className="space-y-5">
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Email khôi phục</label>
                                        <div className="relative group">
                                            <Mail className="absolute left-4 top-3.5 w-5 h-5 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
                                            <input
                                                type="email"
                                                placeholder="nhap@email.cua.ban"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/50 focus:bg-black/30 transition-all"
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

                                    {msg && (
                                        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm flex items-start gap-2">
                                            <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                            <span>{msg}</span>
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 text-white font-bold text-lg shadow-lg hover:shadow-purple-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isLoading ? (
                                            <Loader2 className="w-6 h-6 animate-spin" />
                                        ) : (
                                            <>
                                                Gửi Mã OTP
                                                <ArrowRight className="w-5 h-5" />
                                            </>
                                        )}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => { setIsForgotPassword(false); setError(null); setMsg(null); }}
                                        className="w-full py-2 text-gray-400 hover:text-white text-sm transition-colors"
                                    >
                                        Quay lại đăng nhập
                                    </button>
                                </form>
                            ) : (
                                <form onSubmit={handleAuth} className="space-y-5">
                                    {!isLogin && (
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Tên hiển thị</label>
                                            <div className="relative group">
                                                <User className="absolute left-4 top-3.5 w-5 h-5 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
                                                <input
                                                    type="text"
                                                    placeholder="Ví dụ: David Goggins"
                                                    value={fullName}
                                                    onChange={(e) => setFullName(e.target.value)}
                                                    className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/50 focus:bg-black/30 transition-all"
                                                    required={!isLogin}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Email</label>
                                        <div className="relative group">
                                            <Mail className="absolute left-4 top-3.5 w-5 h-5 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
                                            <input
                                                type="email"
                                                placeholder="name@example.com"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/50 focus:bg-black/30 transition-all"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex justify-between items-center ml-1">
                                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Mật khẩu</label>
                                        </div>
                                        <div className="relative group">
                                            <Lock className="absolute left-4 top-3.5 w-5 h-5 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
                                            <input
                                                type="password"
                                                placeholder="••••••••"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/50 focus:bg-black/30 transition-all"
                                                required
                                                minLength={6}
                                            />
                                        </div>
                                        {isLogin && (
                                            <div className="flex justify-end mt-1">
                                                <button
                                                    type="button"
                                                    onClick={() => { setIsForgotPassword(true); setError(null); setMsg(null); }}
                                                    className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                                                >
                                                    Quên mật khẩu?
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {error && (
                                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-start gap-2">
                                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                            <span>{error}</span>
                                        </div>
                                    )}

                                    {msg && (
                                        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm flex items-start gap-2">
                                            <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                            <span>{msg}</span>
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-lg shadow-lg hover:shadow-cyan-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                                    >
                                        {isLoading ? (
                                            <Loader2 className="w-6 h-6 animate-spin" />
                                        ) : (
                                            <>
                                                {isLogin ? 'Đăng Nhập' : 'Tạo Tài Khoản'}
                                                <ArrowRight className="w-5 h-5" />
                                            </>
                                        )}
                                    </button>
                                </form>
                            )}
                        </>
                    )}
                </div>

                <p className="text-center text-gray-500 text-sm mt-8">
                    &copy; 2025 Grow Up. Stay Hard.
                </p>
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
