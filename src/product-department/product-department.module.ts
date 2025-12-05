import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ItemSectionConfig,
  Org,
  ProductDepartment,
  ProductItem,
  ProductItemOrg,
} from '../entities';
import { ProductDepartmentService } from './product-department.service';
import { ProductDepartmentController } from './product-department.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProductDepartment,
      ItemSectionConfig,
      ProductItem,
      ProductItemOrg,
      Org,
    ]),
  ],
  providers: [ProductDepartmentService],
  controllers: [ProductDepartmentController],
})
export class ProductDepartmentModule { }

