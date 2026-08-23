/**
 * WebSocket server for real-time features
 *
 * FEATURES:
 * - Real-time event notifications
 * - Live check-in updates
 * - Typing indicators for comments
 * - Online/offline status
 * - Room-based messaging
 *
 * SETUP INSTRUCTIONS:
 * 1. Install: npm install ws @types/ws
 * 2. Uncomment implementation code
 * 3. Call initWebSocket(server) in index.ts
 *
 * USAGE:
 * import { broadcast, sendToUser, joinRoom, leaveRoom } from './utils/websocket';
 *
 * // Broadcast to all clients
 * broadcast('new_checkin', { venueId: '123', userId: '456' });
 *
 * // Send to specific user
 * sendToUser(userId, 'notification', { message: 'New follower!' });
 *
 * // Room-based messaging
 * joinRoom(userId, 'venue:123');
 * broadcastToRoom('checkin:123', 'new_comment', commentData);
 */

import { Server } from 'http';
import { AuthUtils } from './auth';
import WebSocket, { WebSocketServer as WsServer } from 'ws';
import IORedis from 'ioredis';
import Database from '../config/database';
import { createPubSubConnection } from '../config/redis';
import winstonLogger from './logger';
import { REALTIME_DELIVERY_CHANNEL, RealtimeDeliveryEnvelope } from '../services/RealtimePublisher';

interface Client {
  ws: WebSocket;
  userId?: string;
  rooms: Set<string>;
  isAlive: boolean;
  messageCount: number;
  lastMessageReset: number;
}

// Maximum concurrent WebSocket connections. Prevents resource exhaustion
// from connection floods. At beta scale (~2,000 users) with multiple
// tabs/devices, 1,000 connections provides generous headroom.
const MAX_CONNECTIONS = parseInt(process.env.WS_MAX_CONNECTIONS || '1000', 10);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

class WebSocketServer {
  private wss?: WsServer;
  private clients: Map<string, Client> = new Map();
  private userClients: Map<string, Set<string>> = new Map(); // userId -> clientIds index for O(1) sendToUser
  private rooms: Map<string, Set<string>> = new Map();
  private heartbeatInterval?: ReturnType<typeof setInterval>;
  private subscriber: IORedis | null = null;
  private db = Database.getInstance();

