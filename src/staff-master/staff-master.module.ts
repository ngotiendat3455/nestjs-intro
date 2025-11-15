import { Module } from '@nestjs/common';
import { StaffMasterController } from './staff-master.controller';
import { StaffMasterService } from './staff-master.service';

@Module({
  controllers: [StaffMasterController],
  providers: [StaffMasterService],
})
export class StaffMasterModule {}

