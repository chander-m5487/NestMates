'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare } from 'lucide-react';
import Link from 'next/link';

// Create a beep sound using Web Audio API
function playBeep() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    
    // First beep
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.frequency.value = 830; // High note
    osc1.type = 'sine';
    gain1.gain.setValueAtTime(0.3, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.15);
    
    // Second beep (higher)
    setTimeout(() => {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.value = 1046; // Higher note
      osc2.type = 'sine';
      gain2.gain.setValueAtTime(0.3, ctx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc2.start(ctx.currentTime);
      osc2.stop(ctx.currentTime + 0.2);
    }, 120);
  } catch (e) {
    console.log('Audio not available');
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

  // Show notification and play sound
  const showNotification = useCallback(() => {
    // Only play sound if user has interacted with the page
    if (hasUserInteracted.current) {
      playBeep();
    }
    
    // Show browser notification if permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('NestMates', {
        body: 'You have a new message!',
        icon: '/favicon.ico',
        tag: 'nestmates-message',
      });
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      // Request permission
      Notification.requestPermission();
    }
  }, []);

  const checkUnreadMessages = useCallback(async () => {
    try {
      const response = await fetch('/api/messages/unread-count');
      if (response.ok) {
        const data = await response.json();
        const newCount = data.count || 0;
        
        // Show notification if count increased (and not first load)
        if (previousCount.current >= 0 && newCount > previousCount.current) {
          showNotification();
        }
        
        previousCount.current = newCount;
        setUnreadCount(newCount);
      }
    } catch (error) {
      console.error('Failed to check unread messages:', error);
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
      <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
        <MessageSquare className="w-6 h-6 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] bg-red-500 rounded-full text-white text-xs font-bold flex items-center justify-center px-1 shadow-md animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    </Link>
  );
}

