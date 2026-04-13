import { useState, useCallback } from 'react';
import { TourStep } from '../components/OnboardingTour';

export interface UseTourReturn {
  isTourOpen: boolean;
  tourSteps: TourStep[];
  currentStep: number;
  startTour: () => void;
  endTour: () => void;
  handleTourComplete: () => void;
  handleTourSkip: () => void;
  nextStep: () => void;
  prevStep: () => void;
}

export const useTour = (): UseTourReturn => {
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Define tour steps
  const tourSteps: TourStep[] = [
    {
      targetId: 'daily-plan-tab',
      title: 'Kế hoạch Hàng ngày',
      content: 'Xem kế hoạch tập luyện và dinh dưỡng hàng ngày của bạn tại đây.',
      placement: 'bottom',
    },
    {
      targetId: 'workout-section',
      title: 'Bài tập',
      content: 'Hoàn thành các bài tập được đề xuất và ghi lại tiến độ của bạn.',
      placement: 'right',
    },
    {
      targetId: 'nutrition-tab',
      title: 'Dinh dưỡng',
      content: 'Theo dõi thực đơn và lượng calorie hàng ngày để đạt mục tiêu của bạn.',
      placement: 'bottom',
    },
    {
      targetId: 'history-tab',
      title: 'Lịch sử',
      content: 'Xem toàn bộ lịch sử tập luyện và tiến độ của bạn.',
      placement: 'bottom',
    },
    {
      targetId: 'profile-btn',
      title: 'Cài đặt',
      content: 'Quản lý thông tin cá nhân và mục tiêu tập luyện của bạn.',
      placement: 'left',
    },
  ];

  const startTour = useCallback(() => {
    setIsTourOpen(true);
    setCurrentStep(0);
  }, []);

  const endTour = useCallback(() => {
    setIsTourOpen(false);
    setCurrentStep(0);
  }, []);

  const handleTourComplete = useCallback(() => {
    endTour();
  }, [endTour]);

  const handleTourSkip = useCallback(() => {
    endTour();
  }, [endTour]);

  const nextStep = useCallback(() => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleTourComplete();
    }
  }, [currentStep, tourSteps.length, handleTourComplete]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  return {
    isTourOpen,
    tourSteps,
    currentStep,
    startTour,
    endTour,
    handleTourComplete,
    handleTourSkip,
    nextStep,
    prevStep,
  };
};
