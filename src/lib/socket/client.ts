'use client';

import { io, Socket } from 'socket.io-client';
import { create } from 'zustand';

interface Message {
  id: string;
  chatId: string;
  content: string;
  sentAt: string;
  sender: {
    id: string;
    uniqueUserId: string;
    displayName: string | null;
  };
}

interface Notification {
  type: string;
  chatId?: string;
  preview?: string;
}

interface SocketState {
  socket: Socket | null;
  isConnected: boolean;
  connect: (userId: string) => void;
  disconnect: () => void;
  joinChat: (chatId: string) => void;
  sendMessage: (chatId: string, content: string, senderId: string) => void;
  setTyping: (chatId: string, isTyping: boolean) => void;
  markAsRead: (chatId: string) => void;
  onNewMessage: (callback: (message: Message) => void) => void;
  onNotification: (callback: (notification: Notification) => void) => void;
  onTyping: (callback: (data: { userId: string; chatId: string }) => void) => void;
  offNewMessage: () => void;
  offNotification: () => void;
  offTyping: () => void;
}

export const useSocket = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,

  connect: (userId: string) => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000';
    
    const socket = io(wsUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('🔌 Socket connected');
      set({ isConnected: true });
      socket.emit('authenticate', userId);
    });

    socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
      set({ isConnected: false });
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    set({ socket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  },

  joinChat: (chatId: string) => {
    const { socket } = get();
    socket?.emit('join-chat', chatId);
  },

  sendMessage: (chatId: string, content: string, senderId: string) => {
    const { socket } = get();
    socket?.emit('send-message', { chatId, content, senderId });
  },

  setTyping: (chatId: string, isTyping: boolean) => {
    const { socket } = get();
    if (isTyping) {
      socket?.emit('typing', chatId);
    } else {
      socket?.emit('stop-typing', chatId);
    }
  },

  markAsRead: (chatId: string) => {
    const { socket } = get();
    socket?.emit('mark-read', chatId);
  },

  onNewMessage: (callback: (message: Message) => void) => {
    const { socket } = get();
    socket?.on('new-message', callback);
  },

  onNotification: (callback: (notification: Notification) => void) => {
    const { socket } = get();
    socket?.on('notification', callback);
  },

  onTyping: (callback: (data: { userId: string; chatId: string }) => void) => {
    const { socket } = get();
    socket?.on('user-typing', callback);
    socket?.on('user-stop-typing', (data) => callback({ ...data, userId: '' }));
  },

  offNewMessage: () => {
    const { socket } = get();
    socket?.off('new-message');
  },

  offNotification: () => {
    const { socket } = get();
    socket?.off('notification');
  },

  offTyping: () => {
    const { socket } = get();
    socket?.off('user-typing');
    socket?.off('user-stop-typing');
  },
}));

