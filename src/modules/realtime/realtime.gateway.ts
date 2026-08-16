import {
  Logger,
  OnModuleInit,
  UseFilters,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { CacheService } from '../cache/cache.service';
import { DashboardsService } from '../dashboards/dashboards.service';
import { SensorsService } from '../sensors/sensors.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/realtime',
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
    private readonly sensorsService: SensorsService,
    private readonly dashboardsService: DashboardsService,
  ) {}

  onModuleInit() {
    // Subscribe to Dragonfly Pub/Sub for sensor events across all instances
    this.cacheService.psubscribe('sensor:*:data', (pattern, channel, message) => {
      try {
        const payload = JSON.parse(message);
        const sensorId = payload.sensorId;

        // Emit to clients listening to this specific sensor room
        if (this.server) {
          this.server.to(`sensor:${sensorId}`).emit('sensor:data', payload);
        }
      } catch (err) {
        this.logger.error(`Error parsing Dragonfly pubsub message: ${err.message}`);
      }
    });

    this.logger.log('RealtimeGateway initialized and listening to Dragonfly Pub/Sub');
  }

  async handleConnection(socket: Socket) {
    try {
      // Extract JWT from handshake auth or headers
      const authHeader =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization ||
        (socket.handshake.query?.token as string);

      if (!authHeader) {
        this.logger.warn(`Unauthorized WebSocket connection attempt: ${socket.id}`);
        socket.disconnect();
        return;
      }

      const token = authHeader.replace(/^Bearer\s+/i, '');
      const secret = this.configService.get<string>('auth.jwtSecret');
      const payload = this.jwtService.verify(token, { secret });

      socket.data.user = payload;
      this.logger.log(`Client connected: ${socket.id} (User: ${payload.sub} - ${payload.email})`);
    } catch (error) {
      this.logger.warn(`WS Auth failed for client ${socket.id}: ${error.message}`);
      socket.disconnect();
    }
  }

  handleDisconnect(socket: Socket) {
    this.logger.log(`Client disconnected: ${socket.id}`);
  }

  @SubscribeMessage('subscribe:sensor')
  async handleSubscribeSensor(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { sensorId: string },
  ) {
    try {
      const userId = socket.data.user?.sub;
      if (!userId || !data?.sensorId) {
        return { success: false, message: 'Invalid payload or unauthenticated' };
      }

      // Verify user has access to this sensor
      await this.sensorsService.verifySensorAccess(data.sensorId, userId);

      const roomName = `sensor:${data.sensorId}`;
      await socket.join(roomName);
      this.logger.log(`Socket ${socket.id} joined room ${roomName}`);

      return { success: true, room: roomName };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  @SubscribeMessage('unsubscribe:sensor')
  async handleUnsubscribeSensor(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { sensorId: string },
  ) {
    if (data?.sensorId) {
      const roomName = `sensor:${data.sensorId}`;
      await socket.leave(roomName);
      return { success: true, room: roomName };
    }
    return { success: false };
  }

  @SubscribeMessage('subscribe:dashboard')
  async handleSubscribeDashboard(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { dashboardId: string },
  ) {
    try {
      const userId = socket.data.user?.sub;
      if (!userId || !data?.dashboardId) {
        return { success: false, message: 'Invalid payload' };
      }

      const dashboard = await this.dashboardsService.getDashboardById(data.dashboardId, userId);
      // Join all sensor rooms included in this dashboard's widgets
      if (dashboard.widgets && dashboard.widgets.length > 0) {
        for (const widget of dashboard.widgets) {
          const roomName = `sensor:${widget.sensorId}`;
          await socket.join(roomName);
        }
      }

      return {
        success: true,
        dashboardId: data.dashboardId,
        sensorsSubscribed: dashboard.widgets.map((w) => w.sensorId),
      };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }
}
