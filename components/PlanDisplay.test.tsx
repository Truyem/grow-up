import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlanDisplay } from './PlanDisplay';
import { DailyPlan } from '../types';

const mockPlan: DailyPlan = {
  date: '2024-01-01',
  workout: {
    summary: 'Test workout',
    detail: {
      levelName: 'Beginner',
      description: 'Test description',
      exercises: [
        {
          name: 'Push Up',
          sets: 3,
          reps: '10',
          equipment: 'None',
          notes: 'Test note',
        },
      ],
    },
  },
  nutrition: {
    totalCalories: 2000,
    totalProtein: 150,
    totalCost: 70000,
    meals: [],
  },
};

describe('PlanDisplay - Device Detection (Task 6.1)', () => {
  let windowOpenSpy: any;

  beforeEach(() => {
    windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  it('should trigger popup on mobile user agent', () => {
    // Mock mobile user agent
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
      configurable: true,
    });

    const { container } = render(
      <PlanDisplay plan={mockPlan} onReset={() => {}} onComplete={() => {}} />
    );

    // Click exercise name to trigger YouTube
    const exerciseButton = screen.getByText('Push Up');
    fireEvent.click(exerciseButton);

    // Verify popup is rendered (YouTubePopup component should be in DOM)
    const popup = container.querySelector('[class*="fixed inset-0"]');
    expect(popup).toBeTruthy();

    // Verify window.open was NOT called
    expect(windowOpenSpy).not.toHaveBeenCalled();
  });

  it('should trigger new tab on desktop user agent', () => {
    // Mock desktop user agent
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      configurable: true,
    });

    render(
      <PlanDisplay plan={mockPlan} onReset={() => {}} onComplete={() => {}} />
    );

    // Click exercise name
    const exerciseButton = screen.getByText('Push Up');
    fireEvent.click(exerciseButton);

    // Verify window.open was called with YouTube URL
    expect(windowOpenSpy).toHaveBeenCalledWith(
      expect.stringContaining('youtube.com/results?search_query='),
      '_blank'
    );
  });
});
