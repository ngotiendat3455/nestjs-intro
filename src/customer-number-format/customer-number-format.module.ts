import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerListDisplaySetting, CustomerNumberFormatSetting, CustomerSerialCounter } from '../entities/customer-number-format.entity';
import { Org } from '../entities';
import { CustomerNumberFormatService } from './customer-number-format.service';
import { CustomerNumberFormatController } from './customer-number-format.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CustomerNumberFormatSetting, CustomerSerialCounter, CustomerListDisplaySetting, Org])],
  controllers: [CustomerNumberFormatController],
  providers: [CustomerNumberFormatService],
  exports: [CustomerNumberFormatService],
})
export class CustomerNumberFormatModule {}
