import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Org,
  ProductDepartment,
  ProductItem,
  ProductItemOrg,
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
    ]),
  ],
  providers: [ProductItemService],
  controllers: [ProductItemController],
})
export class ProductItemModule { }

