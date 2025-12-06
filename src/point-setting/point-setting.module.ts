import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Point } from '../entities';
import { PointSettingController } from './point-setting.controller';
import { PointSettingService } from './point-setting.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Point]),
  ],
  controllers: [PointSettingController],
  providers: [PointSettingService],
})
export class PointSettingModule { }

