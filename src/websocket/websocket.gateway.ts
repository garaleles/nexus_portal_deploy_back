import {
  WebSocketGateway as WSGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

interface ConnectedClient {
  socket: Socket;
  userId: string;
  role: string;
  tenantId?: string;
}

@WSGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/',
})
export class WebSocketService implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger = new Logger('WebSocketGateway');
  private connectedClients = new Map<string, ConnectedClient>();

  // Connection handling
  async handleConnection(client: Socket) {
    try {
      // Extract auth info from handshake
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');

      // For development, we'll allow connections without token validation
      // In production, you should implement proper JWT validation
      let userInfo = {
        id: 'admin-user',
        role: 'platform_admin',
        tenantId: null
      };

      // If token exists, try to extract info (simplified)
      if (token) {
        userInfo = await this.validateAndExtractUserInfo(token);
      }

      this.connectedClients.set(client.id, {
        socket: client,
        userId: userInfo.id,
        role: userInfo.role,
        tenantId: userInfo.tenantId,
      });

      // Join user to their specific room
      await client.join(`user:${userInfo.id}`);

      // Join role-specific rooms
      if (userInfo.role === 'platform_admin') {
        await client.join('admin-room');
        await client.join('admin-notifications');
      } else if (userInfo.role === 'tenant_admin' && userInfo.tenantId) {
        await client.join(`tenant:${userInfo.tenantId}`);
      }

      this.logger.log(`Client connected: ${client.id} - User: ${userInfo.id} - Role: ${userInfo.role}`);

      // Send connection confirmation
      client.emit('connected', {
        message: 'WebSocket connection established',
        userId: userInfo.id,
        role: userInfo.role,
        connectedAt: new Date().toISOString(),
      });

    } catch (error) {
      this.logger.error(`Connection error for client ${client.id}:`, error);
      // In development, don't disconnect on error
      // client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const clientInfo = this.connectedClients.get(client.id);
    if (clientInfo) {
      this.logger.log(`Client disconnected: ${client.id} - User: ${clientInfo.userId}`);
      this.connectedClients.delete(client.id);
    }
  }

  // Support-related events
  @SubscribeMessage('join-support-room')
  async handleJoinSupportRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { supportId: string },
  ) {
    const clientInfo = this.connectedClients.get(client.id);
    if (!clientInfo) return;

    await client.join(`support:${data.supportId}`);
    this.logger.log(`Client ${client.id} joined support room: ${data.supportId}`);

    client.emit('joined-support-room', { supportId: data.supportId });
  }

  @SubscribeMessage('leave-support-room')
  async handleLeaveSupportRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { supportId: string },
  ) {
    await client.leave(`support:${data.supportId}`);
    this.logger.log(`Client ${client.id} left support room: ${data.supportId}`);
  }

  // Admin notifications
  @SubscribeMessage('join-admin-notifications')
  async handleJoinAdminNotifications(@ConnectedSocket() client: Socket) {
    const clientInfo = this.connectedClients.get(client.id);
    if (clientInfo?.role === 'platform_admin') {
      await client.join('admin-notifications');
      client.emit('joined-admin-notifications');
    }
  }

  // Public methods to emit events from services

  // Notify about new support ticket
  async notifyNewSupportTicket(supportTicket: any) {
    this.server.to('admin-room').emit('new-support-ticket', {
      type: 'new_support_ticket',
      data: supportTicket,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`New support ticket notification sent: ${supportTicket.id}`);
  }

  // Notify about new support message
  async notifyNewSupportMessage(supportId: string, message: any, senderRole: string) {
    // Notify support room participants
    this.server.to(`support:${supportId}`).emit('new-support-message', {
      type: 'new_support_message',
      supportId,
      message,
      senderRole,
      timestamp: new Date().toISOString(),
    });

    // Notify admins if message is from tenant
    if (senderRole === 'tenant') {
      this.server.to('admin-room').emit('support-message-notification', {
        type: 'support_message_notification',
        supportId,
        message,
        timestamp: new Date().toISOString(),
      });
    }

    // Notify tenant if message is from admin
    if (senderRole === 'admin' && message.tenantId) {
      this.server.to(`tenant:${message.tenantId}`).emit('support-response-notification', {
        type: 'support_response_notification',
        supportId,
        message,
        timestamp: new Date().toISOString(),
      });
    }

    this.logger.log(`Support message notification sent for support: ${supportId}`);
  }

  // Notify about support status change
  async notifySupportStatusChange(supportId: string, supportData: any) {
    // Notify support room participants
    this.server.to(`support:${supportId}`).emit('support-status-changed', {
      type: 'support_status_changed',
      supportId,
      data: supportData,
      timestamp: new Date().toISOString(),
    });

    // Notify tenant about status change
    if (supportData.tenantId) {
      this.server.to(`tenant:${supportData.tenantId}`).emit('support-status-notification', {
        type: 'support_status_notification',
        supportId,
        status: supportData.status,
        timestamp: new Date().toISOString(),
      });
    }

    this.logger.log(`Support status change notification sent: ${supportId} -> ${supportData.status}`);
  }

  // Admin-specific notifications
  async notifyAdminSupportStats(stats: any) {
    this.server.to('admin-room').emit('support-stats-update', {
      type: 'support_stats_update',
      data: stats,
      timestamp: new Date().toISOString(),
    });
  }

  // General notification method
  async sendNotificationToUser(userId: string, notification: any) {
    this.server.to(`user:${userId}`).emit('notification', {
      ...notification,
      timestamp: new Date().toISOString(),
    });
  }

  async sendNotificationToTenant(tenantId: string, notification: any) {
    this.server.to(`tenant:${tenantId}`).emit('notification', {
      ...notification,
      timestamp: new Date().toISOString(),
    });
  }

  async sendNotificationToAdmins(notification: any) {
    this.server.to('admin-room').emit('notification', {
      ...notification,
      timestamp: new Date().toISOString(),
    });
  }

  // Utility methods
  private async validateAndExtractUserInfo(token: string): Promise<any> {
    try {
      // For development, always return admin user
      // In production, implement proper JWT validation
      return {
        id: 'admin-user-123',
        role: 'platform_admin',
        tenantId: null,
        email: 'admin@business-portal.com'
      };
    } catch (error) {
      this.logger.error('Token validation error:', error);
      // Return admin user even on error for development
      return {
        id: 'admin-user-123',
        role: 'platform_admin',
        tenantId: null,
        email: 'admin@business-portal.com'
      };
    }
  }

  // Get connected clients count
  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  // Get connected admins count
  getConnectedAdminsCount(): number {
    return Array.from(this.connectedClients.values())
      .filter(client => client.role === 'platform_admin').length;
  }

  // Get connected tenants count
  getConnectedTenantsCount(): number {
    return Array.from(this.connectedClients.values())
      .filter(client => client.role === 'tenant_admin').length;
  }
} 