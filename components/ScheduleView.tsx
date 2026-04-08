import React from 'react';
import { Clock, Sun, Moon, Coffee, Dumbbell, Utensils, Book, Pill, Sparkles, Droplets, UserCheck, Heart, CheckSquare, Circle } from 'lucide-react';

interface ScheduleViewProps {
    scheduleState?: Record<string, boolean>;
    onToggleSchedule?: (id: string) => void;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({ scheduleState = {}, onToggleSchedule }) => {

    const morningSchedule = [
        { time: '04:00', icon: Sun, label: 'Thức dậy' },
        { time: '04:15', icon: Droplets, label: 'Vệ sinh cá nhân' },
        { time: '04:30', icon: Coffee, label: 'Chuẩn bị ăn sáng', detail: 'Uống Caffeine (lần 1) để duy trì sự tỉnh táo' },
        { time: '05:00 - 05:40', icon: Utensils, label: 'Ăn sáng' },
        { time: '06:30', icon: Dumbbell, label: 'Đến phòng tập', detail: 'Nếu mưa thì tập ở nhà' },
        { time: '07:00 - 09:00', icon: Dumbbell, label: 'Tập luyện chính' },
        { time: '09:00', icon: Coffee, label: 'Về nhà', detail: 'Uống Caffeine (lần 2)' },
        { time: '09:15', icon: Utensils, label: 'Mua đồ ăn trưa' },
        { time: '09:30', icon: Utensils, label: 'Chuẩn bị đồ ăn' },
        { time: '10:00', icon: Utensils, label: 'Nấu ăn' },
        { time: '10:30', icon: Utensils, label: 'Ăn trưa' },
        { time: '11:00', icon: Pill, label: 'Rửa bát, nghỉ ngơi', detail: 'Uống Omega 3 (lần 1) sau khi ăn' },
        { time: '11:30', icon: Book, label: 'Đến trường' },
    ];

    const afternoonSchedule = [
        { time: '14:30', icon: Pill, label: 'Về nhà rèn luyện', detail: 'Uống Magnesium (lần 1) trước khi ngủ trưa' },
        { time: '14:30 - 15:30', icon: Moon, label: 'Ngủ trưa' },
        { time: '15:30', icon: Utensils, label: 'Chuẩn bị bữa tối' },
        { time: '16:00', icon: Droplets, label: 'Bật nóng lạnh, cắm cơm' },
        { time: '16:15', icon: Utensils, label: 'Nấu ăn' },
        { time: '16:40', icon: Utensils, label: 'Ăn cơm' },
        { time: '17:30', icon: Droplets, label: 'Tắm rửa' },
        { time: '18:00', icon: Pill, label: 'Giặt quần áo', detail: 'Uống Omega 3 (lần 2) sau khi ăn' },
        { time: '18:15', icon: Book, label: 'Ôn bài' },
        { time: '19:00', icon: Dumbbell, label: 'Tập Isolation (Nhẹ)', detail: 'Tập thêm Plank hay Abs với tạ đơn nhẹ tại nhà' },
        { time: '20:00', icon: Pill, label: 'Giải trí & Thực phẩm bổ sung', detail: 'Uống 5g Creatine, Uống Magnesium (lần 2)' },
        { time: '21:00', icon: Sun, label: 'Screen-off', detail: 'Tắt toàn bộ máy tính và điện thoại' },
        { time: '21:30 - 22:30', icon: Moon, label: 'Đi ngủ' },
    ];

    const looksmaxxingTips = [
        { icon: Sparkles, color: 'text-purple-400', title: 'Skincare Routine', desc: 'Rửa mặt 2 lần/ngày (sáng/tối) bằng sữa rửa mặt dịu nhẹ. Luôn dùng kem chống nắng vào ban ngày và kem dưỡng ẩm vào ban đêm.' },
        { icon: Droplets, color: 'text-cyan-400', title: 'Hydration', desc: 'Uống đủ 2.5 - 3 lít nước mỗi ngày để da dẻ hồng hào, mắt sáng và cơ bắp căng mọng. Mang theo bình nước đi học/tập.' },
        { icon: UserCheck, color: 'text-emerald-400', title: 'Posture & Mewing', desc: 'Giữ lưng thẳng, vai mở khi đi đứng. Để lưỡi đặt trọn lên vòm họng trên, khép miệng và thở bằng mũi (Mewing) để cải thiện đường nét khuôn hàm.' },
        { icon: Heart, color: 'text-rose-400', title: 'Grooming', desc: 'Cắt tóc gọn gàng 3-4 tuần/lần. Cạo hoặc tỉa râu sạch sẽ, chăm sóc lông mày, và giữ móng tay/chân gọn gàng.' }
    ];

    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in p-4 pb-20">
            {/* Header */}
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold tracking-tight text-white mb-2 font-display">
                    Lịch trình Cá nhân
                </h2>
                <p className="text-gray-400 text-sm">
                    Kỷ luật là cầu nối giữa mục tiêu và thành tựu
                </p>
            </div>

            {/* Sáng */}
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-10 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]">
                    <Sun className="w-24 h-24 text-yellow-400" />
                </div>
                <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-400 mb-6 flex items-center gap-2">
                    Buổi Sáng - Trưa
                </h3>

