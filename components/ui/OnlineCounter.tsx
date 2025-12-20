import React, { useState, useEffect } from 'react';
import { Users } from 'lucide-react';

export const OnlineCounter: React.FC = () => {
    const [onlineCount, setOnlineCount] = useState<number>(1);
    const [pulse, setPulse] = useState(false);

    // Generate a unique session ID for this visitor
    const [sessionId] = useState(() => {
        const saved = localStorage.getItem('presence_session_id');
        if (saved) return saved;
        const newId = Math.random().toString(36).substring(2) + Date.now().toString(36);
        localStorage.setItem('presence_session_id', newId);
        return newId;
    });

    const sendHeartbeat = async () => {
        try {
            await fetch('/.netlify/functions/presence', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId }),
            });
        } catch (error) {
            console.error('Failed to send heartbeat', error);
        }
    };

    const fetchOnlineCount = async () => {
        try {
            const response = await fetch('/.netlify/functions/presence');
            const data = await response.json();
            if (data.onlineCount !== undefined) {
                setOnlineCount(data.onlineCount);
                setPulse(true);
                setTimeout(() => setPulse(false), 2000);
            }
        } catch (error) {
            console.error('Failed to fetch online count', error);
        }
    };

    useEffect(() => {
        // Initial heartbeat and fetch
        sendHeartbeat();
        fetchOnlineCount();

        // Set up intervals
        const heartbeatInterval = setInterval(sendHeartbeat, 30000); // Heartbeat every 30s
        const fetchInterval = setInterval(fetchOnlineCount, 45000);   // Fetch every 45s

        return () => {
            clearInterval(heartbeatInterval);
            clearInterval(fetchInterval);
        };
    }, []);

    return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 backdrop-blur-md rounded-full border border-white/10 shadow-sm transition-all hover:bg-white/10 group">
            <div className="relative flex items-center justify-center">
                <Users className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-gray-900 ${pulse ? 'animate-ping' : ''}`} />
            </div>
            <div className="flex items-baseline gap-1">
                <span className="text-xs font-bold text-white tabular-nums">
                    {onlineCount}
                </span>
                <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider hidden sm:inline">
                    trực tuyến
                </span>
            </div>
        </div>
    );
};
