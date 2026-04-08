import React, { useState } from 'react';
import {
    BookOpen,
    Dumbbell,
    Utensils,
    History,
    Settings,
    ChevronLeft,
    CheckCircle,
    RefreshCw,
    Save,
    Camera,
    Plus,
    Trash2,
    Calendar,
    Sparkles,
    Zap,
    WifiOff
} from 'lucide-react';

interface UserGuideProps {
    onBackend: () => void;
}

export const UserGuide: React.FC<UserGuideProps> = ({ onBackend }) => {
    const [activeTab, setActiveTab] = useState<'general' | 'workout' | 'nutrition' | 'history'>('general');

    const renderIcon = (icon: any, color: string) => (
        <div className={`p-2 rounded-lg ${color} mr-4 shrink-0`}>
            {React.createElement(icon, { size: 24, className: "text-white" })}
        </div>
    );

    const guideItems = {
        general: [
            {
                icon: Sparkles,
                color: "bg-purple-500",
                title: "AI Power",
                desc: "Ứng dụng sử dụng AI (Gemini) để tạo lịch tập và thực đơn cá nhân hóa dựa trên chỉ số cơ thể của bạn."
            },
            {
                icon: Zap,
                color: "bg-yellow-500",
                title: "Chế độ Offline",
                desc: "Lịch tập và thực đơn được lưu vào máy. Bạn có thể xem lại ngay cả khi không có mạng."
            },
            {
                icon: RefreshCw,
                color: "bg-blue-500",
                title: "Đồng bộ dữ liệu",
                desc: "Dữ liệu lịch sử tập luyện sẽ được tự động đồng bộ lên máy chủ khi bạn có mạng."
            }
        ],
        workout: [
            {
                icon: Dumbbell,
                color: "bg-indigo-600",
                title: "Tạo Lịch Tập",
                desc: "Nhập tình trạng sức khỏe (đau cơ, mệt mỏi) và bấm 'Tạo lịch tập' để AI đề xuất bài tập phù hợp nhất cho hôm nay."
            },
            {
                icon: CheckCircle,
                color: "bg-green-500",
                title: "Check bài tập",
                desc: "Tích vào ô tròn bên cạnh bài tập khi bạn hoàn thành. Điều này giúp theo dõi tiến độ buổi tập."
            },
            {
                icon: Save,
                color: "bg-teal-600",
                title: "Lưu buổi tập",
                desc: "Sau khi tập xong, bấm nút 'Lưu' ở cuối trang để ghi lại lịch sử. Dữ liệu sẽ được lưu vào lịch và đồng bộ."
            }
        ],
        nutrition: [
            {
                icon: Utensils,
                color: "bg-orange-500",
                title: "Thực đơn hàng ngày",
                desc: "Chuyển sang tab Dinh dưỡng để xem gợi ý bữa ăn (Sáng, Trưa, Tối, Phụ) phù hợp với mục tiêu (xả/siết)."
            },
            {
                icon: RefreshCw, // Using Refresh as 'Generate' metaphor
                color: "bg-orange-600",
                title: "Tạo lại thực đơn",
                desc: "Nếu không thích món ăn gợi ý, bấm nút 'Tạo lại thực đơn' để AI đổi món khác."
            },
            {
                icon: Camera,
                color: "bg-pink-500",
                title: "Quét món ăn (Sắp có)",
                desc: "Tính năng dùng camera để nhận diện món ăn và tính calo (đang phát triển)."
            }
        ],
        history: [
            {
                icon: History,
                color: "bg-cyan-600",
                title: "Lịch sử tập luyện",
                desc: "Xem lại các ngày đã tập. Những ngày có dấu chấm xanh là ngày bạn đã hoàn thành bài tập."
            },
            {
                icon: Calendar,
                color: "bg-gray-600",
                title: "Lịch",
                desc: "Bấm vào một ngày trên lịch để xem chi tiết bài tập và ghi chú của ngày đó."
            }
        ]
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20 fade-in">
            {/* Header */}
            <div className="bg-white px-4 py-4 shadow-sm sticky top-0 z-10 flex items-center">
                <button
                    onClick={onBackend}
                    className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:scale-95 transition-transform"
                >
                    <ChevronLeft size={24} className="text-gray-700" />
                </button>
                <h1 className="text-xl font-bold text-gray-800 ml-2">Hướng dẫn sử dụng</h1>
            </div>

            {/* Tabs */}
            <div className="flex overflow-x-auto px-4 py-3 gap-2 no-scrollbar sticky top-[60px] bg-gray-50 z-10">
                {[
                    { id: 'general', label: 'Chung' },
                    { id: 'workout', label: 'Tập luyện' },
                    { id: 'nutrition', label: 'Dinh dưỡng' },
                    { id: 'history', label: 'Lịch sử' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.id
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-white text-gray-600 border border-gray-200'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="px-4 space-y-4 mt-2">
                {guideItems[activeTab].map((item, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-start animate-slide-up" style={{ animationDelay: `${idx * 50}ms` }}>
                        {renderIcon(item.icon, item.color)}
                        <div>
                            <h3 className="font-bold text-gray-800 mb-1">{item.title}</h3>
                            <p className="text-sm text-gray-600 leading-relaxed text-justify">
                                {item.desc}
                            </p>
                        </div>
                    </div>
                ))}

                <div className="mt-8 text-center pb-8 p-4">
                    <p className="text-gray-400 text-sm italic">
                        "Sức khỏe là khoản đầu tư tốt nhất bạn có thể thực hiện."
                    </p>
                </div>
            </div>
        </div>
    );
};
