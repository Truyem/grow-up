
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, Volume2, VolumeX, Music } from 'lucide-react';

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

export const MusicPlayer: React.FC = () => {
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [player, setPlayer] = useState<any>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [videoTitle, setVideoTitle] = useState("Đang tải danh sách phát...");
  const [volume, setVolume] = useState(70);
  const [isApiReady, setIsApiReady] = useState(false);

  const playerRef = useRef<any>(null);

  const initPlayer = () => {
    if (window.YT && window.YT.Player && !playerRef.current) {
      console.log("Initializing YouTube Player...");
      playerRef.current = new window.YT.Player('youtube-embedded-player', {
        height: '1',
        width: '1',
        playerVars: {
          listType: 'playlist',
          list: 'PLnibGKI6a8jFG6jcn9d4get59jHmWJqzH', // Phonk Workout
          autoplay: 0, // Don't auto play audio, wait for user
          controls: 0,
          showinfo: 0,
          loop: 1,
        },
        events: {
          'onReady': (event: any) => {
            console.log("Player Ready");
            setPlayer(event.target);
            event.target.setShuffle(true);
            event.target.playVideoAt(0); // Start buffering to get metadata
            event.target.pauseVideo();   // Immediately pause so we don't blast sound
            event.target.setVolume(volume);
            setVideoTitle("Sẵn sàng! Bấm Play để tập.");
            setIsApiReady(true);
          },
          'onStateChange': (event: any) => {
            // State 1 = Playing
            if (event.data === 1) {
              setIsMusicPlaying(true);
              updateTitle(event.target);
            }
            // State 2 = Paused
            if (event.data === 2) {
              setIsMusicPlaying(false);
            }
            // State 0 = Ended
            if (event.data === 0) {
              event.target.nextVideo();
            }
          }
        }
      });
    }
  };

  // Load YouTube IFrame Player API
  useEffect(() => {
    // Check if script is already present
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      // Define global callback
      window.onYouTubeIframeAPIReady = () => {
        initPlayer();
      };
    } else {
      // API already loaded, init immediately
      initPlayer();
    }
  }, []);

  const updateTitle = (target: any) => {
    if (target && target.getVideoData) {
      const data = target.getVideoData();
      if (data && data.title) {
        setVideoTitle(data.title);
      }
    }
  };

  const toggleMusic = () => {
    if (player) {
      if (isMusicPlaying) {
        player.pauseVideo();
        // State updated via onStateChange
      } else {
        player.playVideo();
        // State updated via onStateChange
      }
    } else if (!isApiReady) {
       // Retry init if user clicks before ready (rare case with fix)
       initPlayer();
    }
  };

  const nextTrack = () => {
    if (player) {
      player.nextVideo();
      setIsMusicPlaying(true);
    }
  };

  const toggleMute = () => {
    if (player) {
      if (isMuted) {
        player.unMute();
        setIsMuted(false);
      } else {
        player.mute();
        setIsMuted(true);
      }
    }
  };

  const adjustVolume = (change: number) => {
    if (player) {
      const newVol = Math.min(100, Math.max(0, volume + change));
      setVolume(newVol);
      player.setVolume(newVol);
      if (newVol > 0 && isMuted) {
        player.unMute();
        setIsMuted(false);
      }
    }
  };

  return (
    <div className="bg-black/20 border border-white/5 rounded-xl p-3 flex flex-col gap-3 relative overflow-hidden group mb-4">
      {/* Hidden YouTube Container */}
      <div id="youtube-embedded-player" className="absolute top-0 left-0 w-0 h-0 opacity-0 pointer-events-none"></div>
      
      {/* Title Display */}
      <div className="flex items-center gap-3 w-full overflow-hidden">
        <div className={`p-2 rounded-full ${isMusicPlaying ? 'bg-green-500/20 text-green-400 animate-pulse' : 'bg-white/5 text-gray-500'}`}>
          <Music className="w-4 h-4" />
        </div>
        <div className="flex-1 overflow-hidden relative h-6">
           <div className={`absolute whitespace-nowrap text-sm font-medium text-cyan-100 ${isMusicPlaying ? 'animate-[marquee_10s_linear_infinite]' : ''}`}>
             {videoTitle}
           </div>
        </div>
      </div>

      {/* Controls Row */}
      <div className="flex items-center justify-between">
        
        {/* Play/Next */}
        <div className="flex gap-2">
          <button
            onClick={toggleMusic}
            disabled={!player}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all
              ${!player ? 'opacity-50 cursor-not-allowed bg-gray-700 text-gray-400' : 
                isMusicPlaying 
                ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' 
                : 'bg-cyan-500 text-black hover:bg-cyan-400'}
            `}
          >
            {isMusicPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            {isMusicPlaying ? "Pause" : "Play"}
          </button>

          <button
             onClick={nextTrack}
             disabled={!player}
             className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/5 disabled:opacity-30"
             title="Next Song"
          >
             <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 border border-white/5">
          <button 
            onClick={toggleMute}
            disabled={!player}
            className="p-1.5 rounded hover:bg-white/10 text-gray-400 disabled:opacity-30"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
          
          <button onClick={() => adjustVolume(-10)} className="px-2 py-1 text-xs text-gray-400 hover:text-white font-mono">-</button>
          <span className="text-xs font-mono w-6 text-center text-cyan-300">{isMuted ? 0 : volume}</span>
          <button onClick={() => adjustVolume(10)} className="px-2 py-1 text-xs text-gray-400 hover:text-white font-mono">+</button>
        </div>

      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
};
