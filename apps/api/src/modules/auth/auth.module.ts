// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { forwardRef,Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { AuthRateLimiterGuard } from '../../common/guards/auth-rate-limiter.guard';
import { EmailModule } from '../email';
import { LogModule } from '../log';
import { MinioModule } from '../minio/minio.module';
import { AuthController, UserController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';
import { TokenService } from './token.service';
import { TotpService } from './totp.service';

@Module({
  imports: [
    MinioModule,
    LogModule,
    forwardRef(() => EmailModule),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const expiresIn = configService.get<string>('JWT_ACCESS_TTL', '15m');
        return {
          secret: configService.get<string>('JWT_SECRET'),
          signOptions: {
            expiresIn: expiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
          },
        };
      },
    }),
  ],
  controllers: [AuthController, UserController],
  providers: [
    AuthService,
    PasswordService,
    TotpService,
    TokenService,
    SessionService,
    AuthRateLimiterGuard,
  ],
  exports: [AuthService, PasswordService, TotpService, TokenService, AuthRateLimiterGuard],
})
export class AuthModule {}

