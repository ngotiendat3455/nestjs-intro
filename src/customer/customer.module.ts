import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerController } from './customer.controller';
import { CustomerService } from './customer.service';
import {
  Customer,
  CustomerAddress,
  CustomerContact,
  CustomerContract,
  CustomerReverberation,
} from '../entities';
import { CustomerNumberFormatModule } from '../customer-number-format/customer-number-format.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Customer,
      CustomerContact,
      CustomerAddress,
      CustomerContract,
      CustomerReverberation,
    ]),
    CustomerNumberFormatModule,
  ],
  controllers: [CustomerController],
  providers: [CustomerService],
})
export class CustomerModule {}
