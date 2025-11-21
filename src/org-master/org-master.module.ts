import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Org } from '../entities';
import { OrgMasterController } from './org-master.controller';
import { OrgMasterService } from './org-master.service';

@Module({
  imports: [TypeOrmModule.forFeature([Org])],
  controllers: [OrgMasterController],
  providers: [OrgMasterService],
})
export class OrgMasterModule {}
