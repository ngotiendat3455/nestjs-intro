import { Module } from '@nestjs/common';
import { RoleMasterController } from './role-master.controller';
import { RoleMasterService } from './role-master.service';

@Module({
  controllers: [RoleMasterController],
  providers: [RoleMasterService],
})
export class RoleMasterModule {}

