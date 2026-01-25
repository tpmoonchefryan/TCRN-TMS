// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Module, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { EmailModule } from '../email';
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
  ],
  exports: [AuthService, PasswordService, TotpService, TokenService],
})
export class AuthModule {}
