import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ContractMenuMst,
  ContractOptionGroupMst,
  CourseGroup,
} from '../entities';
import { MenuMasterController } from './menu-master.controller';
import { MenuMasterService } from './menu-master.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ContractMenuMst,
      ContractOptionGroupMst,
      CourseGroup,
    ]),
  ],
  controllers: [MenuMasterController],
  providers: [MenuMasterService],
})
export class MenuMasterModule {}

