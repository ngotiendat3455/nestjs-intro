import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CashierStoreSetting } from '../entities';
import { CashierStoreSettingController } from './cashier-store-setting.controller';
import { CashierStoreSettingService } from './cashier-store-setting.service';

@Module({
  imports: [TypeOrmModule.forFeature([CashierStoreSetting])],
  controllers: [CashierStoreSettingController],
  providers: [CashierStoreSettingService],
})
export class CashierStoreSettingModule { }

