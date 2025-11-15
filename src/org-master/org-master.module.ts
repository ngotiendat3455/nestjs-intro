import { Module } from '@nestjs/common';
import { OrgMasterController } from './org-master.controller';
import { OrgMasterService } from './org-master.service';

@Module({
  controllers: [OrgMasterController],
  providers: [OrgMasterService],
})
export class OrgMasterModule {}

