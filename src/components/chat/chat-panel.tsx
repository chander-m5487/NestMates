'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';

// Reuse one AudioContext for the component's lifetime — creating a new one
// per beep leaks OS audio resources (browsers cap simultaneous contexts).
let chatAudioCtx: AudioContext | null = null;
function getChatAudioCtx(): AudioContext | null {
  try {
    if (!chatAudioCtx || chatAudioCtx.state === 'closed') {
      const Ctor = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctor) return null;
      chatAudioCtx = new Ctor();
    }
    return chatAudioCtx;
  } catch {
    return null;
  }
}
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatRelativeTime } from '@/lib/utils';
import { X, Send, Loader2, MessageCircle } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  sentAt: string;
  readAt: string | null;
  sender: {
    id: string;
    uniqueUserId: string;
    displayName: string | null;
  };
  isOwn: boolean;
}

interface ChatPanelProps {
  chatId: string;
  onClose: () => void;
  recipientName: string;
  postExpiresAt?: string | null;
  postIsActive?: boolean;
}

export function ChatPanel({ chatId, onClose, recipientName, postExpiresAt, postIsActive = true }: ChatPanelProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(!postIsActive);
  const [deletionAt, setDeletionAt] = useState<string | null>(null);
  // Set to true when the server returns 410/404 mid-session (post deleted while chat is open)
  const [chatDeactivated, setChatDeactivated] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousMessageCount = useRef(0);

  // Play notification beep using Web Audio API
  const playNotificationSound = useCallback(() => {
    const ctx = getChatAudioCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 600;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } catch {
      // audio unavailable
    }
  }, []);

  const fetchMessages = useCallback(async () => {
    try {
      const response = await fetch(`/api/chats/${chatId}/messages`);
      if (response.status === 410 || response.status === 404) {
        // Permanently deleted — stop polling
        setChatDeactivated(true);
        setIsReadOnly(true);
        setIsLoading(false);
        return;
      }
      if (response.ok) {
        const data = await response.json();
        const newMessages = data.messages as Message[];

        // Sync read-only state from server (handles post deletion while chat is open)
        if (data.isReadOnly) {
          setIsReadOnly(true);
          setChatDeactivated(true);
          if (data.scheduledDeletionAt) setDeletionAt(data.scheduledDeletionAt);
        }

        // Play sound only for new incoming messages after initial load
        if (previousMessageCount.current > 0 && newMessages.length > previousMessageCount.current) {
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage && !lastMessage.isOwn) {
            playNotificationSound();
          }
        }

        previousMessageCount.current = newMessages.length;
        setMessages(newMessages);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, [chatId, playNotificationSound]); // removed isLoading — it caused interval resets on every state change

  useEffect(() => {
    fetchMessages();

    // Pause polling when the tab is hidden — saves server load and battery.
    // Resumes immediately when the user comes back to the tab.
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchMessages();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') fetchMessages();
    }, 3000);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    const messageContent = newMessage.trim();
    setNewMessage('');

    // Optimistic update
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      content: messageContent,
      sentAt: new Date().toISOString(),
      readAt: null,
      sender: {
        id: user?.id || '',
        uniqueUserId: user?.uniqueUserId || '',
        displayName: user?.displayName || null,
      },
      isOwn: true,
    };
    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      const response = await fetch(`/api/chats/${chatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: messageContent }),
      });

      if (response.ok) {
        const data = await response.json();
        // Replace optimistic message with real one
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === optimisticMessage.id ? data.message : msg
          )
        );
      } else {
        // Remove optimistic message on error
        setMessages((prev) =>
          prev.filter((msg) => msg.id !== optimisticMessage.id)
        );
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages((prev) =>
        prev.filter((msg) => msg.id !== optimisticMessage.id)
      );
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      className="fixed right-4 bottom-4 w-96 h-[500px] bg-white rounded-2xl shadow-2xl border flex flex-col overflow-hidden z-50"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-primary-50">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarFallback className="bg-primary-100 text-primary-700">
              {recipientName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-sm">{recipientName}</p>
            {(() => {
              const now = new Date();
              const expiry = postExpiresAt ? new Date(postExpiresAt) : null;
              // Post was manually deleted (before its natural expiry date)
              const isManuallyDeleted = chatDeactivated
                ? (expiry ? expiry > now : true)   // deactivated while expiry still in future
                : (!postIsActive && expiry ? expiry > now : false);
              // Post naturally expired (reached 30-day limit)
              const isNaturallyExpired = chatDeactivated
                ? (expiry ? expiry <= now : false)
                : (!postIsActive && expiry ? expiry <= now : false);

              if (isManuallyDeleted) {
                return (
                  <p className="text-xs font-medium" style={{ color: '#ef4444' }}>
                    Listing deleted — chat auto-deletes in 48 hrs
                  </p>
                );
              }
              if (isNaturallyExpired) {
                return (
                  <p className="text-xs font-medium" style={{ color: '#ef4444' }}>
                    Post expired — chat deletes in 48 hrs
                  </p>
                );
              }
              return (
                <p className="text-xs font-medium" style={{ color: '#f87171' }}>
                  Chat auto-deletes 48 hrs after listing expires
                </p>
              );
            })()}
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageCircle className="w-12 h-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              No messages yet. Start the conversation!
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] ${
                    message.isOwn
                      ? 'bg-primary-500 text-white rounded-2xl rounded-br-sm'
                      : 'bg-surface-100 text-foreground rounded-2xl rounded-bl-sm'
                  } px-4 py-2`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                  <p
                    className={`text-[10px] mt-1 ${
                      message.isOwn ? 'text-white/70' : 'text-muted-foreground'
                    }`}
                  >
                    {formatRelativeTime(message.sentAt)}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input — replaced with read-only banner when post is deleted */}
      {isReadOnly ? (
        <div className="p-4 border-t bg-red-50">
          <p className="text-xs font-medium text-center" style={{ color: '#ef4444' }}>
            This conversation is read-only.
            {deletionAt
              ? ` It will be permanently deleted on ${new Date(deletionAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}.`
              : ' It will be permanently deleted within 48 hours.'}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSend} className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1"
              disabled={isSending}
            />
            <Button type="submit" size="icon" disabled={!newMessage.trim() || isSending}>
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </form>
      )}
    </motion.div>
  );
}

