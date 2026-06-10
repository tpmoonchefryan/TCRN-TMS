import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database';
import { HomepageModule } from '../homepage/homepage.module';
import { MinioModule } from '../minio';
import { PublicAssetsController } from './public-assets.controller';
import { PublicDomainController } from './public-domain.controller';

@Module({
  imports: [DatabaseModule, MinioModule, HomepageModule],
  controllers: [PublicAssetsController, PublicDomainController],
})
export class PublicModule {}