                <div className="space-y-4 relative z-10 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
                    {morningSchedule.map((item, index) => {
                        const id = `smor-${index}`;
                        const isChecked = scheduleState[id] || false;
                        return (
                            <div key={index} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group/item">
                                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-black/60 border-2 border-yellow-500/30 text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.2)] z-10 md:mx-auto group-hover/item:border-yellow-400 group-hover/item:scale-110 transition-all duration-300">
                                    <item.icon className="w-4 h-4" />
                                </div>
                                <div
                                    className={`w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] bg-white/5 border border-white/5 rounded-2xl p-4 hover:bg-white/10 hover:border-white/20 transition-all duration-300 cursor-pointer select-none ${isChecked ? 'opacity-50' : ''}`}
                                    onClick={() => onToggleSchedule && onToggleSchedule(id)}
                                >
                                    <div className="flex items-start justify-between gap-3 mb-1">
                                        <div className="flex items-baseline gap-3">
                                            <span className="text-yellow-400 font-mono font-bold">{item.time}</span>
                                            <span className={`text-white font-semibold ${isChecked ? 'line-through decoration-emerald-500/50' : ''}`}>{item.label}</span>
                                        </div>
                                        <div className={`mt-0.5 transition-colors ${isChecked ? 'text-emerald-400' : 'text-gray-600 group-hover/item:text-cyan-400'}`}>
                                            {isChecked ? <CheckSquare className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                                        </div>
                                    </div>
                                    {item.detail && (
                                        <div className="text-sm text-gray-400 mt-1.5 flex items-start gap-1.5">
                                            <div className="w-1 h-1 rounded-full bg-cyan-400 mt-2 shrink-0" />
                                            <span>{item.detail}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Chiều/Tối */}
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden group mt-6">
                <div className="absolute top-0 right-0 p-6 opacity-10 drop-shadow-[0_0_15px_rgba(167,139,250,0.5)]">
                    <Moon className="w-24 h-24 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-indigo-400 mb-6 flex items-center gap-2">
                    Buổi Chiều - Tối
                </h3>

                <div className="space-y-4 relative z-10 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
                    {afternoonSchedule.map((item, index) => {
                        const id = `saft-${index}`;
                        const isChecked = scheduleState[id] || false;
                        return (
                            <div key={index} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group/item">
                                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-black/60 border-2 border-purple-500/30 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)] z-10 md:mx-auto group-hover/item:border-purple-400 group-hover/item:scale-110 transition-all duration-300">
                                    <item.icon className="w-4 h-4" />
                                </div>
                                <div
                                    className={`w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] bg-white/5 border border-white/5 rounded-2xl p-4 hover:bg-white/10 hover:border-white/20 transition-all duration-300 cursor-pointer select-none ${isChecked ? 'opacity-50' : ''}`}
                                    onClick={() => onToggleSchedule && onToggleSchedule(id)}
                                >
                                    <div className="flex items-start justify-between gap-3 mb-1">
                                        <div className="flex items-baseline gap-3">
                                            <span className="text-purple-400 font-mono font-bold">{item.time}</span>
                                            <span className={`text-white font-semibold ${isChecked ? 'line-through decoration-emerald-500/50' : ''}`}>{item.label}</span>
                                        </div>
                                        <div className={`mt-0.5 transition-colors ${isChecked ? 'text-emerald-400' : 'text-gray-600 group-hover/item:text-cyan-400'}`}>
                                            {isChecked ? <CheckSquare className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                                        </div>
                                    </div>
                                    {item.detail && (
                                        <div className="text-sm text-gray-400 mt-1.5 flex items-start gap-1.5">
                                            <div className="w-1 h-1 rounded-full bg-cyan-400 mt-2 shrink-0" />
                                            <span>{item.detail}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Looksmaxxing Guide */}
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl relative mt-10">
                <div className="flex items-center justify-center mb-8 relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-white/10"></div>
                    </div>
                    <div className="relative bg-black px-6 flex items-center gap-3 border border-white/10 rounded-full py-2 shadow-xl">
                        <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
                        <h3 className="text-lg font-bold text-white tracking-widest uppercase text-center">
                            Looksmaxxing
                        </h3>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {looksmaxxingTips.map((tip, idx) => (
                        <div key={idx} className="bg-white/5 border border-white/5 rounded-2xl p-5 hover:bg-white/10 transition-all duration-300">
                            <div className="flex items-center gap-3 mb-3">
                                <div className={`p-2 rounded-xl bg-black/50 ${tip.color} shadow-lg`}>
                                    <tip.icon className="w-5 h-5" />
                                </div>
                                <h4 className="text-white font-bold">{tip.title}</h4>
                            </div>
                            <p className="text-sm text-gray-400 leading-relaxed">
                                {tip.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
};
