import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaxRate } from '../entities';
import { TaxRateSettingController } from './tax-rate-setting.controller';
import { TaxRateSettingService } from './tax-rate-setting.service';

@Module({
  imports: [TypeOrmModule.forFeature([TaxRate])],
  controllers: [TaxRateSettingController],
  providers: [TaxRateSettingService],
})
export class TaxRateSettingModule {}

