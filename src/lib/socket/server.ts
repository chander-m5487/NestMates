/**
 * WebSocket Server for Real-time Chat
 * 
 * This integrates with Next.js to provide real-time messaging capabilities.
 * Messages are always persisted to the database first, then broadcast.
 */

import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { db } from '@/lib/db';

interface ChatMessage {
  chatId: string;
  content: string;
  senderId: string;
}

interface SocketData {
  userId: string;
}

let io: SocketIOServer | null = null;

/**
 * Initialize Socket.IO server
 */
export function initSocketServer(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on('connection', (socket: Socket) => {
    console.log('🔌 Client connected:', socket.id);

    // Handle user authentication
    socket.on('authenticate', async (userId: string) => {
      (socket.data as SocketData).userId = userId;
      
      // Join user's personal room for direct notifications
      socket.join(`user:${userId}`);
      
      // Get all user's chat rooms and join them
      const chats = await db.chat.findMany({
        where: {
          OR: [
            { ownerId: userId },
            { responderId: userId },
          ],
          isActive: true,
        },
        select: { id: true },
      });

      for (const chat of chats) {
        socket.join(`chat:${chat.id}`);
      }

      console.log(`👤 User ${userId} authenticated, joined ${chats.length} chat rooms`);
    });

    // Handle joining a specific chat room
    socket.on('join-chat', async (chatId: string) => {
      const userId = (socket.data as SocketData).userId;
      if (!userId) return;

      // Verify user is a participant
      const chat = await db.chat.findFirst({
        where: {
          id: chatId,
          OR: [
            { ownerId: userId },
            { responderId: userId },
          ],
        },
      });

      if (chat) {
        socket.join(`chat:${chatId}`);
        console.log(`👤 User ${userId} joined chat ${chatId}`);
      }
    });

    // Handle sending a message
    socket.on('send-message', async (data: ChatMessage) => {
      const userId = (socket.data as SocketData).userId;
      if (!userId || userId !== data.senderId) return;

      try {
        // Verify user is a participant
        const chat = await db.chat.findFirst({
          where: {
            id: data.chatId,
            OR: [
              { ownerId: userId },
              { responderId: userId },
            ],
            isActive: true,
          },
        });

        if (!chat) {
          socket.emit('error', { message: 'Chat not found or access denied' });
          return;
        }

        // Check if chat has expired
        if (chat.expiresAt < new Date()) {
          socket.emit('error', { message: 'This chat has expired' });
          return;
        }

        // DATABASE FIRST: Store message before broadcasting
        const message = await db.message.create({
          data: {
            chatId: data.chatId,
            senderId: userId,
            content: data.content.trim(),
          },
          include: {
            sender: {
              select: {
                id: true,
                uniqueUserId: true,
                displayName: true,
              },
            },
          },
        });

        // Update chat's updatedAt
        await db.chat.update({
          where: { id: data.chatId },
          data: { updatedAt: new Date() },
        });

        // Broadcast message to all participants in the chat room
        io?.to(`chat:${data.chatId}`).emit('new-message', {
          id: message.id,
          chatId: message.chatId,
          content: message.content,
          sentAt: message.sentAt,
          sender: message.sender,
        });

        // Notify recipient
        const recipientId = chat.ownerId === userId ? chat.responderId : chat.ownerId;
        
        // Create in-app notification
        await db.notification.create({
          data: {
            userId: recipientId,
            type: 'NEW_MESSAGE',
            title: 'New message',
            message: data.content.length > 50 ? data.content.substring(0, 50) + '...' : data.content,
            data: { chatId: data.chatId, messageId: message.id },
          },
        });

        // Emit to recipient's personal room
        io?.to(`user:${recipientId}`).emit('notification', {
          type: 'NEW_MESSAGE',
          chatId: data.chatId,
          preview: data.content.length > 30 ? data.content.substring(0, 30) + '...' : data.content,
        });

      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicator
    socket.on('typing', (chatId: string) => {
      const userId = (socket.data as SocketData).userId;
      socket.to(`chat:${chatId}`).emit('user-typing', { userId, chatId });
    });

    // Handle stop typing
    socket.on('stop-typing', (chatId: string) => {
      const userId = (socket.data as SocketData).userId;
      socket.to(`chat:${chatId}`).emit('user-stop-typing', { userId, chatId });
    });

    // Handle message read status
    socket.on('mark-read', async (chatId: string) => {
      const userId = (socket.data as SocketData).userId;
      if (!userId) return;

      await db.message.updateMany({
        where: {
          chatId,
          senderId: { not: userId },
          readAt: null,
        },
        data: { readAt: new Date() },
      });

      socket.to(`chat:${chatId}`).emit('messages-read', { chatId, userId });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('🔌 Client disconnected:', socket.id);
    });
  });

  return io;
}

/**
 * Get the Socket.IO server instance
 */
export function getSocketServer(): SocketIOServer | null {
  return io;
}

/**
 * Broadcast a notification to a specific user
 */
export function notifyUser(userId: string, notification: object) {
  io?.to(`user:${userId}`).emit('notification', notification);
}

/**
 * Broadcast to a chat room
 */
export function broadcastToChat(chatId: string, event: string, data: object) {
  io?.to(`chat:${chatId}`).emit(event, data);
}

