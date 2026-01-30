// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { MtlsMiddleware } from './middlewares/mtls.middleware';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('PII_JWT_SECRET'),
        signOptions: {
          expiresIn: '5m',
        },
      }),
    }),
  ],
  providers: [JwtStrategy, JwtAuthGuard, MtlsMiddleware],
  exports: [JwtAuthGuard, JwtModule, MtlsMiddleware],
})
export class AuthModule {}
