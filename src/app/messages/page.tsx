'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { ChatPanel } from '@/components/chat/chat-panel';
import { formatRelativeTime, truncate } from '@/lib/utils';
import { MessageSquare, Home, Car, ChevronRight } from 'lucide-react';

interface Chat {
  id: string;
  chatType: 'ACCOMMODATION' | 'LOGISTICS';
  otherUser: {
    id: string;
    uniqueUserId: string;
    displayName: string | null;
    email: string;
  };
  post: {
    id: string;
    title: string;
    type?: string;
  };
  lastMessage: {
    content: string;
    sentAt: string;
    isOwn: boolean;
  } | null;
  unreadCount: number;
  expiresAt: string;
  createdAt: string;
}

export default function MessagesPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);

  const fetchChats = useCallback(async () => {
    try {
      const response = await fetch('/api/chats');
      if (response.ok) {
        const data = await response.json();
        setChats(data.chats);
      }
    } catch (error) {
      console.error('Failed to fetch chats:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChats();
    
    // Poll for new messages every 5 seconds
    const interval = setInterval(fetchChats, 5000);
    
    return () => clearInterval(interval);
  }, [fetchChats]);

  // Refresh chat list when chat panel is closed
  const handleCloseChat = () => {
    setSelectedChat(null);
    fetchChats(); // Refresh to update unread counts
  };

  const getChatIcon = (type: string) => {
    switch (type) {
      case 'ACCOMMODATION':
        return <Home className="w-4 h-4" />;
      case 'LOGISTICS':
        return <Car className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-display font-bold">Messages</h1>
          <p className="text-muted-foreground">
            Your private conversations with other community members
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="p-4 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-surface-200 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-surface-200 rounded w-1/4" />
                    <div className="h-3 bg-surface-200 rounded w-1/2" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : chats.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-surface-100 flex items-center justify-center">
              <MessageSquare className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No conversations yet</h3>
            <p className="text-muted-foreground mb-6">
              Start by responding to an accommodation or ride share post
            </p>
            <Button onClick={() => window.location.href = '/accommodation'}>
              Browse Listings
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {chats.map((chat, index) => (
              <motion.div
                key={chat.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className={`p-4 hover:shadow-md transition-shadow cursor-pointer relative ${
                    chat.unreadCount > 0 ? 'bg-primary-50/50 border-primary-200' : ''
                  }`}
                  onClick={() => setSelectedChat(chat)}
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar with unread indicator */}
                    <div className="relative">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback className="bg-primary-100 text-primary-700">
                          {(chat.otherUser.displayName || chat.otherUser.email.split('@')[0])
                            .charAt(0)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {/* Unread dot indicator */}
                      {chat.unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold">
                          {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className={`font-semibold truncate ${chat.unreadCount > 0 ? 'text-gray-900' : ''}`}>
                          @{chat.otherUser.displayName || chat.otherUser.email.split('@')[0]}
                        </h3>
                        {chat.lastMessage && (
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeTime(chat.lastMessage.sentAt)}
                          </span>
                        )}
                      </div>

                      {/* Post info */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        {getChatIcon(chat.chatType)}
                        <span className="truncate">{chat.post.title}</span>
                      </div>

                      {/* Last message */}
                      {chat.lastMessage && (
                        <p className={`text-sm truncate ${
                          chat.unreadCount > 0 ? 'text-gray-900 font-medium' : 'text-muted-foreground'
                        }`}>
                          {chat.lastMessage.isOwn && 'You: '}
                          {truncate(chat.lastMessage.content, 50)}
                        </p>
                      )}
                    </div>

                    {/* Chevron */}
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Chat Panel */}
      {selectedChat && (
        <ChatPanel
          chatId={selectedChat.id}
          onClose={handleCloseChat}
          recipientName={
            selectedChat.otherUser.displayName ||
            selectedChat.otherUser.email.split('@')[0]
          }
        />
      )}
    </DashboardLayout>
  );
}
