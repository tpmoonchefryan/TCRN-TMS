// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
import * as tls from 'tls';

/**
 * Extended request with TLS socket and client certificate
 */
interface MtlsRequest extends Request {
  socket: tls.TLSSocket & {
    getPeerCertificate?: (detailed?: boolean) => tls.PeerCertificate | tls.DetailedPeerCertificate;
    authorized?: boolean;
  };
  clientCert?: tls.PeerCertificate;
}

/**
 * mTLS Middleware
 * Validates client certificates for mutual TLS authentication
 * PRD §4.4: PII 数据分离架构 - mTLS 双向认证
 */
@Injectable()
export class MtlsMiddleware implements NestMiddleware {
  private readonly logger = new Logger(MtlsMiddleware.name);
  private readonly mtlsEnabled: boolean;
  private readonly allowedClientCNs: string[];

  constructor(private readonly configService: ConfigService) {
    this.mtlsEnabled = this.configService.get<string>('TLS_ENABLED') === 'true';
    
    // Allowed client certificate Common Names
    const configuredCNs = this.configService.get<string>('MTLS_ALLOWED_CNS');
    this.allowedClientCNs = configuredCNs 
      ? configuredCNs.split(',').map(cn => cn.trim())
      : ['tcrn-api', 'tcrn-worker']; // Default allowed clients

    if (this.mtlsEnabled) {
      this.logger.log('mTLS middleware enabled');
      this.logger.log(`Allowed client CNs: ${this.allowedClientCNs.join(', ')}`);
    }
  }

  use(req: MtlsRequest, res: Response, next: NextFunction): void {
    // Skip mTLS validation if not enabled
    if (!this.mtlsEnabled) {
      return next();
    }

    // Skip for health check endpoint
    if (req.path === '/health' || req.path === '/api/health') {
      return next();
    }

    try {
      // Check if connection is TLS
      if (!req.socket || typeof req.socket.getPeerCertificate !== 'function') {
        this.logger.warn('Non-TLS connection attempted');
        throw new UnauthorizedException('TLS connection required');
      }

      // Check if client certificate was verified by TLS layer
      if (!req.socket.authorized) {
        const authError = (req.socket as any).authorizationError;
        this.logger.warn(`Client certificate not authorized: ${authError}`);
        throw new UnauthorizedException('Client certificate verification failed');
      }

      // Get client certificate
      const cert = req.socket.getPeerCertificate();
      
      if (!cert || Object.keys(cert).length === 0) {
        this.logger.warn('No client certificate provided');
        throw new UnauthorizedException('Client certificate required');
      }

      // Extract Common Name from certificate subject
      const clientCN = this.extractCommonName(cert);
      
      if (!clientCN) {
        this.logger.warn('Client certificate has no Common Name');
        throw new UnauthorizedException('Invalid client certificate');
      }

      // Validate client CN against allowed list
      if (!this.allowedClientCNs.includes(clientCN)) {
        this.logger.warn(`Unauthorized client CN: ${clientCN}`);
        throw new UnauthorizedException('Unauthorized client');
      }

      // Attach client certificate to request for downstream use
      req.clientCert = cert as tls.PeerCertificate;

      this.logger.debug(`mTLS authenticated client: ${clientCN}`);
      next();
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`mTLS validation error: ${error}`);
      throw new UnauthorizedException('mTLS authentication failed');
    }
  }

  /**
   * Extract Common Name from certificate subject
   */
  private extractCommonName(cert: tls.PeerCertificate | tls.DetailedPeerCertificate): string | null {
    if (!cert.subject) {
      return null;
    }

    // cert.subject is an object with CN property
    if (typeof cert.subject === 'object' && 'CN' in cert.subject) {
      return cert.subject.CN as string;
    }

    return null;
  }
}

/**
 * Export the middleware function for use with app.use()
 */
export function createMtlsMiddleware(configService: ConfigService): (req: Request, res: Response, next: NextFunction) => void {
  const middleware = new MtlsMiddleware(configService);
  return middleware.use.bind(middleware);
}
