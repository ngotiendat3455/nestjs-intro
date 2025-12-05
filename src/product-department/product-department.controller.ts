import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ProductDepartmentService } from './product-department.service';

@Controller('productDepartments')
export class ProductDepartmentController {
  constructor(
    private readonly service: ProductDepartmentService,
  ) { }

  @Get()
  list(
    @Query('keyWord') keyWord?: string,
    @Query('effective') effective?: string,
  ) {
    return this.service.list({ keyWord, effective });
  }

  @Get(':itemSectionId')
  detail(
    @Param('itemSectionId') itemSectionId: string,
  ) {
    return this.service.detail(itemSectionId);
  }

  @Post()
  create(
    @Body() body: any,
  ) {
    return this.service.create(body);
  }

  @Put(':itemSectionId')
  update(
    @Param('itemSectionId') itemSectionId: string,
    @Body() body: any,
  ) {
    return this.service.update(itemSectionId, body);
  }
}

