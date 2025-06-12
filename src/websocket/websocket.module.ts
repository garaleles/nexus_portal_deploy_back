import { Module } from '@nestjs/common';
import { WebSocketService } from './websocket.gateway';

@Module({
  providers: [WebSocketService],
  exports: [WebSocketService],
})
export class WebSocketModule { } 