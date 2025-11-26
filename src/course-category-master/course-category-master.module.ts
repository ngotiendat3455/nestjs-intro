import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseCategory } from '../entities';
import { CourseCategoryMasterController } from './course-category-master.controller';
import { CourseCategoryMasterService } from './course-category-master.service';

@Module({
  imports: [TypeOrmModule.forFeature([CourseCategory])],
  controllers: [CourseCategoryMasterController],
  providers: [CourseCategoryMasterService],
})
export class CourseCategoryMasterModule {}

