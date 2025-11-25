import React, { useEffect, useState } from 'react';
import { X, Loader2, Search } from 'lucide-react';

interface YouTubePopupProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
}

interface YouTubeVideo {
  id: string;
  title: string;
  thumbnail: string;
}

export const YouTubePopup: React.FC<YouTubePopupProps> = ({ isOpen, onClose, searchQuery }) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Search YouTube videos when popup opens
  useEffect(() => {
    if (isOpen && searchQuery) {
      searchYouTubeVideos(searchQuery);
    }
  }, [isOpen, searchQuery]);

  const searchYouTubeVideos = async (query: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Using YouTube oEmbed API (no API key required) with a workaround
      // We'll use the Invidious API as a fallback since YouTube Data API requires key
      const response = await fetch(
        `https://inv.nadeko.net/api/v1/search?q=${encodeURIComponent(query)}&type=video&sort_by=relevance`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch videos');
      }

      const data = await response.json();
      const videoList: YouTubeVideo[] = data.slice(0, 6).map((item: any) => ({
        id: item.videoId,
        title: item.title,
        thumbnail: item.videoThumbnails?.[0]?.url || '',
      }));

      setVideos(videoList);
      
      // Auto-select first video
      if (videoList.length > 0) {
        setSelectedVideo(videoList[0].id);
      }
    } catch (err) {
      console.error('YouTube search error:', err);
      setError('Không thể tải video. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!shouldRender) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only close if clicking the backdrop itself, not the popup content
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-sm transition-opacity duration-300 ease-out ${
        isAnimating ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleBackdropClick}
    >
      <div className={`relative w-full h-full max-w-6xl flex flex-col bg-gradient-to-br from-gray-900 to-black backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden transition-all duration-300 ease-out ${
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

        {/* Content */}
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center gap-2 text-white">
              <Search className="w-5 h-5 text-cyan-400" />
              <h3 className="font-bold text-lg">Hướng dẫn bài tập</h3>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Video Player */}
            <div className="flex-1 bg-black flex items-center justify-center p-4">
              {isLoading ? (
                <div className="flex flex-col items-center gap-3 text-white">
                  <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
                  <p className="text-sm text-gray-400">Đang tìm video...</p>
                </div>
              ) : error ? (
                <div className="text-center text-red-400 p-4">
                  <p>{error}</p>
                  <button
                    onClick={() => searchYouTubeVideos(searchQuery)}
                    className="mt-4 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-lg text-white text-sm"
                  >
                    Thử lại
                  </button>
                </div>
              ) : selectedVideo ? (
                <iframe
                  src={`https://www.youtube.com/embed/${selectedVideo}?autoplay=1`}
                  className="w-full h-full rounded-lg"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="YouTube Video"
                />
              ) : (
                <p className="text-gray-400">Không tìm thấy video</p>
              )}
            </div>

            {/* Video List Sidebar */}
            {videos.length > 0 && (
              <div className="w-full lg:w-80 bg-black/30 border-t lg:border-t-0 lg:border-l border-white/10 overflow-y-auto">
                <div className="p-3">
                  <h4 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">
                    Video liên quan
                  </h4>
                  <div className="space-y-2">
                    {videos.map((video) => (
                      <button
                        key={video.id}
                        onClick={() => setSelectedVideo(video.id)}
                        className={`w-full text-left p-2 rounded-lg transition-all ${
                          selectedVideo === video.id
                            ? 'bg-cyan-500/20 border border-cyan-500/50'
                            : 'bg-white/5 hover:bg-white/10 border border-transparent'
                        }`}
                      >
                        <div className="flex gap-2">
                          <img
                            src={video.thumbnail}
                            alt={video.title}
                            className="w-24 h-16 object-cover rounded flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs line-clamp-3 ${
                              selectedVideo === video.id ? 'text-cyan-300' : 'text-gray-300'
                            }`}>
                              {video.title}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
