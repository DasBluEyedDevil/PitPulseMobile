import { createServer, Server } from 'http';
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

const USER_123 = '11111111-1111-4111-8111-111111111111';
const USER_456 = '22222222-2222-4222-8222-222222222222';
const EVENT_ID = '33333333-3333-4333-8333-333333333333';
const VENUE_ID = '44444444-4444-4444-8444-444444444444';
const CHECKIN_ID = '55555555-5555-4555-8555-555555555555';
const mockDbQuery = jest.fn<(...args: unknown[]) => Promise<any>>();

jest.mock('../../utils/auth', () => ({
  AuthUtils: {
    verifyToken: jest.fn((token: string) => {
      if (token === 'valid-token') {
        return { userId: USER_123, email: 'test@example.com', username: 'testuser' };
      }
      if (token === 'valid-token-user-456') {
        return { userId: USER_456, email: 'other@example.com', username: 'otheruser' };
      }
      return null;
    }),
    extractTokenFromHeader: jest.fn((header?: string) => {
      if (!header || !header.startsWith('Bearer ')) return null;
      return header.substring(7);
    }),
  },
}));

jest.mock('../../config/redis', () => ({
  createPubSubConnection: jest.fn(() => {
    throw new Error('Redis disabled in websocket tests');
  }),
}));

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    getInstance: () => ({
      query: mockDbQuery,
    }),
  },
}));

import { websocket } from '../../utils/websocket';

function createMockWs(sentMessages: any[] = []): any {
  return {
    readyState: 1,
    send: jest.fn((data: string) => sentMessages.push(JSON.parse(data))),
    close: jest.fn(),
    ping: jest.fn(),
    terminate: jest.fn(),
    on: jest.fn(),
  };
}

function createClient(ws: any, userId?: string): any {
  return {
    ws,
    userId,
    rooms: new Set<string>(),
    isAlive: true,
    messageCount: 0,
    lastMessageReset: Date.now(),
  };
}

