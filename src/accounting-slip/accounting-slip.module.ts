import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AccountingSlip,
  AccountingDetail,
  AccountingDetailContract,
  AccountingDetailOption,
  AccountingDetailItem,
  AccountingPayment,
  CustomerContract,
} from '../entities';
import { AccountingSlipService } from './accounting-slip.service';
import { AccountingSlipController } from './accounting-slip.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AccountingSlip,
      AccountingDetail,
      AccountingDetailContract,
      AccountingDetailOption,
      AccountingDetailItem,
      AccountingPayment,
      CustomerContract,
    ]),
  ],
  controllers: [AccountingSlipController],
  providers: [AccountingSlipService],
})
export class AccountingSlipModule { }
