'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare } from 'lucide-react';
import Link from 'next/link';

// Reuse a single AudioContext for the lifetime of the page — creating a new
// one per beep is a resource leak (browsers cap simultaneous contexts).
let sharedAudioCtx: AudioContext | null = null;
function getAudioCtx(): AudioContext | null {
  try {
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      const Ctor = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctor) return null;
      sharedAudioCtx = new Ctor();
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

function playBeep() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    [{ freq: 830, start: now, dur: 0.15 }, { freq: 1046, start: now + 0.12, dur: 0.2 }].forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + dur);
      osc.start(start);
      osc.stop(start + dur);
    });
  } catch {
    // silently ignore audio errors
  }
}

export function MessageIndicator() {
  const [unreadCount, setUnreadCount] = useState(0);
  const previousCount = useRef(-1); // Start with -1 to skip first notification
  const hasUserInteracted = useRef(false);

  // Track user interaction (needed for audio)
  useEffect(() => {
    const handleInteraction = () => {
      hasUserInteracted.current = true;
    };
    
    // These events indicate user interaction
    window.addEventListener('click', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);
    
    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  // Show notification and play sound — called only when unread count increases
  const showNotification = useCallback(() => {
    if (hasUserInteracted.current) {
      playBeep();
    }
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      new Notification('NestMates', {
        body: 'You have a new message!',
        icon: '/favicon.ico',
        tag: 'nestmates-message',
      });
    } else if (Notification.permission === 'default' && hasUserInteracted.current) {
      // Request permission only once, only after a real user gesture
      Notification.requestPermission();
    }
    // 'denied' → silently ignore; never prompt again
  }, []);

  const checkUnreadMessages = useCallback(async () => {
    try {
      const response = await fetch('/api/messages/unread-count');
      if (!response.ok) return; // server error — keep previous count, don't reset to 0
      const data = await response.json();
      const newCount = data.count || 0;
      if (previousCount.current >= 0 && newCount > previousCount.current) {
        showNotification();
      }
      previousCount.current = newCount;
      setUnreadCount(newCount);
    } catch {
      // network error — keep previous count shown
    }
  }, [showNotification]);

  useEffect(() => {
    // Initial fetch
    checkUnreadMessages();

    // Poll for new messages every 8 seconds
    const interval = setInterval(checkUnreadMessages, 8000);

    return () => clearInterval(interval);
  }, [checkUnreadMessages]);

  return (
    <Link href="/messages">
      <button
        className="relative flex items-center justify-center rounded-xl transition-opacity hover:opacity-90 active:opacity-80"
        style={{
          background: 'linear-gradient(135deg, #7dd3fc 0%, #38bdf8 50%, #0ea5e9 100%)',
          boxShadow: '0 2px 8px rgba(14,165,233,0.35)',
          width: 36,
          height: 36,
          border: 'none',
          cursor: 'pointer',
        }}
        title="Messages"
      >
        <MessageSquare style={{ width: 18, height: 18, color: '#ffffff', flexShrink: 0 }} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full text-white text-xs font-bold flex items-center justify-center px-1 shadow-md animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    </Link>
  );
}

