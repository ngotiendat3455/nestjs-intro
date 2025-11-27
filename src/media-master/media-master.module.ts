import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Media, MediaVersion, MediaVersionOrg, Org } from '../entities';
import { MediaMasterController } from './media-master.controller';
import { MediaMasterService } from './media-master.service';

@Module({
  imports: [TypeOrmModule.forFeature([Media, MediaVersion, MediaVersionOrg, Org])],
  controllers: [MediaMasterController],
  providers: [MediaMasterService],
})
export class MediaMasterModule {}

