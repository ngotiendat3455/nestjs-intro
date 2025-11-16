import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleMasterController } from './role-master.controller';
import { RoleMasterService } from './role-master.service';
import { Role, RoleDetail } from '../entities';

@Module({
  imports: [TypeOrmModule.forFeature([Role, RoleDetail])],
  controllers: [RoleMasterController],
  providers: [RoleMasterService],
})
export class RoleMasterModule {}
