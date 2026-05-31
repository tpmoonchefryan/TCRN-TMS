import { Module } from '@nestjs/common';

import { ApiRegistryModule } from '../api-registry';
import { ApiGatewayReadinessController } from './api-gateway-readiness.controller';
import { ApiGatewayReadinessService } from './api-gateway-readiness.service';

@Module({
  imports: [ApiRegistryModule],
  controllers: [ApiGatewayReadinessController],
  providers: [ApiGatewayReadinessService],
  exports: [ApiGatewayReadinessService],
})
export class ApiGatewayReadinessModule {}
