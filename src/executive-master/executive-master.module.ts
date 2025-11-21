import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Executive } from '../entities/executive.entity';
import { ExecutiveMasterController } from './executive-master.controller';
import { ExecutiveMasterService } from './executive-master.service';

@Module({
  imports: [TypeOrmModule.forFeature([Executive])],
  controllers: [ExecutiveMasterController],
  providers: [ExecutiveMasterService],
})
export class ExecutiveMasterModule {}

