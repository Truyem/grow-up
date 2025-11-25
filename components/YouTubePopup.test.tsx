import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { YouTubePopup } from './YouTubePopup';

describe('YouTubePopup - Popup Interactions (Task 6.2)', () => {
  it('should close popup when close button is clicked', () => {
    const onCloseMock = vi.fn();

    render(
      <YouTubePopup
        isOpen={true}
        onClose={onCloseMock}
        searchQuery="test+exercise"
      />
    );

    // Find and click close button
    const closeButton = screen.getByTitle('Đóng');
    fireEvent.click(closeButton);

    // Verify onClose was called
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('should close popup when backdrop is clicked', () => {
    const onCloseMock = vi.fn();

    const { container } = render(
      <YouTubePopup
        isOpen={true}
        onClose={onCloseMock}
        searchQuery="test+exercise"
      />
    );

    // Find backdrop (the outermost div with fixed positioning)
    const backdrop = container.querySelector('[class*="fixed inset-0"]');
    expect(backdrop).toBeTruthy();

    // Click backdrop
    fireEvent.click(backdrop!);

    // Verify onClose was called
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('should NOT close popup when iframe content area is clicked', () => {
    const onCloseMock = vi.fn();

    const { container } = render(
      <YouTubePopup
        isOpen={true}
        onClose={onCloseMock}
        searchQuery="test+exercise"
      />
    );

    // Find the popup container (not the backdrop)
    const popupContainer = container.querySelector('[class*="relative w-full h-full"]');
    expect(popupContainer).toBeTruthy();

    // Click popup content
    fireEvent.click(popupContainer!);

    // Verify onClose was NOT called
    expect(onCloseMock).not.toHaveBeenCalled();
  });
});

describe('YouTubePopup - Responsive Design (Task 6.3)', () => {
  it('should render full-screen on mobile', () => {
    const { container } = render(
      <YouTubePopup
        isOpen={true}
        onClose={() => {}}
        searchQuery="test+exercise"
      />
    );

    // Verify backdrop covers full screen
    const backdrop = container.querySelector('[class*="fixed inset-0"]');
    expect(backdrop).toBeTruthy();
    expect(backdrop?.className).toContain('fixed');
    expect(backdrop?.className).toContain('inset-0');

    // Verify popup container is full width/height
    const popupContainer = container.querySelector('[class*="w-full h-full"]');
    expect(popupContainer).toBeTruthy();
  });

  it('should have animation classes applied', () => {
    const { container } = render(
      <YouTubePopup
        isOpen={true}
        onClose={() => {}}
        searchQuery="test+exercise"
      />
    );

    // Verify transition classes exist
    const backdrop = container.querySelector('[class*="transition-opacity"]');
    expect(backdrop).toBeTruthy();

    const popupContainer = container.querySelector('[class*="transition-all"]');
    expect(popupContainer).toBeTruthy();
  });

  it('should prevent body scroll when popup is open', () => {
    // Initial state
    expect(document.body.style.overflow).toBe('');

    const { unmount } = render(
      <YouTubePopup
        isOpen={true}
        onClose={() => {}}
        searchQuery="test+exercise"
      />
    );

    // Body scroll should be prevented
    expect(document.body.style.overflow).toBe('hidden');

    // Cleanup on unmount
    unmount();
    expect(document.body.style.overflow).toBe('');
  });
});
