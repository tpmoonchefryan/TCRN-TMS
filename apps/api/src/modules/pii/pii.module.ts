// SPDX-License-Identifier: Apache-2.0
import { Global, Module } from '@nestjs/common';

import { PiiClientService } from './services/pii-client.service';

@Global()
@Module({
  providers: [PiiClientService],
  exports: [PiiClientService],
})
export class PiiModule {}
