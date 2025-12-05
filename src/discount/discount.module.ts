import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Discount,
  DiscountOrg,
  Org,
} from '../entities';
import { DiscountService } from './discount.service';
import { DiscountController } from './discount.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Discount,
      DiscountOrg,
      Org,
    ]),
  ],
  providers: [DiscountService],
  controllers: [DiscountController],
})
export class DiscountModule { }