  init(server: Server): void {
    if (!process.env.ENABLE_WEBSOCKET || process.env.ENABLE_WEBSOCKET !== 'true') {
      winstonLogger.info('WebSocket disabled (set ENABLE_WEBSOCKET=true to enable)');
      return;
    }

    this.wss = new WsServer({
      server,
      verifyClient: async (info: any, callback: any) => {
        try {
          const token = AuthUtils.extractTokenFromHeader(info.req.headers.authorization);

          if (!token) {
            callback(false, 401, 'Authentication required');
            return;
          }

          const payload = AuthUtils.verifyToken(token);
          if (!payload) {
            callback(false, 401, 'Invalid or expired token');
            return;
          }

          const result = await this.db.query('SELECT is_active FROM users WHERE id = $1', [
            payload.userId,
          ]);
          if (!result.rows[0] || result.rows[0].is_active !== true) {
            callback(false, 401, 'User not found or inactive');
            return;
          }

          // Attach userId to the upgrade request for use in connection handler
          (info.req as any).userId = payload.userId;
          callback(true);
        } catch (error) {
          winstonLogger.error('WebSocket verifyClient error', {
            error: error instanceof Error ? error.message : String(error),
          });
          callback(false, 500, 'Authentication error');
        }
      },
    });

    this.wss.on('connection', (ws: WebSocket, req: any) => {
      // Enforce connection limit to prevent resource exhaustion
      if (this.clients.size >= MAX_CONNECTIONS) {
        winstonLogger.warn(
          `WebSocket connection rejected: max connections reached (${MAX_CONNECTIONS})`
        );
        ws.close(1013, 'Maximum connections reached');
        return;
      }

      const clientId = this.generateClientId();
      const userId = (req as any).userId; // Set from verifyClient
      const client: Client = {
        ws,
        userId,
        rooms: new Set(),
        isAlive: true,
        messageCount: 0,
        lastMessageReset: Date.now(),
      };

      this.clients.set(clientId, client);

      // Maintain userId -> clientId index for O(1) sendToUser
      if (userId) {
        if (!this.userClients.has(userId)) {
          this.userClients.set(userId, new Set());
        }
        this.userClients.get(userId)!.add(clientId);
      }

      winstonLogger.info(`WebSocket client connected: ${clientId} (user: ${userId || 'unknown'})`);

      // Handle messages
      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message.toString());
          void this.handleMessage(clientId, data);
        } catch (error) {
          winstonLogger.error('Invalid WebSocket message', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          });
        }
      });

      // Handle ping/pong for heartbeat
      ws.on('pong', () => {
        const client = this.clients.get(clientId);
        if (client) {
          client.isAlive = true;
        }
      });

      // Handle disconnect
      ws.on('close', () => {
        this.handleDisconnect(clientId);
      });

      // Send welcome/auth messages. The connection was already JWT-validated
      // in verifyClient, so clients do not need a post-connect auth message.
      this.send(clientId, 'connected', { clientId });
      if (userId) {
        this.send(clientId, 'authenticated', { userId });
      }
    });

    // Start heartbeat
    this.startHeartbeat();

    // Subscribe to Redis Pub/Sub for multi-instance fan-out
    try {
      this.subscriber = createPubSubConnection();
      this.subscriber.subscribe('checkin:new', REALTIME_DELIVERY_CHANNEL);

      // API-064: Re-subscribe on Redis reconnection to ensure no messages are lost
      this.subscriber.on('ready', () => {
        winstonLogger.info('Redis Pub/Sub reconnected, re-subscribing');
        this.subscriber?.subscribe('checkin:new', REALTIME_DELIVERY_CHANNEL);
      });

      this.subscriber.on('message', (channel: string, message: string) => {
        if (channel === 'checkin:new') {
          try {
            this.handleCheckinPubSub(JSON.parse(message));
          } catch (err) {
            winstonLogger.error('Error handling checkin Pub/Sub message', {
              error: err instanceof Error ? err.message : String(err),
              stack: err instanceof Error ? err.stack : undefined,
            });
          }
          return;
        }

        if (channel === REALTIME_DELIVERY_CHANNEL) {
          try {
            this.handleRealtimeDelivery(JSON.parse(message));
          } catch (err) {
            winstonLogger.error('Error handling realtime delivery Pub/Sub message', {
              error: err instanceof Error ? err.message : String(err),
              stack: err instanceof Error ? err.stack : undefined,
            });
          }
        }
      });
      winstonLogger.info('Redis Pub/Sub subscriber connected for WebSocket fan-out');
    } catch (err) {
      winstonLogger.warn('Redis Pub/Sub not available, WebSocket fan-out disabled', {
        error: (err as Error).message,
      });
      this.subscriber = null;
    }

    winstonLogger.info('WebSocket server initialized');
  }

  /**
   * Handle a check-in event received via Redis Pub/Sub.
   * Fans out 'new_checkin' events to follower WebSocket clients.
   * Detects same-event attendance and sends 'same_event_checkin' events.
   */
  private handleCheckinPubSub(data: {
    type: string;
    checkin: any;
    followerIds: string[];
    eventId: string;
  }): void {
    const { checkin, followerIds, eventId } = data;

    // Get users currently in the event room (for same-event detection)
    const eventRoomUsers = eventId ? this.getRoomUsers(`event:${eventId}`) : [];
    const eventRoomUserSet = new Set(eventRoomUsers);

    for (const followerId of followerIds) {
      // Same-event detection: if follower is in the event room, send special event
      if (eventRoomUserSet.has(followerId)) {
        this.sendToUser(followerId, 'same_event_checkin', {
          ...checkin,
          message: `${checkin.username} is here too!`,
        });
      } else {
        this.sendToUser(followerId, 'new_checkin', checkin);
      }
    }

    if (followerIds.length > 0) {
      winstonLogger.debug(`Fan-out new_checkin to ${followerIds.length} followers`);
    }
  }

  handleRealtimeDelivery(envelope: RealtimeDeliveryEnvelope): number {
    if (!envelope || typeof envelope !== 'object') {
      winstonLogger.warn('Invalid realtime delivery envelope');
      return 0;
    }

    if (envelope.target === 'user') {
      if (envelope.type === WebSocketEvents.DISCONNECTED) {
        const delivered = this.disconnectUser(envelope.userId, envelope.payload?.reason);
        winstonLogger.debug('Disconnected user clients from realtime envelope', {
          target: 'user',
          type: envelope.type,
          delivered,
        });
        return delivered;
      }

      const delivered = this.sendToUser(envelope.userId, envelope.type, envelope.payload);
      winstonLogger.debug('Delivered realtime envelope to user clients', {
        target: 'user',
        type: envelope.type,
        delivered,
      });
      return delivered;
    }

    if (envelope.target === 'room') {
      const delivered = this.broadcastToRoom(envelope.room, envelope.type, envelope.payload);
      winstonLogger.debug('Delivered realtime envelope to room clients', {
        target: 'room',
        type: envelope.type,
        delivered,
      });
      return delivered;
    }

    winstonLogger.warn('Unsupported realtime delivery envelope target', {
      target: (envelope as any).target,
    });
    return 0;
  }

  private async handleMessage(clientId: string, data: any): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) return;

    // API-060: Rate limiting: max 20 messages per 10 seconds (reduced from 100)
    const now = Date.now();
    if (now - client.lastMessageReset > 10000) {
      client.messageCount = 0;
      client.lastMessageReset = now;
    }
    client.messageCount++;
    if (client.messageCount > 20) {
      this.send(clientId, 'error', { message: 'Rate limit exceeded' });
      return;
    }

    const { type, payload } = data;

    // Authentication gate for room operations
    // Security: Prevent unauthenticated clients from joining/leaving rooms
    // This fixes CVSS 8.2 High vulnerability where rooms could be joined without auth
    if (['join_room', 'leave_room'].includes(type)) {
      if (!client.userId) {
        this.send(clientId, 'error', {
          message: 'You must authenticate before joining or leaving rooms',
        });
        return;
      }
    }

    switch (type) {
      case 'auth':
        this.authenticateClient(clientId, payload.userId, payload.token);
        break;

      case 'join_room':
        await this.joinRoom(clientId, payload.room);
        break;

      case 'leave_room':
        this.leaveRoom(clientId, payload.room);
        break;

      case 'ping':
        this.send(clientId, 'pong', {});
        break;

      default:
        winstonLogger.warn(`Unknown WebSocket message type: ${type}`);
    }
  }

  private authenticateClient(clientId: string, userId: string, token: string): void {
    const decoded = AuthUtils.verifyToken(token);

    if (!decoded || decoded.userId !== userId) {
      winstonLogger.warn(
        `Client ${clientId} failed authentication: Invalid token or user mismatch`
      );
      this.send(clientId, 'error', { message: 'Authentication failed' });
      // Close connection on auth failure
      const client = this.clients.get(clientId);
      if (client) {
        client.ws.close(4001, 'Authentication failed');
        this.handleDisconnect(clientId);
      }
      return;
    }

    const client = this.clients.get(clientId);
    if (client) {
      // Update userId -> clientId index if user was not already set by verifyClient
      if (!client.userId) {
        client.userId = userId;
        if (!this.userClients.has(userId)) {
          this.userClients.set(userId, new Set());
        }
        this.userClients.get(userId)!.add(clientId);
      }
      this.send(clientId, 'authenticated', { userId });
      winstonLogger.info(`Client ${clientId} authenticated as user ${userId}`);
    }
  }

  private async joinRoom(clientId: string, room: string): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client || !client.userId) return;

    const validation = await this.validateRoom(room, client.userId);
    if (!validation.valid) {
      this.send(clientId, 'error', { message: validation.message });
      return;
    }

    client.rooms.add(room);

    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Set());
    }
    this.rooms.get(room)!.add(clientId);

    this.send(clientId, 'joined_room', { room });
    winstonLogger.info(`Client ${clientId} joined room: ${room}`);
  }

  private async validateRoom(
    room: unknown,
    authenticatedUserId: string
  ): Promise<{ valid: boolean; message: string }> {
    if (typeof room !== 'string' || room.length === 0) {
      return { valid: false, message: 'Invalid room name' };
    }

    const separatorIndex = room.indexOf(':');
    if (separatorIndex <= 0 || separatorIndex !== room.lastIndexOf(':')) {
      return { valid: false, message: 'Invalid room name' };
    }

    const prefix = room.substring(0, separatorIndex);
    const id = room.substring(separatorIndex + 1);

    if (!['event', 'venue', 'user', 'checkin'].includes(prefix)) {
      return { valid: false, message: 'Invalid room name' };
    }

    if (!UUID_PATTERN.test(id)) {
      return { valid: false, message: `Invalid ${prefix} room id` };
    }

    if (prefix === 'user' && id !== authenticatedUserId) {
      return { valid: false, message: "Cannot join another user's room" };
    }

    if (prefix === 'user') {
      return { valid: true, message: 'Valid room' };
    }

    try {
      const allowed = await this.hasRoomAccess(prefix, id, authenticatedUserId);
      if (!allowed) {
        return { valid: false, message: 'Not authorized for this room' };
      }
    } catch (error) {
      winstonLogger.error('WebSocket room access check failed', {
        room,
        userId: authenticatedUserId,
        error: error instanceof Error ? error.message : String(error),
      });
      return { valid: false, message: 'Room access check failed' };
    }

    return { valid: true, message: 'Valid room' };
  }

  private async hasRoomAccess(
    prefix: string,
    resourceId: string,
    authenticatedUserId: string
  ): Promise<boolean> {
    if (prefix === 'event') {
      const result = await this.db.query(
        `SELECT 1
         FROM event_rsvps
         WHERE user_id = $1 AND event_id = $2
         UNION
         SELECT 1
         FROM checkins
         WHERE user_id = $1 AND event_id = $2
         LIMIT 1`,
        [authenticatedUserId, resourceId]
      );
      return result.rows.length > 0;
    }

    if (prefix === 'venue') {
      const result = await this.db.query(
        `SELECT 1
         FROM checkins
         WHERE user_id = $1 AND venue_id = $2
         UNION
         SELECT 1
         FROM event_rsvps er
         INNER JOIN events e ON e.id = er.event_id
         WHERE er.user_id = $1 AND e.venue_id = $2
         LIMIT 1`,
        [authenticatedUserId, resourceId]
      );
      return result.rows.length > 0;
    }

    if (prefix === 'checkin') {
      const result = await this.db.query(
        `SELECT 1
         FROM checkins c
         WHERE c.id = $2
           AND (
             c.user_id = $1
             OR EXISTS (
               SELECT 1 FROM user_followers uf
               WHERE uf.follower_id = $1 AND uf.following_id = c.user_id
             )
             OR (
               c.event_id IS NOT NULL
               AND EXISTS (
                 SELECT 1 FROM event_rsvps er
                 WHERE er.user_id = $1 AND er.event_id = c.event_id
               )
             )
           )
           AND NOT EXISTS (
             SELECT 1 FROM user_blocks ub
             WHERE (ub.blocker_id = $1 AND ub.blocked_id = c.user_id)
                OR (ub.blocker_id = c.user_id AND ub.blocked_id = $1)
           )
         LIMIT 1`,
        [authenticatedUserId, resourceId]
      );
      return result.rows.length > 0;
    }

    return false;
  }

  private leaveRoom(clientId: string, room: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.rooms.delete(room);

    const roomClients = this.rooms.get(room);
    if (roomClients) {
      roomClients.delete(clientId);
      if (roomClients.size === 0) {
        this.rooms.delete(room);
      }
    }

    this.send(clientId, 'left_room', { room });
  }

  private handleDisconnect(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Remove from userId -> clientId index
    if (client.userId) {
      const userSet = this.userClients.get(client.userId);
      if (userSet) {
        userSet.delete(clientId);
        if (userSet.size === 0) {
          this.userClients.delete(client.userId);
        }
      }
    }

    // Leave all rooms
    client.rooms.forEach((room) => {
      const roomClients = this.rooms.get(room);
      if (roomClients) {
        roomClients.delete(clientId);
        if (roomClients.size === 0) {
          this.rooms.delete(room);
        }
      }
    });

    this.clients.delete(clientId);
    winstonLogger.info(`WebSocket client disconnected: ${clientId}`);
  }

  /**
   * Send message to specific client
   */
  send(clientId: string, type: string, payload: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify({ type, payload }));
    }
  }

  /**
   * Send message to specific user (all their connections).
   * Uses O(1) userId index instead of O(N) client iteration.
   */
  sendToUser(userId: string, type: string, payload: any): number {
    const clientIds = this.userClients.get(userId);
    if (!clientIds) return 0;
    let delivered = 0;
    for (const clientId of clientIds) {
      this.send(clientId, type, payload);
      delivered++;
    }
    return delivered;
  }

  /**
   * Force-close every live socket for a user (ban / deactivate).
   */
  disconnectUser(userId: string, reason: string = 'account_banned'): number {
    const clientIds = this.userClients.get(userId);
    if (!clientIds || clientIds.size === 0) return 0;

    const ids = Array.from(clientIds);
    let closed = 0;
    for (const clientId of ids) {
      this.send(clientId, WebSocketEvents.DISCONNECTED, { reason });
      const client = this.clients.get(clientId);
      if (client) {
        client.ws.close(4003, 'Account banned');
      }
      this.handleDisconnect(clientId);
      closed++;
    }
    return closed;
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcast(type: string, payload: any): void {
    for (const clientId of this.clients.keys()) {
      this.send(clientId, type, payload);
    }
  }

  /**
   * Broadcast message to all clients in a room
   */
  broadcastToRoom(room: string, type: string, payload: any): number {
    const roomClients = this.rooms.get(room);
    if (!roomClients) return 0;

    let delivered = 0;
    for (const clientId of roomClients) {
      this.send(clientId, type, payload);
      delivered++;
    }
    return delivered;
  }

  /**
   * Get all users in a room
   */
  getRoomUsers(room: string): string[] {
    const roomClients = this.rooms.get(room);
    if (!roomClients) return [];

    const userIds: string[] = [];
    for (const clientId of roomClients) {
      const client = this.clients.get(clientId);
      if (client?.userId) {
        userIds.push(client.userId);
      }
    }

    return [...new Set(userIds)]; // Remove duplicates
  }

  /**
   * Heartbeat to detect disconnected clients
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      for (const [clientId, client] of this.clients.entries()) {
        if (!client.isAlive) {
          // Client didn't respond to last ping, terminate
          client.ws.terminate();
          this.handleDisconnect(clientId);
          continue;
        }

        client.isAlive = false;
        client.ws.ping();
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Get connection stats
   */
  getStats(): {
    totalClients: number;
    authenticatedClients: number;
    totalRooms: number;
  } {
    let authenticatedClients = 0;
    for (const client of this.clients.values()) {
      if (client.userId) {
        authenticatedClients++;
      }
    }

    return {
      totalClients: this.clients.size,
      authenticatedClients,
      totalRooms: this.rooms.size,
    };
  }

  /**
   * Close WebSocket server
   */
  close(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.subscriber?.quit();
    this.subscriber = null;

    this.wss?.close();

    winstonLogger.info('WebSocket server closed');
  }
}

