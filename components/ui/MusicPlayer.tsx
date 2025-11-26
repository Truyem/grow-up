
import React from 'react';
import { ExternalLink, Music } from 'lucide-react';

export const MusicPlayer: React.FC = () => {
  return (
    <div className="bg-black/20 border border-white/5 rounded-xl p-0 overflow-hidden mb-4 relative group">
      {/* Title / Header */}
      <div className="flex items-center justify-between p-3 bg-white/5 border-b border-white/5">
        <div className="flex items-center gap-2 text-green-400">
           <Music className="w-4 h-4" />
           <span className="text-xs font-bold uppercase tracking-wider">Workout Playlist</span>
        </div>
        <a 
          href="https://open.spotify.com/playlist/0xF0eHm3eguBqBvgVyQ3UB" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-xs text-gray-500 hover:text-white flex items-center gap-1 transition-colors"
        >
          Mở App <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Spotify Embed */}
      <div className="w-full relative">
        <iframe 
          style={{ borderRadius: '0 0 12px 12px' }} 
          src="https://open.spotify.com/embed/playlist/0xF0eHm3eguBqBvgVyQ3UB?utm_source=generator&theme=0" 
          width="100%" 
          height="152" 
          frameBorder="0" 
          allowFullScreen 
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
          loading="lazy"
          className="bg-[#282828]" // Default spotify background to prevent white flash
        ></iframe>
      </div>
      
      {/* Note for user */}
      <div className="p-2 text-[10px] text-gray-500 text-center italic">
        *Đăng nhập Spotify trên trình duyệt để nghe trọn vẹn bài hát.
      </div>
    </div>
  );
};
