import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ProductItemService } from './product-item.service';

@Controller('productItems')
export class ProductItemController {
  constructor(
    private readonly service: ProductItemService,
  ) { }

  @Get()
  list(
    @Query('orgID') orgID?: string,
    @Query('isApplyUnderOrg') isApplyUnderOrg?: string,
    @Query('itemSectionID') itemSectionID?: string,
    @Query('targetDate') targetDate?: string,
    @Query('featureCode') featureCode?: string,
    @Query('keyWord') keyWord?: string,
  ) {
    return this.service.list({
      orgID,
      isApplyUnderOrg,
      itemSectionID,
      targetDate,
      featureCode,
      keyWord,
    });
  }

  @Get(':itemID')
  detail(
    @Param('itemID') itemID: string,
    @Query('applyStartDate') applyStartDate?: string,
  ) {
    return this.service.getDetail(itemID, applyStartDate);
  }

  @Post()
  create(
    @Body() body: any,
  ) {
    return this.service.create(body);
  }

  @Put(':itemID')
  update(
    @Param('itemID') itemID: string,
    @Body() body: any,
  ) {
    return this.service.update(itemID, body);
  }

  @Delete()
  deleteMany(
    @Query('itemID') ids: string | string[],
  ) {
    const list = Array.isArray(ids)
      ? ids
      : ids
        ? [ids]
        : [];
    return this.service.deleteMany(list);
  }
}
