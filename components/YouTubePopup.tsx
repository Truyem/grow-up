import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface YouTubePopupProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
}

export const YouTubePopup: React.FC<YouTubePopupProps> = ({ isOpen, onClose, searchQuery }) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  // Handle enter and exit animations
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // Trigger enter animation after render
      requestAnimationFrame(() => {
        setIsAnimating(true);
      });
    } else {
      // Trigger exit animation
      setIsAnimating(false);
      // Remove from DOM after animation completes
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 200); // Match exit animation duration
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Prevent body scroll when popup is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!shouldRender) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only close if clicking the backdrop itself, not the popup content
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const youtubeUrl = `https://m.youtube.com/results?search_query=${searchQuery}`;

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm transition-opacity duration-300 ease-out ${
        isAnimating ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleBackdropClick}
    >
      <div className={`relative w-full h-full max-w-6xl flex flex-col bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden transition-all duration-300 ease-out ${
        isAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      }`}>
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 transition-all text-white hover:scale-110 active:scale-95 shadow-lg"
          title="Đóng"
        >
          <X className="w-6 h-6" />
        </button>

        {/* YouTube iframe */}
        <iframe
          src={youtubeUrl}
          className="w-full h-full rounded-2xl"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="YouTube Video"
        />
      </div>
    </div>
  );
};
