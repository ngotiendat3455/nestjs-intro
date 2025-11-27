import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Org,
  Role,
  Staff,
  RoleDetail,
  Customer,
  CustomerContact,
  CustomerAddress,
  CustomerContract,
  Executive,
  CustomerListDisplaySetting,
  CustomerNumberFormatSetting,
  CustomerSerialCounter,
  ContractCourse,
  CourseGroup,
  CourseCategory,
  ReservationStoreSetting,
  ReserveFrame,
  ReserveFrameNotPossibleTime,
  Media,
  MediaVersion,
  MediaVersionOrg,
} from './entities';
import { AuthModule } from './auth/auth.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OrgMasterModule } from './org-master/org-master.module';
import { RoleMasterModule } from './role-master/role-master.module';
import { StaffMasterModule } from './staff-master/staff-master.module';
import { CustomerModule } from './customer/customer.module';
import { UsersModule } from './users/users.module';
import { ExecutiveMasterModule } from './executive-master/executive-master.module';
import { CustomerNumberFormatModule } from './customer-number-format/customer-number-format.module';
import { CourseMasterModule } from './course-master/course-master.module';
import { CourseGroupMasterModule } from './course-group-master/course-group-master.module';
import { CourseCategoryMasterModule } from './course-category-master/course-category-master.module';
import { ReservationStoreSettingModule } from './reservation-store-setting/reservation-store-setting.module';
import { MediaMasterModule } from './media-master/media-master.module';
@Module({
  imports: [
    UsersModule,
    OrgMasterModule,
    ExecutiveMasterModule,
    CustomerNumberFormatModule,
    StaffMasterModule,
    AuthModule,
    CustomerModule,
    RoleMasterModule,
    CourseMasterModule,
    CourseGroupMasterModule,
    CourseCategoryMasterModule,
    ReservationStoreSettingModule,
    MediaMasterModule,
    TypeOrmModule.forRootAsync({
      useFactory: async () => ({
        type: 'postgres',
        host: 'localhost',
        port: 5432,
        username: 'postgres',
        password: '123456',
        database: 'nestjs-blog',
        synchronize: true,
        entities: [
          Org,
          Role,
          Staff,
          RoleDetail,
          Customer,
          CustomerContact,
          CustomerAddress,
          CustomerContract,
          Executive,
          CustomerNumberFormatSetting,
          CustomerSerialCounter,
          CustomerListDisplaySetting,
          ContractCourse,
          CourseGroup,
          CourseCategory,
          ReservationStoreSetting,
          ReserveFrame,
          ReserveFrameNotPossibleTime,
          Media,
          MediaVersion,
          MediaVersionOrg,
        ],
      }),
    })
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
