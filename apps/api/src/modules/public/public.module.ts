
import { Module } from '@nestjs/common';

import { MinioModule } from '../minio';
import { PublicAssetsController } from './public-assets.controller';

@Module({
  imports: [MinioModule],
  controllers: [PublicAssetsController],
})
export class PublicModule {}
