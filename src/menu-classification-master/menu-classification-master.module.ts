import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContractOptionGroupMst } from '../entities';
import { MenuClassificationMasterController } from './menu-classification-master.controller';
import { MenuClassificationMasterService } from './menu-classification-master.service';

@Module({
  imports: [TypeOrmModule.forFeature([ContractOptionGroupMst])],
  controllers: [MenuClassificationMasterController],
  providers: [MenuClassificationMasterService],
})
export class MenuClassificationMasterModule {}

