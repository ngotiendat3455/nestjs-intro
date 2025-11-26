import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseGroup } from '../entities';
import { CourseGroupMasterController } from './course-group-master.controller';
import { CourseGroupMasterService } from './course-group-master.service';

@Module({
  imports: [TypeOrmModule.forFeature([CourseGroup])],
  controllers: [CourseGroupMasterController],
  providers: [CourseGroupMasterService],
})
export class CourseGroupMasterModule {}

