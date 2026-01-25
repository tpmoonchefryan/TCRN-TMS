// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { PiiClientService } from './services/pii-client.service';
import { PiiJwtService } from './services/pii-jwt.service';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('PII_JWT_SECRET') || 'dev-secret',
      }),
    }),
  ],
  providers: [PiiJwtService, PiiClientService],
  exports: [PiiJwtService, PiiClientService],
})
export class PiiModule {}
