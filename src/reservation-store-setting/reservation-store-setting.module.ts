import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservationStoreSetting } from '../entities';
import { ReservationStoreSettingController } from './reservation-store-setting.controller';
import { ReservationStoreSettingService } from './reservation-store-setting.service';

@Module({
  imports: [TypeOrmModule.forFeature([ReservationStoreSetting])],
  controllers: [ReservationStoreSettingController],
  providers: [ReservationStoreSettingService],
})
export class ReservationStoreSettingModule {}