// Export singleton instance
export const websocket = new WebSocketServer();

// Export convenience methods
export const initWebSocket = (server: Server) => websocket.init(server);
export const broadcast = (type: string, payload: any) => websocket.broadcast(type, payload);
export const sendToUser = (userId: string, type: string, payload: any) =>
  websocket.sendToUser(userId, type, payload);
export const disconnectUser = (userId: string, reason?: string) =>
  websocket.disconnectUser(userId, reason);
export const broadcastToRoom = (room: string, type: string, payload: any) =>
  websocket.broadcastToRoom(room, type, payload);
export const getRoomUsers = (room: string) => websocket.getRoomUsers(room);
export const getWebSocketStats = () => websocket.getStats();

// Event types for type safety
export const WebSocketEvents = {
  // Connection
  CONNECTED: 'connected',
  AUTHENTICATED: 'authenticated',
  DISCONNECTED: 'disconnected',

  // Rooms
  JOINED_ROOM: 'joined_room',
  LEFT_ROOM: 'left_room',

  // Real-time updates
  NEW_CHECKIN: 'new_checkin',
  SAME_EVENT_CHECKIN: 'same_event_checkin',
  NEW_FOLLOWER: 'new_follower',
  NEW_COMMENT: 'new_comment',
  NEW_TOAST: 'new_toast',
  TOAST_REMOVED: 'toast_removed',
  COMMENT_DELETED: 'comment_deleted',
  BADGE_EARNED: 'badge_earned',

  // Typing indicators
  USER_TYPING: 'user_typing',
  USER_STOPPED_TYPING: 'user_stopped_typing',

  // Status
  USER_ONLINE: 'user_online',
  USER_OFFLINE: 'user_offline',
};
