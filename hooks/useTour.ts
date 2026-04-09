import { useState, useEffect, useCallback } from 'react';
import { TourStep } from '../components/OnboardingTour';
import { UserInput, DailyPlan } from '../types';

export interface UseTourReturn {
  isTourOpen: boolean;
  tourSteps: TourStep[];
  handleTourComplete: () => void;
}

/**
 * Hook for onboarding tour management.
 */
export function useTour(
  userData: UserInput,
  setUserData: React.Dispatch<React.SetStateAction<UserInput>>,
  loading: boolean,
  setViewMode: (mode: 'workout' | 'nutrition' | 'history' | 'settings') => void,
  setPlan: React.Dispatch<React.SetStateAction<DailyPlan | null>>,
  handleStartTracking: () => void,
  showToast: (msg: string) => void
): UseTourReturn {
  const [isTourOpen, setIsTourOpen] = useState(false);

  const tourSteps: TourStep[] = [
    {
      targetId: 'tour-streak',
      title: 'Chuỗi Streak 🔥',
      content: 'Theo dõi chuỗi ngày tập luyện liên tục của bạn tại đây. Đừng để dứt chuỗi nhé!',
      placement: 'bottom',
      onBeforeShow: () => setViewMode('workout')
    },
    {
      targetId: 'tour-body-stats',
      title: 'Chỉ Số Cơ Thể 📏',
      content: 'Cập nhật cân nặng và chiều cao thường xuyên để AI tính toán chính xác nhất.',
      placement: 'bottom',
      onBeforeShow: () => setViewMode('workout')
    },
    {
      targetId: 'tour-training-mode',
      title: 'Chế Độ Tập 🏋️',
      content: 'Chọn nơi bạn tập luyện: Gym, Ở nhà (Home) hoặc Calisthenics.',
      placement: 'top',
      onBeforeShow: () => {
        setViewMode('workout');
        setPlan(null);
      }
    },
    {
      targetId: 'tour-input-intensity',
      title: 'Cường Độ 🔥',
      content: 'Chọn cường độ mong muốn: Vừa sức (Normal) hoặc Thử thách (Hard).',
      placement: 'top'
    },
    {
      targetId: 'tour-input-fatigue',
      title: 'Mức Độ Mệt Mỏi 🔋',
      content: 'Bạn đang cảm thấy thế nào? Hãy khai báo thật để AI điều chỉnh volume bài tập.',
      placement: 'bottom'
    },
    {
      targetId: 'tour-input-muscle',
      title: 'Nhóm Cơ Đau 🩹',
      content: 'Nếu đang đau cơ nào, hãy chọn ở đây để AI tránh hoặc giảm tải nhóm cơ đó.',
      placement: 'top'
    },
    {
      targetId: 'tour-generate-btn',
      title: 'Tạo Lịch Tập ⚡',
      content: 'Sau khi điền thông tin, bấm nút này để nhận lịch tập cá nhân hóa ngay lập tức.',
      placement: 'top'
    },
    {
      targetId: 'tour-tabs',
      title: 'Điều Hướng 🧭',
      content: 'Chuyển sang "Dinh Dưỡng" để xem thực đơn hôm nay nào!',
      placement: 'bottom'
    },
    {
      targetId: 'tour-nutri-goals',
      title: 'Mục Tiêu Dinh Dưỡng 🎯',
      content: 'Chọn chế độ (Bulking/Cutting) để AI tối ưu hóa kế hoạch dinh dưỡng phù hợp với bạn.',
      placement: 'bottom',
      onBeforeShow: () => {
        setViewMode('nutrition');
        setPlan(null);
      }
    },
    {
      targetId: 'tour-nutri-diary',
      title: 'Nhật Ký Ăn Uống 📝',
      content: 'Ghi lại những món bạn đã ăn trong ngày để theo dõi chính xác hơn.',
      placement: 'top'
    },
    {
      targetId: 'tour-nutrition-ai-btn',
      title: 'Tạo Kế Hoạch AI ✨',
      content: 'Bấm nút này để AI thiết kế thực đơn chi tiết cho cả ngày của bạn.',
      placement: 'top'
    },
    {
      targetId: 'tour-check-calo',
      title: 'Check Calo 📸',
      content: 'Chụp ảnh món ăn để AI tự động tính Calorie cho bạn. Rất tiện lợi!',
      placement: 'bottom',
      onBeforeShow: () => setViewMode('nutrition')
    },
    {
      targetId: 'tour-nutri-camera',
      title: 'Chụp Ảnh Món Ăn 📷',
      content: 'Bấm vào đây để mở camera và quét nhanh món ăn của bạn.',
      placement: 'bottom',
      onBeforeShow: () => handleStartTracking()
    },
    {
      targetId: 'tour-nutri-manual',
      title: 'Nhập Tay ⌨️',
      content: 'Hoặc gõ tên món ăn nếu bạn không tiện chụp ảnh (VD: "1 bát phở bò").',
      placement: 'bottom'
    },
    {
      targetId: 'tour-nutri-macros',
      title: 'Theo Dõi Macro 📊',
      content: 'Xem biểu đồ tròn thể hiện lượng Calo, Đạm, Béo, Tinh bột đã nạp trong ngày.',
      placement: 'top'
    },
    {
      targetId: 'tour-nutri-meals',
      title: 'Danh Sách Món Ăn 🥗',
      content: 'Nhấn vào từng món để đánh dấu đã ăn hoặc xem chi tiết dinh dưỡng.',
      placement: 'top'
    },
    {
      targetId: 'tour-nutri-reset',
      title: 'Tạo Lại Kế Hoạch 🔄',
      content: 'Nếu muốn thay đổi hoặc reset ngày mới, hãy bấm vào đây.',
      placement: 'top'
    },
    {
      targetId: 'tour-history-calendar',
      title: 'Lịch Sử Tập Luyện 📅',
      content: 'Theo dõi lại quá trình và thành quả tập luyện của bạn tại đây.',
      placement: 'top',
      onBeforeShow: () => setViewMode('history')
    },
    {
      targetId: 'tour-settings',
      title: 'Cài Đặt ⚙️',
      content: 'Chỉnh sửa thông tin cá nhân và thiết bị tập luyện của bạn.',
      placement: 'bottom',
      onBeforeShow: () => setViewMode('workout')
    },
  ];

  // Auto-start tour if new user
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (!loading && userData.hasSeenOnboarding === false) {
      timeoutId = setTimeout(() => {
        if (userData.hasSeenOnboarding === false) {
          setIsTourOpen(true);
        }
      }, 1000);
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [loading, userData.hasSeenOnboarding]);

  const handleTourComplete = useCallback(() => {
    setIsTourOpen(false);
    const newUserData = { ...userData, hasSeenOnboarding: true };
    setUserData(newUserData);
    localStorage.setItem('user_settings', JSON.stringify(newUserData));
    showToast("Chào mừng bạn đến với Grow Up! Chúc bạn tập luyện hiệu quả.");
  }, [userData, setUserData, showToast]);

  return { isTourOpen, tourSteps, handleTourComplete };
}
