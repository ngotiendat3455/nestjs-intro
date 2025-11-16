import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StaffMasterController } from './staff-master.controller';
import { StaffMasterService } from './staff-master.service';
import { Staff } from '../entities/staff.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Staff])],
  controllers: [StaffMasterController],
  providers: [StaffMasterService],
})
export class StaffMasterModule {}
