import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Org,
  PaymentMethod,
  PaymentMethodOrg,
} from '../entities';
import { PaymentMethodSettingController } from './payment-method-setting.controller';
import { PaymentMethodSettingService } from './payment-method-setting.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PaymentMethod,
      PaymentMethodOrg,
      Org,
    ]),
  ],
  controllers: [PaymentMethodSettingController],
  providers: [PaymentMethodSettingService],
})
export class PaymentMethodSettingModule { }

