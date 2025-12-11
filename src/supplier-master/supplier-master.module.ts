import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupplierMasterController } from './supplier-master.controller';
import { SupplierMasterService } from './supplier-master.service';
import { Supplier, SupplierAddress, SupplierContact } from '../entities';

@Module({
  imports: [TypeOrmModule.forFeature([Supplier, SupplierContact, SupplierAddress])],
  controllers: [SupplierMasterController],
  providers: [SupplierMasterService],
})
export class SupplierMasterModule {}
