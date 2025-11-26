import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseMasterController } from './course-master.controller';
import { CourseMasterService } from './course-master.service';
import { ContractCourse } from '../entities';

@Module({
  imports: [TypeOrmModule.forFeature([ContractCourse])],
  controllers: [CourseMasterController],
  providers: [CourseMasterService],
})
export class CourseMasterModule {}

