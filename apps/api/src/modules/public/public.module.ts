
import { Module } from '@nestjs/common';

import { MinioModule } from '../minio';
import { PublicAssetsController } from './public-assets.controller';
import { PublicDomainController } from './public-domain.controller';

@Module({
  imports: [MinioModule],
  controllers: [PublicAssetsController, PublicDomainController],
})
export class PublicModule {}
