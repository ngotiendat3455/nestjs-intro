import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservationCourseSetting, ReservationCourseSettingOrg, Org } from '../entities';
import { ReservationExistingCustomerCourseController } from './reservation-existing-customer-course.controller';
import { ReservationExistingCustomerCourseService } from './reservation-existing-customer-course.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReservationCourseSetting,
      ReservationCourseSettingOrg,
      Org,
    ]),
  ],
  controllers: [ReservationExistingCustomerCourseController],
  providers: [ReservationExistingCustomerCourseService],
})
export class ReservationExistingCustomerCourseModule {}
