import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Reservation,
  Org,
  Customer,
  ContractCourse,
  CourseGroup,
  ReserveFrame,
  ReservationStoreSetting,
  Media,
  Staff,
} from '../entities';
import { CustomerNumberFormatModule } from '../customer-number-format/customer-number-format.module';
import { ReservationController } from './reservation.controller';
import { ReservationService } from './reservation.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Reservation,
      Org,
      Customer,
      ContractCourse,
      CourseGroup,
      ReserveFrame,
      ReservationStoreSetting,
      Media,
      Staff,
    ]),
    CustomerNumberFormatModule,
  ],
  controllers: [ReservationController],
  providers: [ReservationService],
})
export class ReservationModule {}