describe('WebSocket Authentication', () => {
  describe('upgrade authentication acknowledgement', () => {
    let httpServer: Server;
    const originalEnableWebsocket = process.env.ENABLE_WEBSOCKET;

    beforeEach(() => {
      mockDbQuery.mockReset();
    });

    afterEach(() => {
      websocket.close();
      httpServer?.close();
      if (originalEnableWebsocket === undefined) {
        delete process.env.ENABLE_WEBSOCKET;
      } else {
        process.env.ENABLE_WEBSOCKET = originalEnableWebsocket;
      }
    });

    test('valid Authorization header token is verified before upgrade and connection receives connected plus authenticated', async () => {
      process.env.ENABLE_WEBSOCKET = 'true';
      httpServer = createServer();
      websocket.init(httpServer);

      const wss = (websocket as any).wss;
      const verifyClient = wss.options.verifyClient;
      const callback = jest.fn();
      const req: any = {
        url: '/ws',
        headers: { host: 'localhost', authorization: 'Bearer valid-token' },
      };

      mockDbQuery.mockResolvedValueOnce({ rows: [{ is_active: true }] });
      await verifyClient({ req }, callback);

      expect(callback).toHaveBeenCalledWith(true);
      expect(req.userId).toBe(USER_123);
      expect(mockDbQuery).toHaveBeenCalledWith('SELECT is_active FROM users WHERE id = $1', [
        USER_123,
      ]);

      const sentMessages: any[] = [];
      const mockWs = createMockWs(sentMessages);

      wss.emit('connection', mockWs, req);

      expect(sentMessages.map((message) => message.type)).toEqual(['connected', 'authenticated']);
      expect(sentMessages[1].payload.userId).toBe(USER_123);
    });

    test('missing, query-string, and invalid tokens are rejected before upgrade', async () => {
      process.env.ENABLE_WEBSOCKET = 'true';
      httpServer = createServer();
      websocket.init(httpServer);

      const verifyClient = (websocket as any).wss.options.verifyClient;
      const missingCallback = jest.fn();
      const queryCallback = jest.fn();
      const invalidCallback = jest.fn();

      await verifyClient({ req: { url: '/ws', headers: { host: 'localhost' } } }, missingCallback);
      await verifyClient(
        { req: { url: '/ws?token=valid-token', headers: { host: 'localhost' } } },
        queryCallback
      );
      await verifyClient(
        {
          req: {
            url: '/ws',
            headers: { host: 'localhost', authorization: 'Bearer invalid-token' },
          },
        },
        invalidCallback
      );

      expect(missingCallback).toHaveBeenCalledWith(false, 401, 'Authentication required');
      expect(queryCallback).toHaveBeenCalledWith(false, 401, 'Authentication required');
      expect(invalidCallback).toHaveBeenCalledWith(false, 401, 'Invalid or expired token');
      expect(mockDbQuery).not.toHaveBeenCalled();
    });

    test('inactive users are rejected before upgrade', async () => {
      process.env.ENABLE_WEBSOCKET = 'true';
      httpServer = createServer();
      websocket.init(httpServer);

      const verifyClient = (websocket as any).wss.options.verifyClient;
      const inactiveCallback = jest.fn();
      const missingUserCallback = jest.fn();

      mockDbQuery.mockResolvedValueOnce({ rows: [{ is_active: false }] });
      await verifyClient(
        {
          req: {
            url: '/ws',
            headers: { host: 'localhost', authorization: 'Bearer valid-token' },
          },
        },
        inactiveCallback
      );

      mockDbQuery.mockResolvedValueOnce({ rows: [] });
      await verifyClient(
        {
          req: {
            url: '/ws',
            headers: { host: 'localhost', authorization: 'Bearer valid-token' },
          },
        },
        missingUserCallback
      );

      expect(inactiveCallback).toHaveBeenCalledWith(false, 401, 'User not found or inactive');
      expect(missingUserCallback).toHaveBeenCalledWith(false, 401, 'User not found or inactive');
    });
  });

  describe('post-connect auth compatibility and room gate', () => {
    let sentMessages: any[];
    let mockWs: any;
    let mockClient: any;

    beforeEach(() => {
      jest.clearAllMocks();
      mockDbQuery.mockReset();
      sentMessages = [];
      mockWs = createMockWs(sentMessages);
      mockClient = createClient(mockWs);
    });

    test('rejects join_room before authentication', async () => {
      const clientsMap = (websocket as any).clients as Map<string, any>;
      const clientId = 'test-client-1';
      clientsMap.set(clientId, mockClient);

      try {
        await (websocket as any).handleMessage(clientId, {
          type: 'join_room',
          payload: { room: `venue:${VENUE_ID}` },
        });

        const errorMsg = sentMessages.find((message) => message.type === 'error');
        expect(errorMsg).toBeDefined();
        expect(errorMsg.payload.message).toContain('authenticate');
        expect(mockClient.rooms.has(`venue:${VENUE_ID}`)).toBe(false);
      } finally {
        clientsMap.delete(clientId);
      }
    });

    test('keeps post-connect auth handler for compatibility', () => {
      const clientsMap = (websocket as any).clients as Map<string, any>;
      const userClientsMap = (websocket as any).userClients as Map<string, Set<string>>;
      const clientId = 'test-client-2';
      clientsMap.set(clientId, mockClient);

      try {
        (websocket as any).handleMessage(clientId, {
          type: 'auth',
          payload: { userId: USER_123, token: 'valid-token' },
        });

        const authMsg = sentMessages.find((message) => message.type === 'authenticated');
        expect(authMsg).toBeDefined();
        expect(authMsg.payload.userId).toBe(USER_123);
        expect(mockClient.userId).toBe(USER_123);
      } finally {
        clientsMap.delete(clientId);
        userClientsMap.delete(USER_123);
      }
    });

    test('rejects invalid post-connect auth token and user mismatch', () => {
      const clientsMap = (websocket as any).clients as Map<string, any>;
      const invalidClientId = 'test-invalid-auth';
      const mismatchClientId = 'test-mismatch-auth';
      clientsMap.set(invalidClientId, createClient(mockWs));
      clientsMap.set(mismatchClientId, createClient(mockWs));

      try {
        (websocket as any).handleMessage(invalidClientId, {
          type: 'auth',
          payload: { userId: USER_123, token: 'invalid-token' },
        });
        (websocket as any).handleMessage(mismatchClientId, {
          type: 'auth',
          payload: { userId: USER_456, token: 'valid-token' },
        });

        const errorMessages = sentMessages.filter((message) => message.type === 'error');
        expect(errorMessages).toHaveLength(2);
        expect(
          errorMessages.every((message) => message.payload.message === 'Authentication failed')
        ).toBe(true);
      } finally {
        clientsMap.delete(invalidClientId);
        clientsMap.delete(mismatchClientId);
      }
    });
  });

  describe('strict room validation and scoping', () => {
    let sentMessages: any[];
    let mockWs: any;
    let mockClient: any;

    beforeEach(() => {
      mockDbQuery.mockReset();
      sentMessages = [];
      mockWs = createMockWs(sentMessages);
      mockClient = createClient(mockWs, USER_123);
    });

    test.each<[string, string]>([
      ['event room', `event:${EVENT_ID}`],
      ['venue room', `venue:${VENUE_ID}`],
      ['checkin room', `checkin:${CHECKIN_ID}`],
      ['own user room', `user:${USER_123}`],
    ])('allows joining valid %s', async (_label, room) => {
      const clientsMap = (websocket as any).clients as Map<string, any>;
      const roomsMap = (websocket as any).rooms as Map<string, Set<string>>;
      const clientId = `test-${room}`;
      clientsMap.set(clientId, mockClient);

      try {
        if (!room.startsWith('user:')) {
          mockDbQuery.mockResolvedValueOnce({ rows: [{ allowed: 1 }] });
        }

        await (websocket as any).handleMessage(clientId, {
          type: 'join_room',
          payload: { room },
        });

        const joinedMsg = sentMessages.find((message) => message.type === 'joined_room');
        expect(joinedMsg).toBeDefined();
        expect(joinedMsg.payload.room).toBe(room);
        expect(mockClient.rooms.has(room)).toBe(true);
      } finally {
        clientsMap.delete(clientId);
        roomsMap.delete(room);
      }
    });

    test.each<[string, string, string]>([
      ['unknown prefix', 'admin:secret', 'Invalid room name'],
      ['missing prefix', 'some-room-name', 'Invalid room name'],
      ['malformed separators', `event:${EVENT_ID}:extra`, 'Invalid room name'],
      ['event non-UUID', 'event:abc-123', 'Invalid event room id'],
      ['venue non-UUID', 'venue:xyz-789', 'Invalid venue room id'],
      ['checkin non-UUID', 'checkin:not-a-uuid', 'Invalid checkin room id'],
      ['user non-UUID', 'user:user-123', 'Invalid user room id'],
    ])('rejects %s', async (_label, room, expectedMessage) => {
      const clientsMap = (websocket as any).clients as Map<string, any>;
      const clientId = `test-invalid-${room}`;
      clientsMap.set(clientId, mockClient);

      try {
        await (websocket as any).handleMessage(clientId, {
          type: 'join_room',
          payload: { room },
        });

        const errorMsg = sentMessages.find((message) => message.type === 'error');
        expect(errorMsg).toBeDefined();
        expect(errorMsg.payload.message).toBe(expectedMessage);
        expect(mockClient.rooms.has(room)).toBe(false);
      } finally {
        clientsMap.delete(clientId);
      }
    });

    test('rejects cross-user user room', async () => {
      const clientsMap = (websocket as any).clients as Map<string, any>;
      const clientId = 'test-cross-user-room';
      const room = `user:${USER_456}`;
      clientsMap.set(clientId, mockClient);

      try {
        await (websocket as any).handleMessage(clientId, {
          type: 'join_room',
          payload: { room },
        });

        const errorMsg = sentMessages.find((message) => message.type === 'error');
        expect(errorMsg).toBeDefined();
        expect(errorMsg.payload.message).toBe("Cannot join another user's room");
        expect(mockClient.rooms.has(room)).toBe(false);
      } finally {
        clientsMap.delete(clientId);
      }
    });

    test('rejects non-user rooms when the authenticated user lacks resource access', async () => {
      const clientsMap = (websocket as any).clients as Map<string, any>;
      const clientId = 'test-unauthorized-room';
      const room = `checkin:${CHECKIN_ID}`;
      clientsMap.set(clientId, mockClient);
      mockDbQuery.mockResolvedValueOnce({ rows: [] });

      try {
        await (websocket as any).handleMessage(clientId, {
          type: 'join_room',
          payload: { room },
        });

        const errorMsg = sentMessages.find((message) => message.type === 'error');
        expect(errorMsg).toBeDefined();
        expect(errorMsg.payload.message).toBe('Not authorized for this room');
        expect(mockClient.rooms.has(room)).toBe(false);
      } finally {
        clientsMap.delete(clientId);
      }
    });

    test('allows leaving a room after authentication', () => {
      const clientsMap = (websocket as any).clients as Map<string, any>;
      const roomsMap = (websocket as any).rooms as Map<string, Set<string>>;
      const clientId = 'test-leave-room';
      const room = `venue:${VENUE_ID}`;
      mockClient.rooms.add(room);
      clientsMap.set(clientId, mockClient);
      roomsMap.set(room, new Set([clientId]));

      try {
        (websocket as any).handleMessage(clientId, {
          type: 'leave_room',
          payload: { room },
        });

        const leftMsg = sentMessages.find((message) => message.type === 'left_room');
        expect(leftMsg).toBeDefined();
        expect(leftMsg.payload.room).toBe(room);
        expect(mockClient.rooms.has(room)).toBe(false);
      } finally {
        clientsMap.delete(clientId);
        roomsMap.delete(room);
      }
    });
  });

  describe('userClients index and realtime envelope delivery', () => {
    let sentMessages: any[];
    let mockWs: any;

    beforeEach(() => {
      sentMessages = [];
      mockWs = createMockWs(sentMessages);
    });

    test('sendToUser delivers to correct user via index', () => {
      const clientsMap = (websocket as any).clients as Map<string, any>;
      const userClientsMap = (websocket as any).userClients as Map<string, Set<string>>;
      const clientId = 'test-send-client';

      clientsMap.set(clientId, createClient(mockWs, USER_123));
      userClientsMap.set(USER_123, new Set([clientId]));

      try {
        const delivered = websocket.sendToUser(USER_123, 'test_event', { data: 'hello' });

        expect(delivered).toBe(1);
        expect(sentMessages).toEqual([{ type: 'test_event', payload: { data: 'hello' } }]);
      } finally {
        clientsMap.delete(clientId);
        userClientsMap.delete(USER_123);
      }
    });

    test('handleDisconnect removes client from userClients index', () => {
      const clientsMap = (websocket as any).clients as Map<string, any>;
      const userClientsMap = (websocket as any).userClients as Map<string, Set<string>>;
      const clientId = 'test-disconnect-client';

      clientsMap.set(clientId, createClient(mockWs, USER_123));
      userClientsMap.set(USER_123, new Set([clientId]));

      (websocket as any).handleDisconnect(clientId);

      expect(clientsMap.has(clientId)).toBe(false);
      expect(userClientsMap.has(USER_123)).toBe(false);
    });

    test('delivers user-targeted realtime envelopes to authenticated user clients', () => {
      const clientsMap = (websocket as any).clients as Map<string, any>;
      const userClientsMap = (websocket as any).userClients as Map<string, Set<string>>;
      const clientId = 'test-realtime-user';

      clientsMap.set(clientId, createClient(mockWs, USER_123));
      userClientsMap.set(USER_123, new Set([clientId]));

      try {
        const delivered = websocket.handleRealtimeDelivery({
          target: 'user',
          userId: USER_123,
          type: 'badge_earned',
          payload: { badgeId: 'badge-1' },
        });

        expect(delivered).toBe(1);
        expect(sentMessages).toEqual([{ type: 'badge_earned', payload: { badgeId: 'badge-1' } }]);
      } finally {
        clientsMap.delete(clientId);
        userClientsMap.delete(USER_123);
      }
    });

    test('disconnectUser sends disconnected envelope and closes the user sockets', () => {
      const clientsMap = (websocket as any).clients as Map<string, any>;
      const userClientsMap = (websocket as any).userClients as Map<string, Set<string>>;
      const clientId = 'test-disconnect-user';
      const client = createClient(mockWs, USER_123);

      clientsMap.set(clientId, client);
      userClientsMap.set(USER_123, new Set([clientId]));

      const closed = websocket.disconnectUser(USER_123, 'account_banned');

      expect(closed).toBe(1);
      expect(sentMessages).toEqual([
        { type: 'disconnected', payload: { reason: 'account_banned' } },
      ]);
      expect(mockWs.close).toHaveBeenCalledWith(4003, 'Account banned');
      expect(clientsMap.has(clientId)).toBe(false);
      expect(userClientsMap.has(USER_123)).toBe(false);
    });

    test('handleRealtimeDelivery disconnects user-targeted disconnected envelopes', () => {
      const clientsMap = (websocket as any).clients as Map<string, any>;
      const userClientsMap = (websocket as any).userClients as Map<string, Set<string>>;
      const clientId = 'test-realtime-disconnect';
      const client = createClient(mockWs, USER_123);

      clientsMap.set(clientId, client);
      userClientsMap.set(USER_123, new Set([clientId]));

      const delivered = websocket.handleRealtimeDelivery({
        target: 'user',
        userId: USER_123,
        type: 'disconnected',
        payload: { reason: 'account_banned' },
      });

      expect(delivered).toBe(1);
      expect(sentMessages).toEqual([
        { type: 'disconnected', payload: { reason: 'account_banned' } },
      ]);
      expect(mockWs.close).toHaveBeenCalledWith(4003, 'Account banned');
      expect(clientsMap.has(clientId)).toBe(false);
    });

    test('delivers room-targeted realtime envelopes to room clients', () => {
      const clientsMap = (websocket as any).clients as Map<string, any>;
      const roomsMap = (websocket as any).rooms as Map<string, Set<string>>;
      const clientId = 'test-realtime-room';
      const room = `checkin:${CHECKIN_ID}`;
      const client = createClient(mockWs, USER_123);
      client.rooms.add(room);

      clientsMap.set(clientId, client);
      roomsMap.set(room, new Set([clientId]));

      try {
        const delivered = websocket.handleRealtimeDelivery({
          target: 'room',
          room,
          type: 'new_comment',
          payload: { checkinId: CHECKIN_ID },
        });

        expect(delivered).toBe(1);
        expect(sentMessages).toEqual([{ type: 'new_comment', payload: { checkinId: CHECKIN_ID } }]);
      } finally {
        clientsMap.delete(clientId);
        roomsMap.delete(room);
      }
    });
  });

  describe('Rate limiting still works with auth check', () => {
    test('enforces rate limit before auth check', () => {
      const sentMessages: any[] = [];
      const mockWs = createMockWs(sentMessages);
      const mockClient = createClient(mockWs, USER_123);
      const clientsMap = (websocket as any).clients as Map<string, any>;
      const clientId = 'test-client-rate-limit';

      mockClient.messageCount = 101;
      clientsMap.set(clientId, mockClient);

      try {
        (websocket as any).handleMessage(clientId, {
          type: 'join_room',
          payload: { room: `venue:${VENUE_ID}` },
        });

        const errorMsg = sentMessages.find((message) => message.type === 'error');
        expect(errorMsg).toBeDefined();
        expect(errorMsg.payload.message).toContain('Rate limit');
      } finally {
        clientsMap.delete(clientId);
      }
    });
  });
});
