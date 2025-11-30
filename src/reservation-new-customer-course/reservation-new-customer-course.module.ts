import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservationCourseSetting, ReservationCourseSettingOrg, Org } from '../entities';
import { ReservationNewCustomerCourseController } from './reservation-new-customer-course.controller';
import { ReservationNewCustomerCourseService } from './reservation-new-customer-course.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReservationCourseSetting,
      ReservationCourseSettingOrg,
      Org,
    ]),
  ],
  controllers: [ReservationNewCustomerCourseController],
  providers: [ReservationNewCustomerCourseService],
})
export class ReservationNewCustomerCourseModule {}
