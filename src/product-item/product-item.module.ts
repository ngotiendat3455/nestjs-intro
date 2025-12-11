import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Org,
  ProductDepartment,
  ProductItem,
  ProductItemOrg,
  Supplier,
} from '../entities';
import { ProductItemService } from './product-item.service';
import { ProductItemController } from './product-item.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProductItem,
      ProductItemOrg,
      ProductDepartment,
      Org,
      Supplier,
    ]),
  ],
  providers: [ProductItemService],
  controllers: [ProductItemController],
})
export class ProductItemModule { }
